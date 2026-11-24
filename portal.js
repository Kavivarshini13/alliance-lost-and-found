/**
 * ALLIANCE UNIVERSITY LOST & FOUND PORTAL
 * Core Client Logic, Sockets, Auth, Navigation, Matching Engine, Modals, Admin Verification, and AI Chatbot
 */

const api = async (url, options = {}) => {
  const token = localStorage.getItem('portal_token');
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
};

const performLogout = async () => {
  localStorage.removeItem('portal_token');
  localStorage.removeItem('portal_user');
  sessionStorage.clear();
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch (e) {}
  location.replace('login.html');
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#logoutButton, #logoutBtn').forEach(btn => {
      btn.onclick = performLogout;
    });
  });
}

const STUDENT_EMAIL_DOMAIN = 'ced.alliance.edu.in';
const isValidEmail = email => /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(String(email || '').trim());
const isStudentEmail = email => isValidEmail(email) && String(email).trim().toLowerCase().endsWith(`@${STUDENT_EMAIL_DOMAIN}`);

const publicPages = new Set([
  '/login.html',
  '/register.html',
  '/admin.html'
]);
const currentPath = location.pathname.toLowerCase();
const isPublicPage = publicPages.has(currentPath) || 
                     currentPath.endsWith('login.html') || 
                     currentPath.endsWith('register.html') || 
                     currentPath.endsWith('admin.html');

// Student Login Gate: Portal pages (index, search, lost, found, matches, map, history, contact, item) strictly require authentication
if (!isPublicPage) {
  api('/api/auth/me').then(({ user }) => {
    if (!user) {
      location.replace('login.html');
      return;
    }
    addStudentNavigation(user);
    updateHeaderUserStatus(user);
    autoFillContactDetails(user);
  }).catch(() => {
    location.replace('login.html');
  });
} else if (currentPath.endsWith('login.html') || currentPath.endsWith('register.html')) {
  // If already authenticated as student, redirect away from login/register to index.html
  api('/api/auth/me').then(({ user }) => {
    if (user && user.role !== 'admin') {
      location.replace('index.html');
    }
  }).catch(() => {
    // Guest on login screen - stay on login
  });
}

window.addEventListener('pageshow', event => {
  if (event.persisted && !isPublicPage) location.reload();
});

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const statusText = status => String(status || 'pending').replace(/^./, c => c.toUpperCase());
const claimStatusText = status => ({ pending: 'Pending Verification', approved: 'Approved', rejected: 'Rejected' }[status] || statusText(status));
const recoveryText = status => status ? statusText(status) : 'Open';
const messageBox = (el, text, error = false) => {
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
  el.className = error ? 'error-message' : 'success-message';
};

function autoFillContactDetails(user) {
  if (!user) return;
  const emailInput = document.getElementById('email');
  const nameInput = document.getElementById('name');
  if (emailInput && !emailInput.value) emailInput.value = user.email || '';
  if (nameInput && !nameInput.value) nameInput.value = user.name || '';
}

function updateHeaderUserStatus(user) {
  const loginArea = document.querySelector('.login-buttons') || document.querySelector('.header-actions') || document.querySelector('.login-area');
  if (!loginArea) return;

  if (user) {
    loginArea.innerHTML = `
      <span style="font-size:13px;font-weight:600;color:var(--primary);display:flex;align-items:center;gap:6px;">
        👤 ${esc(user.name.split(' ')[0])}
      </span>
      <a href="history.html" class="student-login">My Reports</a>
      <button class="admin-login" id="logoutButton" type="button">Logout</button>
    `;
    document.getElementById('logoutButton')?.addEventListener('click', performLogout);
  } else {
    loginArea.innerHTML = `
      <a href="login.html" class="student-login">Student Login</a>
      <a href="admin.html" class="admin-login">Admin Login</a>
    `;
  }
}

function addStudentNavigation(user) {
  const nav = document.querySelector('nav') || document.querySelector('.navbar');
  if (!nav) return;

  const links = [
    ['index.html', 'Home'],
    ['search.html', 'Search Items'],
    ['lost.html', 'Report Lost'],
    ['found.html', 'Report Found'],
    ['matches.html', 'Matches Found'],
    ['history.html', 'My Reports'],
    ['map.html', 'Campus Map'],
    ['contact.html', 'Contact']
  ];

  const currentPage = location.pathname.split('/').pop().toLowerCase() || 'index.html';

  nav.replaceChildren(...links.map(([href, label]) => {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
    if (href === 'matches.html') {
      link.innerHTML = 'Matches Found <span id="notificationBadge" style="display:none;"></span>';
    }
    return link;
  }));

  setupNotificationUI();
}

function setNotificationBadge(count) {
  const badge = document.getElementById('notificationBadge');
  if (!badge) return;
  const unread = Math.max(0, Number(count) || 0);
  badge.dataset.count = String(unread);
  badge.textContent = unread > 99 ? '99+' : String(unread);
  badge.style.display = unread ? 'inline-block' : 'none';
  badge.parentElement?.setAttribute('aria-label', `Notifications, ${unread} unread`);
}

async function refreshNotificationBadge() {
  try {
    const { notifications, unreadCount } = await api('/api/notifications');
    setNotificationBadge(Number.isFinite(unreadCount) ? unreadCount : (notifications || []).filter(notification => !notification.readAt).length);
  } catch { /* graceful fallback */ }
}

async function markPortalNotificationRead(id) {
  try {
    const { notification } = await api(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
    const badge = document.getElementById('notificationBadge');
    if (badge) setNotificationBadge(Math.max(0, Number(badge.dataset.count) - 1));
    window.dispatchEvent(new CustomEvent('portal:notification-read', { detail: notification }));
    return notification;
  } catch { return null; }
}

function showNotificationToast(notification) {
  document.getElementById('portalNotificationToast')?.remove();
  const toast = document.createElement('aside');
  toast.id = 'portalNotificationToast';
  toast.setAttribute('role', 'status');
  Object.assign(toast.style, {
    position: 'fixed',
    right: '24px',
    top: '24px',
    zIndex: '2000',
    width: 'min(380px, calc(100vw - 32px))',
    padding: '16px 20px',
    borderRadius: '12px',
    background: '#ffffff',
    color: '#123b68',
    boxShadow: '0 12px 36px rgba(18,59,104,0.22)',
    border: '1.5px solid #0284c7',
    animation: 'fadeIn 0.25s ease-out'
  });

  const message = document.createElement('p');
  message.style.margin = '0';
  message.style.fontSize = '14px';
  message.style.fontWeight = '600';
  message.style.lineHeight = '1.45';
  message.textContent = notification.text || 'You have a new campus notification.';

  const link = document.createElement('a');
  link.href = notification.link || 'matches.html';
  link.textContent = notification.type === 'possible_match' ? 'View Matching Report →' : 'View Notifications →';
  link.style.cssText = 'display:inline-block;margin-top:10px;color:#2563eb;font-weight:700;font-size:13px;text-decoration:none;';

  link.addEventListener('click', async event => {
    if (notification._id && !notification.readAt) {
      event.preventDefault();
      await markPortalNotificationRead(notification._id);
      location.assign(link.href);
    }
  });

  toast.append(message, link);
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 10000);
}

function setupNotificationUI() {
  if (window.portalNotificationsStarted) return;
  window.portalNotificationsStarted = true;
  refreshNotificationBadge();
  window.addEventListener('portal:notification-read', refreshNotificationBadge);

  const script = document.createElement('script');
  script.src = '/socket.io/socket.io.js';
  script.async = true;
  script.onload = () => {
    if (!window.io) return;
    const socket = window.io({ withCredentials: true });
    window.portalSocket = socket;
    socket.on('connect', refreshNotificationBadge);
    socket.on('connect', () => window.dispatchEvent(new CustomEvent('portal:socket-ready', { detail: socket })));
    window.dispatchEvent(new CustomEvent('portal:socket-ready', { detail: socket }));
    socket.on('notification', notification => {
      const badge = document.getElementById('notificationBadge');
      const current = badge && badge.style.display !== 'none' ? Number(badge.dataset.count) || 0 : 0;
      setNotificationBadge(current + 1);
      showNotificationToast(notification);
      window.dispatchEvent(new CustomEvent('portal:notification', { detail: notification }));
    });
  };
  script.onerror = () => refreshNotificationBadge();
  document.head.append(script);
}

// ---------------- INTERACTIVE MODALS ----------------
function openItemModal(item) {
  if (!item) return;
  document.getElementById('portalItemModal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'portalItemModal';
  overlay.className = 'portal-modal-overlay';

  overlay.innerHTML = `
    <div class="portal-modal-card" role="dialog" aria-modal="true">
      <div class="portal-modal-header">
        <h3 style="display:flex;align-items:center;gap:8px;"><span>📦</span> ${esc(item.itemName)}</h3>
        <button type="button" class="portal-modal-close" id="modalCloseBtn" aria-label="Close modal">✕</button>
      </div>
      <div class="portal-modal-body">
        <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
          <span class="status ${(item.type || '').toLowerCase()}">${statusText(item.type)}</span>
          <span class="badge ${item.verification === 'verified-real' ? 'verified-real' : item.verification === 'flagged-fake' ? 'flagged-fake' : 'pending'}">${item.verification === 'verified-real' ? '✓ Verified Real' : item.verification === 'flagged-fake' ? '⚠ Flagged Fake' : 'Pending Review'}</span>
          <span class="status ${item.status || 'pending'}">${statusText(item.status)} / ${recoveryText(item.recoveryStatus)}</span>
        </div>

        ${item.image ? `<img src="${item.image}" alt="${esc(item.itemName)}" style="width:100%;max-height:240px;object-fit:cover;border-radius:8px;margin-bottom:14px;border:1px solid #cbd5e1;">` : ''}

        <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;font-size:13.5px;line-height:1.6;margin-bottom:14px;">
          <strong style="color:var(--text-muted);">Category:</strong>
          <span>${esc(item.category || '-')}</span>

          <strong style="color:var(--text-muted);">Location:</strong>
          <span>📍 ${esc(item.location || '-')}</span>

          <strong style="color:var(--text-muted);">Date:</strong>
          <span>${item.date ? new Date(item.date).toLocaleDateString() : '-'}</span>

          <strong style="color:var(--text-muted);">Reported By:</strong>
          <span>${esc(item.reporterName || item.contactName || 'Student Peer')}</span>

          ${item.handover ? `
            <strong style="color:var(--text-muted);">Handover At:</strong>
            <span>🏢 ${esc(item.handover)}</span>
          ` : ''}

          <strong style="color:var(--text-muted);">Description:</strong>
          <span>${esc(item.description || '-')}</span>
        </div>
      </div>
      <div class="portal-modal-footer">
        <button type="button" class="btn-secondary" id="modalCloseBtn2">Close</button>
        <button type="button" class="btn-primary" id="modalMsgBtn">Message Reporter</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#modalCloseBtn')?.addEventListener('click', close);
  overlay.querySelector('#modalCloseBtn2')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#modalMsgBtn')?.addEventListener('click', async () => {
    close();
    try {
      const { conversation } = await api('/api/conversations', { method: 'POST', body: JSON.stringify({ itemId: item._id }) });
      location.assign(`history.html?conversation=${conversation._id}`);
    } catch {
      openChatModal(item);
    }
  });
}
window.openItemModal = openItemModal;

function openChatModal(item) {
  if (!item) return;
  document.getElementById('portalChatModal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'portalChatModal';
  overlay.className = 'portal-modal-overlay';

  overlay.innerHTML = `
    <div class="portal-modal-card" style="width:min(520px, 94vw);" role="dialog" aria-modal="true">
      <div class="portal-modal-header">
        <h3 style="display:flex;align-items:center;gap:8px;"><span>💬</span> Message About: ${esc(item.itemName)}</h3>
        <button type="button" class="portal-modal-close" id="chatModalClose">✕</button>
      </div>
      <div class="portal-modal-body" style="padding:16px;">
        <div style="background:#f8fafc;padding:10px 14px;border-radius:8px;margin-bottom:12px;font-size:12.5px;color:var(--text-muted);">
          Connecting with the reporter for <strong>${esc(item.itemName)}</strong> (📍 ${esc(item.location)}). Please arrange safe verification at the Student Affairs Office or Security Desk.
        </div>
        <div id="quickChatHistory" style="min-height:120px;max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;background:white;margin-bottom:12px;">
          <div class="chat-bubble" style="font-size:13px;">Hi, I am contacting you regarding your report for "${esc(item.itemName)}".</div>
        </div>
        <form id="quickChatForm" style="display:flex;gap:8px;">
          <input type="text" id="quickChatInput" placeholder="Type a message to coordinate safe return..." required style="flex:1;height:40px;padding:0 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;">
          <button type="submit" class="submit-btn" style="height:40px;padding:0 18px;font-size:13px;">Send</button>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#chatModalClose')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  const form = overlay.querySelector('#quickChatForm');
  const input = overlay.querySelector('#quickChatInput');
  const hist = overlay.querySelector('#quickChatHistory');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;
    input.value = '';

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble sent';
    bubble.style.fontSize = '13px';
    bubble.textContent = txt;
    hist.appendChild(bubble);
    hist.scrollTop = hist.scrollHeight;

    try {
      const { conversation } = await api('/api/conversations', { method: 'POST', body: JSON.stringify({ itemId: item._id }) });
      await api(`/api/conversations/${conversation._id}/messages`, { method: 'POST', body: JSON.stringify({ body: txt }) });
    } catch {
      // Handled gracefully in memory
    }
  });
}
window.openChatModal = openChatModal;

// ---------------- REGISTRATION & LOGIN ----------------
const register = async () => {
  const nameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirmPassword');
  const errorBox = document.getElementById('emailError');
  const passError = document.getElementById('passwordError');
  const okBox = document.getElementById('successMessage');

  if (!nameInput || !emailInput || !passwordInput) return;

  const name = nameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (errorBox) errorBox.classList.remove('show');
  if (passError) passError.classList.remove('show');

  if (!isValidEmail(email)) {
    if (errorBox) { errorBox.textContent = 'Enter a valid email address.'; errorBox.classList.add('show'); }
    return;
  }
  if (!isStudentEmail(email)) {
    if (errorBox) { errorBox.textContent = 'Please use your Alliance University student email (@ced.alliance.edu.in).'; errorBox.classList.add('show'); }
    return;
  }
  if (password.length < 8) {
    if (passError) { passError.textContent = 'Password must be at least 8 characters.'; passError.classList.add('show'); }
    return;
  }
  if (password !== confirmInput?.value) {
    if (passError) { passError.textContent = 'Passwords do not match.'; passError.classList.add('show'); }
    return;
  }

  try {
    const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    if (data.token) localStorage.setItem('portal_token', data.token);
    if (data.user) localStorage.setItem('portal_user', JSON.stringify(data.user));
    messageBox(okBox, 'Account created successfully! Redirecting to login...');
    setTimeout(() => location.replace('login.html'), 700);
  } catch (e) {
    if (errorBox) {
      errorBox.textContent = e.message || 'Email already registered, please log in';
      errorBox.classList.add('show');
    } else {
      alert(e.message);
    }
  }
};
if (document.getElementById('fullName')) window.registerUser = register;

window.togglePassword = inputId => {
  const input = document.getElementById(inputId);
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
};

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const box = document.getElementById('errorMessage');
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    if (!isValidEmail(email)) return messageBox(box, 'Enter a valid email address.', true);
    if (!isStudentEmail(email)) return messageBox(box, 'Please use your Alliance student email (@ced.alliance.edu.in).', true);

    try {
      const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (data.token) localStorage.setItem('portal_token', data.token);
      if (data.user) localStorage.setItem('portal_user', JSON.stringify(data.user));
      messageBox(box, 'Sign in successful! Redirecting...', false);
      location.replace('index.html');
    } catch (err) {
      messageBox(box, err.message, true);
    }
  });
}

// ---------------- IMAGE UPLOAD & REPORT SUBMISSION ----------------
const MAX_REPORT_IMAGE_SIZE = 5 * 1024 * 1024;
const REPORT_IMAGE_TYPES = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp']
]);

function reportImageError(file) {
  if (!file) return '';
  const ext = file.name.split('.').pop().toLowerCase();
  const expected = REPORT_IMAGE_TYPES.get(ext);
  if (!expected) return 'Please choose a JPG, PNG, or WEBP image file.';
  if (file.size > MAX_REPORT_IMAGE_SIZE) return 'The image file exceeds the 5 MB limit.';
  return '';
}

function configureImageUpload(form) {
  const input = form.querySelector('#image, #itemImage');
  const preview = form.querySelector('#imagePreview');
  const filename = form.querySelector('#imageFilename');
  const image = form.querySelector('#imagePreviewImg');
  const error = form.querySelector('#imageError');
  if (!input || !preview || !image) return;

  let previewUrl = '';
  const clearPreview = () => {
    preview.hidden = true;
    preview.style.display = 'none';
    if (filename) filename.textContent = '';
    image.removeAttribute('src');
    image.style.display = 'none';
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  };

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    const err = reportImageError(file);
    if (error) { error.textContent = err; error.hidden = !err; }
    clearPreview();
    if (!file || err) return;
    if (filename) filename.textContent = file.name;
    previewUrl = URL.createObjectURL(file);
    image.src = previewUrl;
    image.style.display = 'block';
    preview.hidden = false;
    preview.style.display = 'block';
  });

  form.addEventListener('reset', () => setTimeout(() => { clearPreview(); if (error) error.hidden = true; }, 0));
}

async function fileData(file) {
  if (!file) return '';
  const error = reportImageError(file);
  if (error) throw new Error(error);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const mime = REPORT_IMAGE_TYPES.get(file.name.split('.').pop().toLowerCase()) || 'image/jpeg';
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, `data:${mime};base64,`));
    reader.onerror = () => reject(new Error('Image could not be read.'));
    reader.readAsDataURL(file);
  });
}

function configureCardReport(form) {
  const category = form.querySelector('#category');
  const group = form.querySelector('#cardVerificationGroup');
  const image = form.querySelector('#image, #itemImage');
  if (!category || !group) return;

  const update = () => {
    const isCard = ['College ID Card', 'University Access Card'].includes(category.value);
    group.hidden = !isCard;
    if (image) {
      image.disabled = isCard;
      if (isCard && image.value) { image.value = ''; image.dispatchEvent(new Event('change')); }
    }
  };

  category.addEventListener('change', update);
  form.addEventListener('reset', () => setTimeout(update, 0));
  update();
}

async function submitReport(form, reportType) {
  reportType = form.dataset.reportType || reportType;
  const msgBox = document.getElementById(reportType === 'lost' ? 'successMessage' : 'message');
  const get = id => form.querySelector(`#${id}`)?.value?.trim() || '';

  try {
    const imageInput = form.querySelector(reportType === 'lost' ? '#itemImage' : '#image');
    const file = imageInput?.files?.[0];
    const imgErr = reportImageError(file);
    if (imgErr) throw new Error(imgErr);

    const body = {
      type: reportType,
      itemName: get('itemName'),
      category: get('category'),
      date: get(reportType === 'lost' ? 'dateLost' : 'date'),
      location: get(reportType === 'lost' ? 'locationLost' : 'location'),
      description: get('description'),
      privateVerification: get('privateVerification'),
      contactName: get('contactName'),
      contact: get('contact'),
      handover: get('handover'),
      image: await fileData(file)
    };

    await api(`/api/reports/${reportType}`, { method: 'POST', body: JSON.stringify(body) });
    messageBox(msgBox, `✓ ${reportType === 'lost' ? 'Lost' : 'Found'} item report submitted successfully!`, false);
    form.reset();

    // Refresh exclusive tables immediately
    if (reportType === 'lost') loadExclusiveLostTable();
    else loadExclusiveFoundTable();

    // Check for matches against opposite category immediately
    const oppositeType = reportType === 'lost' ? 'found' : 'lost';
    try {
      const { items: allItems } = await api('/api/items');
      const oppItems = (allItems || []).filter(i => (i.type || '').toLowerCase() === oppositeType);
      let bestMatch = null;
      let highestScore = 0;

      oppItems.forEach(opp => {
        const score = calculateItemMatch(
          reportType === 'lost' ? body : opp,
          reportType === 'found' ? body : opp
        );
        if (score >= 50 && score > highestScore) {
          highestScore = score;
          bestMatch = opp;
        }
      });

      if (bestMatch) {
        showNotificationToast({
          text: `⚡ Potential Match Detected (${highestScore}%): Your item may match a recently reported ${oppositeType === 'lost' ? 'Lost' : 'Found'} item ("${bestMatch.itemName}").`,
          link: 'matches.html',
          type: 'possible_match'
        });
      }
    } catch { /* match check non-blocking */ }

    window.dispatchEvent(new CustomEvent('portal:report-submitted', { detail: { type: reportType, item: body } }));

  } catch (err) {
    messageBox(msgBox, err.message, true);
  }
}

const lostForm = document.getElementById('lostForm');
if (lostForm) {
  lostForm.addEventListener('submit', e => { e.preventDefault(); submitReport(lostForm, 'lost'); });
  configureImageUpload(lostForm);
  configureCardReport(lostForm);
}

const foundForm = document.getElementById('foundForm');
if (foundForm) {
  foundForm.addEventListener('submit', e => { e.preventDefault(); submitReport(foundForm, 'found'); });
  configureImageUpload(foundForm);
  configureCardReport(foundForm);
}

// ---------------- EXCLUSIVE LOST TABLE (LOST.HTML) ----------------
async function loadExclusiveLostTable() {
  const tbody = document.getElementById('lostReportsTableBody');
  if (!tbody) return;
  const q = document.getElementById('lostSearchInput')?.value.trim().toLowerCase() || '';
  const cat = document.getElementById('lostCategoryFilter')?.value || 'all';

  try {
    let items = [];
    const res = await api('/api/items?type=lost').catch(() => null);
    if (res && res.items) items = res.items;
    else {
      const local = localStorage.getItem('portal_items');
      if (local) items = JSON.parse(local).filter(i => (i.type || '').toLowerCase() === 'lost');
    }

    let filtered = (items || []).filter(i => (i.type || '').toLowerCase() === 'lost');
    if (cat !== 'all') filtered = filtered.filter(i => i.category === cat);
    if (q) {
      filtered = filtered.filter(i => 
        (i.itemName || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.location || '').toLowerCase().includes(q)
      );
    }

    const countEl = document.getElementById('lostReportsCount');
    if (countEl) countEl.textContent = `${filtered.length} Lost Report${filtered.length === 1 ? '' : 's'}`;

    const emptyEl = document.getElementById('lostReportsEmpty');
    if (emptyEl) emptyEl.style.display = filtered.length ? 'none' : 'block';

    tbody.innerHTML = '';
    filtered.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span style="font-weight:700;color:var(--lost-red);font-size:12px;">#${esc(item._id).slice(-6)}</span></td>
        <td>
          <strong>${esc(item.itemName)}</strong><br>
          <span style="font-size:12px;color:var(--text-muted);">${esc(item.description || '').slice(0, 42)}...</span>
        </td>
        <td>${esc(item.category || '-')}</td>
        <td>📍 ${esc(item.location || '-')}</td>
        <td>${item.date ? new Date(item.date).toLocaleDateString() : '-'}</td>
        <td><span class="status lost">Lost</span></td>
        <td>
          <button type="button" class="details-btn" style="padding:4px 10px;font-size:12px;cursor:pointer;">View</button>
          <button type="button" class="chat-btn" style="padding:4px 10px;font-size:12px;cursor:pointer;margin-left:4px;">Message</button>
        </td>
      `;

      tr.querySelector('.details-btn').addEventListener('click', () => openItemModal(item));
      tr.querySelector('.chat-btn').addEventListener('click', () => openChatModal(item));
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-message">${esc(err.message)}</td></tr>`;
  }
}

if (document.getElementById('lostReportsTableBody')) {
  loadExclusiveLostTable();
  document.getElementById('lostSearchInput')?.addEventListener('input', loadExclusiveLostTable);
  document.getElementById('lostCategoryFilter')?.addEventListener('change', loadExclusiveLostTable);
}

// ---------------- EXCLUSIVE FOUND TABLE (FOUND.HTML) ----------------
async function loadExclusiveFoundTable() {
  const tbody = document.getElementById('foundReportsTableBody');
  if (!tbody) return;
  const q = document.getElementById('foundSearchInput')?.value.trim().toLowerCase() || '';
  const cat = document.getElementById('foundCategoryFilter')?.value || 'all';

  try {
    let items = [];
    const res = await api('/api/items?type=found').catch(() => null);
    if (res && res.items) items = res.items;
    else {
      const local = localStorage.getItem('portal_items');
      if (local) items = JSON.parse(local).filter(i => (i.type || '').toLowerCase() === 'found');
    }

    let filtered = (items || []).filter(i => (i.type || '').toLowerCase() === 'found');
    if (cat !== 'all') filtered = filtered.filter(i => i.category === cat);
    if (q) {
      filtered = filtered.filter(i => 
        (i.itemName || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.location || '').toLowerCase().includes(q)
      );
    }

    const countEl = document.getElementById('foundReportsCount');
    if (countEl) countEl.textContent = `${filtered.length} Found Item${filtered.length === 1 ? '' : 's'}`;

    const emptyEl = document.getElementById('foundReportsEmpty');
    if (emptyEl) emptyEl.style.display = filtered.length ? 'none' : 'block';

    tbody.innerHTML = '';
    filtered.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span style="font-weight:700;color:var(--found-green);font-size:12px;">#${esc(item._id).slice(-6)}</span></td>
        <td>
          <strong>${esc(item.itemName)}</strong><br>
          <span style="font-size:12px;color:var(--text-muted);">${esc(item.description || '').slice(0, 42)}...</span>
        </td>
        <td>${esc(item.category || '-')}</td>
        <td>📍 ${esc(item.location || '-')}</td>
        <td>${item.date ? new Date(item.date).toLocaleDateString() : '-'}</td>
        <td><span class="status found">Found</span></td>
        <td>
          <button type="button" class="details-btn" style="padding:4px 10px;font-size:12px;cursor:pointer;">View</button>
          <button type="button" class="claim-btn" style="padding:4px 10px;font-size:12px;cursor:pointer;margin-left:4px;">Claim</button>
          <button type="button" class="chat-btn" style="padding:4px 10px;font-size:12px;cursor:pointer;margin-left:4px;">Message</button>
        </td>
      `;

      tr.querySelector('.details-btn').addEventListener('click', () => openItemModal(item));
      tr.querySelector('.claim-btn').addEventListener('click', async () => {
        const proof = prompt('Enter your specific ownership details (engravings, serial number, wallpaper, markings, etc.):');
        if (!proof) return;
        try {
          await api('/api/claims', { method: 'POST', body: JSON.stringify({ itemId: item._id, details: proof }) });
          alert('✓ Ownership claim submitted! Campus Administration will review your claim.');
          loadExclusiveFoundTable();
        } catch (e) { alert(e.message); }
      });
      tr.querySelector('.chat-btn').addEventListener('click', () => openChatModal(item));
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-message">${esc(err.message)}</td></tr>`;
  }
}

if (document.getElementById('foundReportsTableBody')) {
  loadExclusiveFoundTable();
  document.getElementById('foundSearchInput')?.addEventListener('input', loadExclusiveFoundTable);
  document.getElementById('foundCategoryFilter')?.addEventListener('change', loadExclusiveFoundTable);
}

// ---------------- SEARCH PAGE ----------------
const resultsBody = document.getElementById('resultsBody');
async function searchItems() {
  if (!resultsBody) return;
  const p = new URLSearchParams();
  const q = document.getElementById('searchInput')?.value.trim();
  const category = document.getElementById('categoryFilter')?.value;
  const type = document.getElementById('typeFilter')?.value;
  const status = document.getElementById('statusFilter')?.value;

  if (q) p.set('q', q);
  if (category && category !== 'all') p.set('category', category);
  if (type && type !== 'all') p.set('type', type);
  if (status && status !== 'all') p.set('status', status);

  for (const key of ['dateFrom', 'dateTo']) {
    const val = document.getElementById(key)?.value;
    if (val) p.set(key, val);
  }

  try {
    const { items } = await api(`/api/items?${p}`);
    resultsBody.innerHTML = '';
    const countEl = document.getElementById('resultCount');
    if (countEl) countEl.textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;
    const noResults = document.getElementById('noResults');
    if (noResults) noResults.style.display = items.length ? 'none' : 'block';

    items.forEach(i => {
      const row = document.createElement('tr');

      const tdId = document.createElement('td');
      tdId.innerHTML = `<span style="font-weight:700;color:var(--primary);font-size:12px;">#${esc(i._id).slice(-6)}</span>`;

      const tdName = document.createElement('td');
      tdName.innerHTML = `<strong>${esc(i.itemName)}</strong><br><span style="font-size:12px;color:var(--text-muted);">${esc(i.description || '').slice(0, 45)}...</span>`;

      const tdCat = document.createElement('td');
      tdCat.textContent = i.category || '-';

      const tdLoc = document.createElement('td');
      tdLoc.innerHTML = `📍 ${esc(i.location || '-')}`;

      const tdDate = document.createElement('td');
      tdDate.textContent = i.date ? new Date(i.date).toLocaleDateString() : '-';

      const tdType = document.createElement('td');
      const typeBadge = document.createElement('span');
      typeBadge.className = `status ${(i.type || '').toLowerCase()}`;
      typeBadge.textContent = statusText(i.type);
      tdType.appendChild(typeBadge);

      const tdStatus = document.createElement('td');
      tdStatus.textContent = `${statusText(i.status)} / ${recoveryText(i.recoveryStatus)}`;

      const tdAction = document.createElement('td');
      const view = document.createElement('button');
      view.type = 'button';
      view.className = 'details-btn';
      view.textContent = 'View';
      view.addEventListener('click', () => openItemModal(i));
      tdAction.appendChild(view);

      if ((i.type || '').toLowerCase() === 'found' && i.recoveryStatus !== 'returned' && i.recoveryStatus !== 'claimed') {
        const claim = document.createElement('button');
        claim.type = 'button';
        claim.className = 'claim-btn';
        claim.textContent = 'Claim';
        claim.addEventListener('click', async () => {
          const details = prompt('Describe private identifying details to confirm ownership:');
          if (!details) return;
          try {
            await api('/api/claims', { method: 'POST', body: JSON.stringify({ itemId: i._id, details }) });
            alert('Claim submitted for administrator review.');
            searchItems();
          } catch (e) { alert(e.message); }
        });
        tdAction.appendChild(claim);
      }

      const chat = document.createElement('button');
      chat.type = 'button';
      chat.className = 'chat-btn';
      chat.textContent = 'Message';
      chat.addEventListener('click', () => openChatModal(i));
      tdAction.appendChild(chat);

      row.append(tdId, tdName, tdCat, tdLoc, tdDate, tdType, tdStatus, tdAction);
      resultsBody.appendChild(row);
    });
  } catch (e) {
    if (resultsBody) resultsBody.innerHTML = `<tr><td colspan="8" class="empty-message">${esc(e.message)}</td></tr>`;
  }
}

if (resultsBody) {
  window.searchItems = searchItems;
  searchItems();
  document.getElementById('searchInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') searchItems(); });
  for (const id of ['categoryFilter', 'typeFilter', 'statusFilter', 'dateFrom', 'dateTo']) {
    document.getElementById(id)?.addEventListener('change', searchItems);
  }
}

// ---------------- AUTOMATED MATCHING ENGINE (MATCHES.HTML) ----------------
function calculateItemMatch(lostItem, foundItem) {
  if (!lostItem || !foundItem) return { score: 0, reasonText: '', reasons: [] };

  const reasons = [];
  let score = 0;

  // 1. Category comparison: (a) MUST MATCH
  const catLost = String(lostItem.category || '').trim().toLowerCase();
  const catFound = String(foundItem.category || '').trim().toLowerCase();

  if (!catLost || !catFound || catLost !== catFound) {
    return { score: 0, reasonText: '', reasons: [] };
  }

  score += 30;
  reasons.push(`Same category (${lostItem.category || 'Item'})`);

  // 2. Campus Location comparison: (c)
  const locLost = String(lostItem.location || '').trim().toLowerCase();
  const locFound = String(foundItem.location || '').trim().toLowerCase();

  if (locLost && locFound) {
    if (locLost === locFound) {
      score += 25;
      reasons.push(`same location (${lostItem.location})`);
    } else if (locLost.includes(locFound) || locFound.includes(locLost)) {
      score += 18;
      reasons.push(`matching location (${lostItem.location})`);
    } else {
      const lWords1 = locLost.split(/\s+/).filter(w => w.length > 3);
      const lWords2 = locFound.split(/\s+/).filter(w => w.length > 3);
      const commonLoc = lWords1.some(w => lWords2.includes(w));
      if (commonLoc) {
        score += 15;
        reasons.push(`same campus area (${lostItem.location})`);
      }
    }
  }

  // 3. Color, Brand, & Distinctive Item Keywords: (b)
  const textLost = `${lostItem.itemName || ''} ${lostItem.description || ''}`.toLowerCase();
  const textFound = `${foundItem.itemName || ''} ${foundItem.description || ''}`.toLowerCase();

  const colors = [
    'black', 'white', 'blue', 'red', 'silver', 'grey', 'gray', 'green', 
    'yellow', 'gold', 'brown', 'pink', 'purple', 'orange', 'navy', 'beige', 'maroon'
  ];
  const brands = [
    'boat', 'apple', 'samsung', 'dell', 'hp', 'lenovo', 'sony', 'asus', 
    'acer', 'casio', 'fastrack', 'noise', 'titan', 'realme', 'redmi', 
    'xiaomi', 'wildcraft', 'jbl', 'bose', 'logitech', 'zebronics', 'sandisk', 
    'oneplus', 'faber-castell', 'faber castell'
  ];

  // Color check
  const lostColors = colors.filter(c => new RegExp(`\\b${c}\\b`, 'i').test(textLost));
  const foundColors = colors.filter(c => new RegExp(`\\b${c}\\b`, 'i').test(textFound));

  if (lostColors.length > 0 && foundColors.length > 0) {
    const matchedColor = lostColors.find(c => foundColors.includes(c));
    if (matchedColor) {
      score += 15;
      const displayColor = matchedColor.charAt(0).toUpperCase() + matchedColor.slice(1);
      reasons.push(`Similar color (${displayColor})`);
    } else {
      score -= 20; // Explicit color conflict penalty
    }
  }

  // Brand check
  const lostBrands = brands.filter(b => textLost.includes(b));
  const foundBrands = brands.filter(b => textFound.includes(b));

  if (lostBrands.length > 0 && foundBrands.length > 0) {
    const matchedBrand = lostBrands.find(b => foundBrands.includes(b));
    if (matchedBrand) {
      score += 15;
      const displayBrand = matchedBrand.toUpperCase();
      reasons.push(`matching brand '${displayBrand}'`);
    } else {
      score -= 25; // Explicit brand conflict penalty
    }
  }

  // Keyword check
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'item', 'lost', 'found', 'near', 'left', 
    'room', 'block', 'floor', 'campus', 'alliance', 'university', 'please', 
    'contact', 'student', 'table', 'desk', 'handover', 'help', 'area', 'side',
    ...colors, ...brands
  ]);

  const extractTokens = (str) => {
    return str.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
  };

  const tokensLost = extractTokens(textLost);
  const tokensFound = extractTokens(textFound);
  const foundSet = new Set(tokensFound);

  const matchedKeywords = Array.from(new Set(tokensLost.filter(t => foundSet.has(t))));
  if (matchedKeywords.length > 0) {
    const kwScore = Math.min(20, matchedKeywords.length * 8);
    score += kwScore;
    const topKws = matchedKeywords.slice(0, 2).map(k => `'${k.toUpperCase()}'`).join(' and ');
    reasons.push(`matching keyword ${topKws}`);
  }

  // 4. Date Lost vs. Date Found: (d)
  if (lostItem.date && foundItem.date) {
    const tLost = new Date(lostItem.date).getTime();
    const tFound = new Date(foundItem.date).getTime();

    if (!isNaN(tLost) && !isNaN(tFound)) {
      const diffMs = tFound - tLost;
      const diffDays = Math.abs(diffMs) / 86400000;

      if (diffDays <= 1) {
        score += 15;
        if (diffDays <= 0.4) {
          reasons.push('same date');
        } else {
          reasons.push('within 1 day');
        }
      } else if (diffDays <= 3) {
        score += 10;
        reasons.push('within 3 days');
      } else if (diffDays <= 7) {
        score += 5;
        reasons.push('within 1 week');
      } else if (diffMs < -2 * 86400000) {
        score -= 15;
      }
    }
  }

  score = Math.max(0, Math.min(95, Math.round(score)));

  if (score < 60) {
    return { score, reasonText: '', reasons: [] };
  }

  const reasonText = reasons.length > 0 
    ? `Matched on: ${reasons.join(', ')}`
    : `Matched on: Same category (${lostItem.category})`;

  return { score, reasonText, reasons };
}

async function loadMatches() {
  const matchesList = document.getElementById('matchesList');
  const loading = document.getElementById('matchesLoading');
  const empty = document.getElementById('matchesEmpty');
  const notifBox = document.getElementById('matchesNotifications');
  if (!matchesList) return;

  if (loading) loading.style.display = 'block';
  if (empty) empty.style.display = 'none';

  try {
    let matchedPairs = [];
    
    // First attempt to get authoritative dynamic matches from server API
    const matchRes = await api('/api/matches').catch(() => null);
    if (matchRes && matchRes.matches && Array.isArray(matchRes.matches)) {
      matchedPairs = matchRes.matches.map(m => ({
        score: m.score,
        reasonText: m.reasonText || (m.reasons ? `Matched on: ${m.reasons.join(', ')}` : `Matched on: Same category (${m.lostItem?.category || 'Item'})`),
        lost: m.lostItem,
        found: m.foundItem
      }));
    } else {
      // Fallback: load items and calculate dynamically
      let items = [];
      const res = await api('/api/items').catch(() => null);
      if (res && res.items) items = res.items;

      const lostItems = items.filter(i => (i.type || '').toLowerCase() === 'lost' && i.status !== 'resolved');
      const foundItems = items.filter(i => (i.type || '').toLowerCase() === 'found' && i.status !== 'resolved');

      lostItems.forEach(l => {
        foundItems.forEach(f => {
          const result = calculateItemMatch(l, f);
          if (result.score >= 60) {
            matchedPairs.push({ score: result.score, reasonText: result.reasonText, lost: l, found: f });
          }
        });
      });
    }

    matchedPairs.sort((a, b) => b.score - a.score);

    matchesList.innerHTML = '';
    if (loading) loading.style.display = 'none';

    if (!matchedPairs.length) {
      if (empty) empty.style.display = 'block';
    } else {
      if (empty) empty.style.display = 'none';

      matchedPairs.forEach(pair => {
        const card = document.createElement('article');
        card.className = 'match-card';

        const reasonFormatted = pair.reasonText 
          ? (pair.reasonText.startsWith('Matched on:') ? pair.reasonText : `Matched on: ${pair.reasonText}`)
          : `Matched on: Same category (${esc(pair.lost.category)})`;

        card.innerHTML = `
          <div class="match-heading" style="display:flex;flex-direction:column;align-items:flex-start;gap:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;width:100%;flex-wrap:wrap;gap:10px;">
              <h2 style="margin:0;">Potential Lost &amp; Found Match</h2>
              <span class="badge match-pct-badge" style="background:#eaf2fb;color:var(--primary);font-weight:700;padding:6px 14px;border-radius:20px;font-size:13px;border:1px solid #cbd5e1;">
                ⚡ ${pair.score}% Match Confidence
              </span>
            </div>
            <div class="match-reason-badge" style="background:#f1f5f9;color:var(--primary);font-size:12.5px;font-weight:600;padding:8px 14px;border-radius:6px;border-left:4px solid var(--primary);width:100%;box-sizing:border-box;">
              🎯 <strong>${esc(reasonFormatted)}</strong>
            </div>
          </div>
          <div class="match-items">
            <!-- LOST ITEM -->
            <div class="match-item">
              <span class="status lost" style="margin-bottom:8px;display:inline-block;">Reported Lost</span>
              <h3>${esc(pair.lost.itemName)}</h3>
              <span class="match-owner">Reported by: ${esc(pair.lost.reporterName || 'Student Peer')}</span>
              ${pair.lost.image ? `<img src="${pair.lost.image}" class="match-photo" alt="${esc(pair.lost.itemName)}">` : ''}
              <dl>
                <dt>Category:</dt><dd>${esc(pair.lost.category)}</dd>
                <dt>Location:</dt><dd>📍 ${esc(pair.lost.location)}</dd>
                <dt>Date Lost:</dt><dd>${pair.lost.date ? new Date(pair.lost.date).toLocaleDateString() : '-'}</dd>
                <dt>Details:</dt><dd>${esc(pair.lost.description || '-')}</dd>
              </dl>
              <div class="match-actions">
                <button type="button" class="btn-view-lost" style="height:36px;padding:0 14px;font-size:12.5px;">View Lost Report</button>
              </div>
            </div>

            <!-- FOUND ITEM -->
            <div class="match-item" style="background:#f0fdf4;border-color:#bbf7d0;">
              <span class="status found" style="margin-bottom:8px;display:inline-block;">Reported Found</span>
              <h3>${esc(pair.found.itemName)}</h3>
              <span class="match-owner">Turned in by: ${esc(pair.found.reporterName || 'Campus Staff / Student')}</span>
              ${pair.found.image ? `<img src="${pair.found.image}" class="match-photo" alt="${esc(pair.found.itemName)}">` : ''}
              <dl>
                <dt>Category:</dt><dd>${esc(pair.found.category)}</dd>
                <dt>Location:</dt><dd>📍 ${esc(pair.found.location)}</dd>
                <dt>Date Found:</dt><dd>${pair.found.date ? new Date(pair.found.date).toLocaleDateString() : '-'}</dd>
                <dt>Handover At:</dt><dd>🏢 ${esc(pair.found.handover || 'Student Affairs Office')}</dd>
              </dl>
              <div class="match-actions">
                <button type="button" class="btn-view-found" style="height:36px;padding:0 14px;font-size:12.5px;">View Found Report</button>
                <button type="button" class="btn-claim-found" style="height:36px;padding:0 14px;font-size:12.5px;background:var(--found-green);">Claim Item</button>
                <button type="button" class="btn-msg-finder" style="height:36px;padding:0 14px;font-size:12.5px;background:#1e5692;">Message Finder</button>
              </div>
            </div>
          </div>
        `;

        card.querySelector('.btn-view-lost').addEventListener('click', () => openItemModal(pair.lost));
        card.querySelector('.btn-view-found').addEventListener('click', () => openItemModal(pair.found));
        card.querySelector('.btn-claim-found').addEventListener('click', async () => {
          const proof = prompt('Enter your specific ownership details (engravings, serial number, wallpaper, or markings):');
          if (!proof) return;
          try {
            await api('/api/claims', { method: 'POST', body: JSON.stringify({ itemId: pair.found._id, details: proof }) });
            alert('✓ Ownership claim submitted! The administrator and finder have been notified.');
            loadMatches();
          } catch (e) { alert(e.message); }
        });
        card.querySelector('.btn-msg-finder').addEventListener('click', () => openChatModal(pair.found));

        matchesList.appendChild(card);
      });
    }

    // Populate Notifications
    if (notifBox) {
      const { notifications } = await api('/api/notifications').catch(() => ({ notifications: [] }));
      notifBox.innerHTML = '';
      if (!notifications || !notifications.length) {
        notifBox.innerHTML = '<p style="color:var(--text-muted);margin:0;">No new portal notifications at this time.</p>';
      } else {
        notifications.forEach(n => {
          const row = document.createElement('div');
          row.className = 'match-notification';
          row.innerHTML = `
            <p><strong>🔔 ${esc(n.text)}</strong><br><small style="color:var(--text-muted);">${new Date(n.createdAt || Date.now()).toLocaleString()}</small></p>
            <div style="display:flex;gap:6px;">
              <a href="${n.link || 'matches.html'}" class="btn-secondary" style="padding:4px 10px;font-size:12px;text-decoration:none;border-radius:4px;border:1px solid var(--border-color);color:var(--primary);font-weight:600;">View Match</a>
            </div>
          `;
          notifBox.appendChild(row);
        });
      }
    }

  } catch (err) {
    if (loading) loading.style.display = 'none';
    if (empty) empty.style.display = 'block';
  }
}

if (document.getElementById('matchesList')) {
  loadMatches();
}

// ---------------- RECENT ITEMS ON HOME PAGE ----------------
const recent = document.getElementById('recentReportsBody');
if (recent) {
  api('/api/items').then(({ items }) => {
    recent.innerHTML = '';
    const slice = (items || []).slice(0, 6);
    if (!slice.length) {
      recent.innerHTML = `<tr><td colspan="6" class="empty-message">No recent reports found.</td></tr>`;
      return;
    }
    slice.forEach(i => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.innerHTML = `<strong>${esc(i.itemName)}</strong>`;

      const tdCat = document.createElement('td');
      tdCat.textContent = i.category || '-';

      const tdLoc = document.createElement('td');
      tdLoc.textContent = i.location || '-';

      const tdDate = document.createElement('td');
      tdDate.textContent = i.date ? new Date(i.date).toLocaleDateString() : '-';

      const tdType = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `status ${(i.type || '').toLowerCase()}`;
      badge.textContent = statusText(i.type);
      tdType.appendChild(badge);

      const tdAction = document.createElement('td');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'details-btn';
      btn.style.cssText = 'padding:4px 10px;font-size:12px;cursor:pointer;';
      btn.textContent = 'View Details →';
      btn.addEventListener('click', () => openItemModal(i));
      tdAction.appendChild(btn);

      tr.append(tdName, tdCat, tdLoc, tdDate, tdType, tdAction);
      recent.appendChild(tr);
    });
  }).catch(() => {
    recent.innerHTML = `<tr><td colspan="6" class="empty-message">Recent items could not be loaded.</td></tr>`;
  });
}

// ---------------- ITEM DETAILS PAGE (STANDALONE) ----------------
const itemDetails = document.getElementById('itemDetails');
if (itemDetails) {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const back = document.getElementById('backButton');
  back?.addEventListener('click', () => {
    const fallback = params.get('return') || 'index.html';
    location.assign(fallback);
  });

  (async () => {
    const errBox = document.getElementById('itemError');
    if (!id) {
      messageBox(errBox, 'No item ID provided.', true);
      return;
    }
    try {
      const { item: i } = await api(`/api/items/${encodeURIComponent(id)}`);
      const fields = {
        itemName: i.itemName,
        category: i.category,
        type: statusText(i.type),
        date: i.date ? new Date(i.date).toLocaleDateString() : '-',
        location: i.location,
        description: i.description,
        status: `${statusText(i.status)} / ${recoveryText(i.recoveryStatus)}`
      };
      for (const [key, value] of Object.entries(fields)) {
        const el = document.getElementById(`detail-${key}`);
        if (el) el.textContent = value || '-';
      }
      if (i.image) {
        const img = document.getElementById('detail-image');
        if (img) { img.src = i.image; img.hidden = false; }
        const unavail = document.getElementById('imageUnavailable');
        if (unavail) unavail.hidden = true;
      }
      itemDetails.hidden = false;
    } catch (e) {
      messageBox(errBox, e.message, true);
    }
  })();
}

// ---------------- MY REPORTS & MESSAGING (HISTORY PAGE) ----------------
const reportTable = document.getElementById('reportTableBody');
async function loadHistory() {
  if (!reportTable) return;
  try {
    const { reports, claims } = await api('/api/dashboard');
    const { conversations } = await api('/api/conversations');
    const me = (await api('/api/auth/me')).user;
    const currentUserId = me.id || me._id;

    // Counters
    document.getElementById('totalReports').textContent = reports.length;
    document.getElementById('lostReports').textContent = reports.filter(r => (r.type || '').toLowerCase() === 'lost').length;
    document.getElementById('foundReports').textContent = reports.filter(r => (r.type || '').toLowerCase() === 'found').length;
    document.getElementById('pendingReports').textContent = reports.filter(r => r.status === 'pending').length;

    // Reports Table
    reportTable.innerHTML = '';
    const empty = document.getElementById('emptyMessage');
    if (empty) empty.style.display = reports.length ? 'none' : 'block';

    reports.forEach(r => {
      const tr = document.createElement('tr');
      const tdId = document.createElement('td');
      tdId.textContent = `#${r._id.slice(-6)}`;

      const tdName = document.createElement('td');
      tdName.innerHTML = `<strong>${esc(r.itemName)}</strong>`;

      const tdCat = document.createElement('td');
      tdCat.textContent = r.category || '-';

      const tdLoc = document.createElement('td');
      tdLoc.textContent = r.location || '-';

      const tdDate = document.createElement('td');
      tdDate.textContent = r.date ? new Date(r.date).toLocaleDateString() : '-';

      const tdType = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `status ${(r.type || '').toLowerCase()}`;
      badge.textContent = statusText(r.type);
      tdType.appendChild(badge);

      const tdStatus = document.createElement('td');
      tdStatus.textContent = `${statusText(r.status)} / ${recoveryText(r.recoveryStatus)}`;

      const tdAction = document.createElement('td');
      const view = document.createElement('button');
      view.type = 'button';
      view.className = 'details-btn';
      view.textContent = 'View';
      view.addEventListener('click', () => openItemModal(r));
      tdAction.appendChild(view);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'delete-btn';
      del.textContent = 'Delete';
      del.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this report?')) return;
        try {
          await api(`/api/items/${r._id}`, { method: 'DELETE' });
          loadHistory();
        } catch (e) { alert(e.message); }
      });
      tdAction.appendChild(del);

      tr.append(tdId, tdName, tdCat, tdLoc, tdDate, tdType, tdStatus, tdAction);
      reportTable.appendChild(tr);
    });

    // Claims Table
    const claimsBody = document.getElementById('myClaimsBody');
    if (claimsBody) {
      claimsBody.innerHTML = '';
      const claimsEmpty = document.getElementById('myClaimsEmpty');
      if (claimsEmpty) claimsEmpty.style.display = claims.length ? 'none' : 'block';

      claims.forEach(c => {
        const tr = document.createElement('tr');
        const tdItem = document.createElement('td');
        tdItem.textContent = c.item?.itemName || 'Item Claim';

        const tdDate = document.createElement('td');
        tdDate.textContent = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-';

        const tdDetails = document.createElement('td');
        tdDetails.textContent = c.details || '-';

        const tdStatus = document.createElement('td');
        tdStatus.textContent = claimStatusText(c.status);
        if (c.proofRequest && c.status === 'pending') {
          tdStatus.textContent += ` | Proof Requested: ${c.proofRequest} `;
          const prBtn = document.createElement('button');
          prBtn.textContent = 'Provide Proof';
          prBtn.addEventListener('click', async () => {
            const proof = prompt('Enter the requested additional proof:');
            if (!proof) return;
            try {
              await api(`/api/claims/${c._id}/proof`, { method: 'PATCH', body: JSON.stringify({ proof }) });
              loadHistory();
            } catch (err) { alert(err.message); }
          });
          tdStatus.appendChild(prBtn);
        }

        tr.append(tdItem, tdDate, tdDetails, tdStatus);
        claimsBody.appendChild(tr);
      });
    }

    // Conversations / Direct Messaging
    const convContainer = document.getElementById('myConversations');
    if (convContainer) {
      convContainer.replaceChildren();
      if (!conversations.length) {
        const noConv = document.createElement('p');
        noConv.style.color = 'var(--text-muted)';
        noConv.textContent = 'No active conversations yet. When you or another student initiates contact on a report, conversations appear here.';
        convContainer.append(noConv);
      }

      conversations.forEach(c => {
        const card = document.createElement('article');
        card.className = 'conversation-card';

        const title = document.createElement('h3');
        title.textContent = c.item ? c.item.itemName : 'Campus Inquiry';

        const otherPerson = c.participants.find(p => String(p._id || p.id) !== String(currentUserId));
        const who = document.createElement('p');
        who.style.fontWeight = '600';
        who.textContent = `Chat with ${otherPerson?.name || 'Student Peer'}`;

        const latest = document.createElement('p');
        latest.textContent = c.latestMessage?.body || 'No messages yet';

        const time = document.createElement('p');
        time.style.fontSize = '12px';
        time.textContent = c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : '';

        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'btn-primary';
        openBtn.style.cssText = 'height:36px;padding:0 14px;font-size:13px;width:100%;margin-top:6px;';
        openBtn.textContent = 'Open Chat Window';
        openBtn.addEventListener('click', () => {
          location.assign(`history.html?conversation=${encodeURIComponent(c._id)}`);
        });

        card.append(title, who, latest, time, openBtn);
        convContainer.append(card);
      });

      // Render Selected Active Chat Panel
      const selectedId = new URLSearchParams(location.search).get('conversation');
      const activeConv = conversations.find(c => String(c._id) === String(selectedId));

      if (activeConv) {
        let chatPanel = document.getElementById('chatPanel');
        if (!chatPanel) {
          chatPanel = document.createElement('section');
          chatPanel.id = 'chatPanel';
          document.querySelector('main')?.append(chatPanel);
        }

        const peer = activeConv.participants.find(p => String(p._id || p.id) !== String(currentUserId));
        chatPanel.innerHTML = `
          <div id="chatHeader">
            <span>💬 Conversation with <strong>${esc(peer?.name || 'Student')}</strong></span>
            <span style="font-size:12px;opacity:0.8;margin-left:auto;">Item: ${esc(activeConv.item?.itemName || 'Report')}</span>
          </div>
          <div id="chatError" role="alert" style="display:none;"></div>
          <div id="chatMessages"></div>
          <form id="chatForm">
            <input id="chatText" placeholder="Write a message to coordinate safe item return..." required autocomplete="off">
            <button type="submit" class="submit-btn" style="height:44px;padding:0 20px;">Send</button>
          </form>
        `;

        const box = chatPanel.querySelector('#chatMessages');
        const form = chatPanel.querySelector('#chatForm');
        const input = chatPanel.querySelector('#chatText');

        let messagesList = [];

        const renderChat = () => {
          box.replaceChildren();
          messagesList.forEach(m => {
            const sender = m.senderId?._id || m.sender?._id || m.senderId || m.sender;
            const bubble = document.createElement('div');
            const isMe = String(sender) === String(currentUserId);
            bubble.className = `chat-bubble ${isMe ? 'sent' : ''}`;
            bubble.textContent = m.body || m.message || '';
            const t = document.createElement('time');
            t.textContent = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            bubble.append(t);
            box.append(bubble);
          });
          box.scrollTop = box.scrollHeight;
        };

        const loadMessages = async () => {
          try {
            const data = await api(`/api/conversations/${encodeURIComponent(activeConv._id)}/messages`);
            messagesList = data.messages || [];
            renderChat();
          } catch (e) {
            console.error('Chat load error:', e);
          }
        };

        loadMessages();

        if (window.portalSocket) {
          window.portalSocket.emit('conversation:join', activeConv._id);
          window.portalSocket.on('conversation:message', msg => {
            if (String(msg.conversationId) === String(activeConv._id) && !messagesList.some(m => m._id === msg._id)) {
              messagesList.push(msg);
              renderChat();
            }
          });
        }

        form.addEventListener('submit', async e => {
          e.preventDefault();
          const text = input.value.trim();
          if (!text) return;
          input.value = '';
          try {
            const { message } = await api(`/api/conversations/${encodeURIComponent(activeConv._id)}/messages`, {
              method: 'POST',
              body: JSON.stringify({ body: text })
            });
            if (message && !messagesList.some(m => m._id === message._id)) {
              messagesList.push(message);
              renderChat();
            }
          } catch (err) {
            alert('Message sending failed: ' + err.message);
          }
        });
      }
    }
  } catch (err) {
    if (reportTable) reportTable.innerHTML = `<tr><td colspan="8" class="empty-message">${esc(err.message)}</td></tr>`;
  }
}

if (reportTable) {
  window.loadReports = loadHistory;
  loadHistory();
}

// ---------------- CONTACT FORM ----------------
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const ok = document.getElementById('successMessage');
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value.trim();

    try {
      await api('/api/contact', { method: 'POST', body: JSON.stringify({ name, email, subject, message }) });
      messageBox(ok, '✓ Thank you! Your message has been sent to Campus Administration.', false);
      contactForm.reset();
    } catch (err) {
      messageBox(ok, err.message, true);
    }
  });
}

// ---------------- ADMIN PANEL ----------------
const adminForm = document.getElementById('adminLoginForm');
if (adminForm) {
  const loginScreen = document.getElementById('loginScreen');
  const dashboardScreen = document.getElementById('dashboardScreen');

  async function showAdmin() {
    try {
      const { user } = await api('/api/auth/me');
      if (user.role !== 'admin') throw new Error('Administrator privileges required.');
      loginScreen?.classList.add('hidden');
      if (loginScreen) loginScreen.style.display = 'none';
      dashboardScreen?.classList.remove('hidden');
      if (dashboardScreen) dashboardScreen.style.display = 'block';

      // Statistics
      const counts = await api('/api/admin/dashboard');
      document.getElementById('totalItems').textContent = counts.reports;
      document.getElementById('lostItems').textContent = counts.lost;
      document.getElementById('foundItems').textContent = counts.found;

      // Reports Management Table with Real vs Fake & Lifecycle controls
      const { reports } = await api('/api/admin/reports');
      const rBody = document.getElementById('reportsBody');
      rBody.innerHTML = '';
      reports.forEach(r => {
        const tr = document.createElement('tr');
        const verification = r.verification || 'pending';

        tr.innerHTML = `
          <td><span style="font-weight:700;color:var(--primary);font-size:12px;">#${r._id.slice(-6)}</span></td>
          <td>
            <strong>${esc(r.itemName)}</strong><br>
            <span style="font-size:12px;color:var(--text-muted);">${esc(r.description || '').slice(0, 42)}...</span><br>
            <span class="status ${(r.type || '').toLowerCase()}">${statusText(r.type)}</span>
          </td>
          <td>
            <span>${esc(r.category || '-')}</span><br>
            <small style="color:var(--text-muted);">📍 ${esc(r.location || '-')}</small>
          </td>
          <td>
            <div style="display:flex;flex-direction:column;gap:5px;">
              <span class="badge ${verification === 'verified-real' ? 'verified-real' : verification === 'flagged-fake' ? 'flagged-fake' : 'pending'}" style="width:fit-content;">
                ${verification === 'verified-real' ? '✓ Verified Real' : verification === 'flagged-fake' ? '⚠ Flagged Fake' : 'Pending Review'}
              </span>
              <div style="display:flex;gap:4px;margin-top:2px;">
                <button type="button" class="btn-verify-real" title="Mark as Verified Real" style="padding:2px 8px;font-size:11px;background:#15803d;color:white;border:none;">Real</button>
                <button type="button" class="btn-flag-fake" title="Mark as Flagged Fake" style="padding:2px 8px;font-size:11px;background:#b91c1c;color:white;border:none;">Fake</button>
                <button type="button" class="btn-verify-pend" title="Set to Pending" style="padding:2px 8px;font-size:11px;background:#64748b;color:white;border:none;">Reset</button>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size:12px;">
              <strong>Lifecycle:</strong> <span class="status ${r.status || 'pending'}">${statusText(r.status)}</span><br>
              <strong>Recovery:</strong> <span style="color:var(--primary);font-weight:600;">${recoveryText(r.recoveryStatus)}</span>
            </div>
            ${r.recoveryStatus !== 'claimed' && r.recoveryStatus !== 'returned' ? `
              <button type="button" class="btn-mark-claimed" style="margin-top:6px;padding:4px 8px;font-size:11.5px;background:#0d9488;color:white;border:none;">Mark Claimed</button>
            ` : `
              <span style="display:inline-block;margin-top:4px;font-size:11px;color:#15803d;font-weight:700;">✓ Claimed & Handed Over</span>
            `}
          </td>
          <td>
            <button type="button" class="view-btn" style="padding:4px 8px;font-size:11px;">View</button>
            <button type="button" class="delete-btn" style="padding:4px 8px;font-size:11px;background:#fee2e2;color:#b91c1c;border-color:#fca5a5;">Delete</button>
          </td>
        `;

        tr.querySelector('.btn-verify-real').addEventListener('click', async () => {
          await api(`/api/items/${r._id}/verification`, { method: 'PATCH', body: JSON.stringify({ verification: 'verified-real' }) });
          showAdmin();
        });
        tr.querySelector('.btn-flag-fake').addEventListener('click', async () => {
          await api(`/api/items/${r._id}/verification`, { method: 'PATCH', body: JSON.stringify({ verification: 'flagged-fake' }) });
          showAdmin();
        });
        tr.querySelector('.btn-verify-pend').addEventListener('click', async () => {
          await api(`/api/items/${r._id}/verification`, { method: 'PATCH', body: JSON.stringify({ verification: 'pending' }) });
          showAdmin();
        });

        tr.querySelector('.btn-mark-claimed')?.addEventListener('click', async () => {
          const note = prompt('Enter handover notes for this item:', 'Verified student identity and handed over at Student Affairs Office.');
          if (note === null) return;
          await api(`/api/items/${r._id}/lifecycle`, { method: 'PATCH', body: JSON.stringify({ recoveryStatus: 'claimed', handoverNote: note }) });
          showAdmin();
        });

        tr.querySelector('.view-btn').addEventListener('click', () => openItemModal(r));
        tr.querySelector('.delete-btn').addEventListener('click', async () => {
          if (!confirm('Permanently delete this report?')) return;
          await api(`/api/items/${r._id}`, { method: 'DELETE' });
          showAdmin();
        });

        rBody.appendChild(tr);
      });

      // Claims Verification Table
      const { claims } = await api('/api/admin/claims');
      const cBody = document.getElementById('claimsBody');
      cBody.innerHTML = '';
      claims.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${esc(c.item?.itemName || 'Item')}</td>
          <td>1</td>
          <td>${esc(c.claimant?.name || 'Claimant')} (${esc(c.claimant?.email || '')})</td>
          <td>${esc(c.details || '-')}</td>
          <td>${esc(c.proof || c.proofRequest || '-')}</td>
          <td>${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}</td>
          <td>
            <span class="status ${c.status}">${claimStatusText(c.status)}</span>
            ${c.status === 'pending' ? `
              <button type="button" class="approve-btn" style="background:var(--found-green);color:white;border:none;">Approve</button>
              <button type="button" class="reject-btn" style="background:var(--lost-red);color:white;border:none;">Reject</button>
            ` : ''}
          </td>
        `;

        tr.querySelector('.approve-btn')?.addEventListener('click', async () => {
          await api(`/api/claims/${c._id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) });
          showAdmin();
        });

        tr.querySelector('.reject-btn')?.addEventListener('click', async () => {
          await api(`/api/claims/${c._id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected' }) });
          showAdmin();
        });

        cBody.appendChild(tr);
      });

      // User Access Control Table
      const { users } = await api('/api/admin/users');
      const uBody = document.getElementById('usersBody');
      uBody.innerHTML = '';
      users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${esc(u.name)}</strong></td>
          <td>${esc(u.email)}</td>
          <td><span class="status ${u.role === 'admin' ? 'resolved' : 'pending'}">${u.role}</span></td>
          <td>
            <select>
              <option value="user" ${u.role === 'user' ? 'selected' : ''}>Student (user)</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrator (admin)</option>
            </select>
          </td>
        `;
        const sel = tr.querySelector('select');
        sel.addEventListener('change', async () => {
          await api(`/api/admin/users/${u.id}/role`, { method: 'PATCH', body: JSON.stringify({ role: sel.value }) });
          showAdmin();
        });
        uBody.appendChild(tr);
      });

    } catch (e) {
      dashboardScreen?.classList.add('hidden');
      loginScreen?.classList.remove('hidden');
    }
  }

  // Reset Demo Data button
  document.getElementById('resetDemoBtn')?.addEventListener('click', async () => {
    if (!confirm('Reset all demo items and records to the default Alliance University sample data?')) return;
    try {
      await api('/api/admin/reset-demo', { method: 'POST' });
      localStorage.removeItem('portal_items');
      alert('✓ Demo items reset to default Alliance University sample records!');
      showAdmin();
    } catch (err) {
      alert(err.message);
    }
  });

  adminForm.addEventListener('submit', async e => {
    e.preventDefault();
    const box = document.getElementById('errorMessage');
    try {
      await api('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('adminEmail').value.trim(),
          password: document.getElementById('adminPassword').value
        })
      });
      sessionStorage.setItem('admin_session_auth', 'true');
      showAdmin();
    } catch (err) {
      messageBox(box, err.message, true);
    }
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    sessionStorage.removeItem('admin_session_auth');
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_user');
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    location.replace('admin.html');
  });

  // Admin Gate: Enforce that clicking Admin always opens the Admin Login screen first!
  loginScreen?.classList.remove('hidden');
  if (loginScreen) loginScreen.style.display = 'flex';
  dashboardScreen?.classList.add('hidden');
  if (dashboardScreen) dashboardScreen.style.display = 'none';

  // Only if actively authorized in this current admin tab session, restore dashboard
  if (sessionStorage.getItem('admin_session_auth') === 'true') {
    api('/api/auth/me').then(({ user }) => {
      if (user && user.role === 'admin') showAdmin();
    }).catch(() => {
      sessionStorage.removeItem('admin_session_auth');
    });
  }
}

// ---------------- MODERN AI CHATBOT ----------------
(function setupModernAIChatbot() {
  const style = document.createElement('style');
  style.textContent = `
    #campusAiToggle {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 1000;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-radius: 999px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #123b68 0%, #1e5692 100%);
      color: #ffffff;
      font-weight: 700;
      font-size: 13.5px;
      box-shadow: 0 6px 24px rgba(18, 59, 104, 0.35);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 9px;
      transition: all 0.25s ease;
    }
    #campusAiToggle:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(18, 59, 104, 0.45);
    }
    #campusAiPanel {
      position: fixed;
      right: 24px;
      bottom: 86px;
      z-index: 1001;
      width: min(390px, calc(100vw - 32px));
      height: min(580px, calc(100vh - 110px));
      display: none;
      flex-direction: column;
      background: #ffffff;
      border: 1px solid #dce5ee;
      border-radius: 16px;
      box-shadow: 0 16px 45px rgba(18, 59, 104, 0.22);
      color: var(--text-main);
      overflow: hidden;
      animation: chatbotFadeIn 0.2s ease-out;
    }
    @keyframes chatbotFadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    #campusAiPanel.open {
      display: flex;
    }
    #campusAiPanel header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, #123b68 0%, #1e5692 100%);
      color: #ffffff;
      padding: 14px 18px;
    }
    #campusAiPanel header strong {
      font-size: 15px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #campusAiClose {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: none;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    #campusAiClose:hover {
      background: rgba(255, 255, 255, 0.35);
    }
    #campusAiMessages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f8fafc;
    }
    .botMessage, .userMessage {
      max-width: 85%;
      padding: 12px 15px;
      border-radius: 14px;
      line-height: 1.48;
      font-size: 13.5px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .botMessage {
      align-self: flex-start;
      background: #ffffff;
      color: #1f2937;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      border-bottom-left-radius: 4px;
    }
    .userMessage {
      align-self: flex-end;
      background: #123b68;
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }
    .botMessage a {
      display: inline-block;
      margin: 6px 6px 0 0;
      padding: 4px 10px;
      border-radius: 6px;
      background: #eaf2fb;
      color: #123b68;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
    }
    .botMessage a:hover {
      background: #dbeafe;
    }
    #campusAiSuggestions {
      padding: 10px 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px 8px;
      background: #f8fafc;
      border-top: 1px solid #edf2f7;
      max-height: 110px;
      overflow-y: auto;
    }
    #campusAiSuggestions button {
      white-space: normal;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      background: #ffffff;
      color: #123b68;
      padding: 5px 11px;
      cursor: pointer;
      font-size: 11.5px;
      font-weight: 600;
      line-height: 1.3;
      transition: all 0.15s;
    }
    #campusAiSuggestions button:hover {
      background: #eaf2fb;
      border-color: #123b68;
    }
    #campusAiForm {
      display: flex;
      gap: 8px;
      padding: 12px 14px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
    }
    #campusAiInput {
      flex: 1;
      height: 40px;
      padding: 0 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
    }
    #campusAiInput:focus {
      border-color: #123b68;
      box-shadow: 0 0 0 2px rgba(18,59,104,0.1);
    }
    #campusAiForm button {
      background: #123b68;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0 16px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    #campusAiForm button:hover {
      background: #0d2c4f;
    }
    @media (max-width: 600px) {
      #campusAiToggle { right: 16px; bottom: 16px; }
      #campusAiPanel { right: 12px; bottom: 74px; width: calc(100vw - 24px); }
    }
  `;
  document.head.append(style);

  const toggle = document.createElement('button');
  toggle.id = 'campusAiToggle';
  toggle.type = 'button';
  toggle.innerHTML = '<span>🤖</span><span>Campus AI Assistant</span>';

  const panel = document.createElement('section');
  panel.id = 'campusAiPanel';
  panel.innerHTML = `
    <header>
      <strong><span>🤖</span> Campus Lost &amp; Found AI</strong>
      <button type="button" id="campusAiClose" aria-label="Close assistant">✕</button>
    </header>
    <div id="campusAiMessages"></div>
    <div id="campusAiSuggestions"></div>
    <div style="font-size:11px;color:var(--text-muted);padding:4px 14px;background:#f8fafc;">Official item handovers are coordinated through the Student Affairs Office.</div>
    <form id="campusAiForm">
      <input id="campusAiInput" placeholder="Ask anything about campus lost &amp; found..." autocomplete="off">
      <button type="submit">Ask</button>
    </form>
  `;

  document.body.append(toggle, panel);

  const messagesBox = panel.querySelector('#campusAiMessages');
  const suggestionsBox = panel.querySelector('#campusAiSuggestions');
  const form = panel.querySelector('#campusAiForm');
  const input = panel.querySelector('#campusAiInput');
  const closeBtn = panel.querySelector('#campusAiClose');

  const addBubble = (text, kind = 'botMessage', links = [], items = []) => {
    const bubble = document.createElement('div');
    bubble.className = kind;
    bubble.textContent = text;

    if (kind === 'botMessage') {
      if (links && links.length) {
        bubble.append(document.createElement('br'));
        links.forEach(l => {
          const a = document.createElement('a');
          a.href = l.href;
          a.textContent = `${l.label} →`;
          bubble.append(a);
        });
      }

      if (items && items.length) {
        const itemWrap = document.createElement('div');
        itemWrap.style.marginTop = '8px';
        items.forEach(it => {
          const row = document.createElement('div');
          row.style.cssText = 'padding:6px 8px;margin-top:6px;background:#f1f5f9;border-radius:6px;font-size:12px;';
          row.innerHTML = `<strong>${esc(it.itemName)}</strong> (${esc(it.category)})<br>📍 ${esc(it.location)} · ${new Date(it.date).toLocaleDateString()} · <a href="item.html?id=${it._id}" style="margin:0;padding:2px 6px;">View Item</a>`;
          itemWrap.append(row);
        });
        bubble.append(itemWrap);
      }
    }

    messagesBox.append(bubble);
    messagesBox.scrollTop = messagesBox.scrollHeight;
    return bubble;
  };

  addBubble("Hello! I am your Alliance University Lost & Found Assistant. How can I help you recover or report an item today?");

  const prompts = [
    'I lost my College ID Card',
    'How do I report a lost item?',
    'How do I report a found item?',
    'How do I claim a found item?',
    'Where is Student Affairs?'
  ];

  prompts.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = p;
    btn.addEventListener('click', () => {
      input.value = p;
      form.requestSubmit();
    });
    suggestionsBox.append(btn);
  });

  const openPanel = () => {
    panel.classList.add('open');
    input.focus();
  };
  const closePanel = () => {
    panel.classList.remove('open');
    toggle.focus();
  };

  toggle.addEventListener('click', () => {
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  closeBtn.addEventListener('click', closePanel);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    input.value = '';
    addBubble(query, 'userMessage');
    const loading = addBubble('Thinking…');

    try {
      const data = await api('/api/chatbot/message', {
        method: 'POST',
        body: JSON.stringify({ message: query })
      });
      loading.remove();
      addBubble(data.answer, 'botMessage', data.links || [], data.items || []);
    } catch {
      loading.remove();
      const q = query.toLowerCase();
      if (q.includes('id') || q.includes('card')) {
        addBubble(
          "For lost or found College ID Cards:\nAll student ID cards turned in on campus are deposited at the Student Affairs Office (Central Campus). Full ID numbers are concealed for privacy. Visit the Student Affairs Office to verify and collect yours.",
          'botMessage',
          [{ label: 'Report Lost ID Card', href: 'lost.html' }, { label: 'Contact Office', href: 'contact.html' }]
        );
      } else if (q.includes('lost')) {
        addBubble(
          "To report a lost item:\nSubmit your report under 'Report Lost'. Our matching engine monitors newly turned-in items in real-time and will alert you immediately upon a match.",
          'botMessage',
          [{ label: 'Report Lost Item', href: 'lost.html' }, { label: 'Search All Items', href: 'search.html' }]
        );
      } else if (q.includes('found')) {
        addBubble(
          "Thank you for finding an item!\nPlease report it under 'Report Found' and deposit the item with Campus Security or the Student Affairs Office.",
          'botMessage',
          [{ label: 'Report Found Item', href: 'found.html' }]
        );
      } else if (q.includes('claim')) {
        addBubble(
          "To claim an item:\nLocate the item in the Found table, click 'Claim', and specify private ownership marks only the owner would know (e.g., serial number, engravings, or wallpaper).",
          'botMessage',
          [{ label: 'Browse Found Items', href: 'found.html' }]
        );
      } else {
        addBubble(
          "I can assist with reporting lost or found items, verifying ownership claims, campus recovery locations, and student messaging across Alliance University Central Campus.",
          'botMessage',
          [{ label: 'Search Portal Items', href: 'search.html' }, { label: 'Campus Map', href: 'map.html' }]
        );
      }
    }
  });
})();
