const path = require('path');

// Ensure Node resolves modules from root, backend/node_modules, and frontend/node_modules
const backendModules = path.join(__dirname, 'backend', 'node_modules');
if (!module.paths.includes(backendModules)) {
  module.paths.push(backendModules);
}

try {
  require('dotenv').config();
} catch (e) {
  // dotenv optional fallback
}

const http = require('http');
let express;
try { express = require('express'); } catch { express = require(path.join(backendModules, 'express')); }

let cors;
try { cors = require('cors'); } catch { cors = () => (req, res, next) => next(); }

let cookieParser;
try {
  cookieParser = require('cookie-parser');
} catch {
  cookieParser = () => (req, res, next) => {
    req.cookies = {};
    const header = req.headers.cookie;
    if (header) {
      header.split(';').forEach(c => {
        const [k, v] = c.split('=');
        if (k && v) req.cookies[k.trim()] = decodeURIComponent(v.trim());
      });
    }
    next();
  };
}

let jwt;
try { jwt = require('jsonwebtoken'); } catch { jwt = require(path.join(backendModules, 'jsonwebtoken')); }

let bcrypt;
try { bcrypt = require('bcryptjs'); } catch { bcrypt = require(path.join(backendModules, 'bcryptjs')); }

let mongoose;
try { mongoose = require('mongoose'); } catch { mongoose = require(path.join(backendModules, 'mongoose')); }

let Server;
try {
  Server = require('socket.io').Server;
} catch {
  Server = null;
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'campusfind_jwt_secret_key_alliance_university_2026_super_secure_32chars';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusfind';
const STUDENT_EMAIL_DOMAIN = 'ced.alliance.edu.in';

// ---------------- MIDDLEWARE ----------------
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:5173',
  'http://localhost:5500',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5500'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// ---------------- PORTAL ENTRY GATE (STUDENT LOGIN FIRST) ----------------
const gatedPortalPages = new Set([
  '/',
  '/capstone',
  '/capstone/',
  '/index.html',
  '/search.html',
  '/lost.html',
  '/found.html',
  '/matches.html',
  '/history.html',
  '/map.html',
  '/contact.html',
  '/item.html',
  '/dashboard.html'
]);

app.get(['/capstone', '/capstone/'], (req, res) => res.redirect('/'));

app.use((req, res, next) => {
  const reqPath = req.path.toLowerCase();
  if (gatedPortalPages.has(reqPath) || reqPath === '') {
    const user = getUserFromToken(req);
    if (!user) {
      return res.redirect('/login.html');
    }
  }
  next();
});

// Serve static assets from project root
app.use(express.static(__dirname));

// ---------------- SOCKET.IO ----------------
let io;
if (Server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      credentials: true
    }
  });

  io.on('connection', socket => {
    socket.on('conversation:join', (conversationId, callback) => {
      if (conversationId) {
        socket.join(`conversation_${conversationId}`);
        if (typeof callback === 'function') callback({ ok: true });
      }
    });
  });
} else {
  io = {
    emit: () => {},
    to: () => ({ emit: () => {} })
  };
}

// ---------------- IN-MEMORY STORE (Dual Mode: MongoDB with robust fallback) ----------------
let isMongoConnected = false;

// Seed realistic sample items for Alliance University Lost & Found Portal
function getInitialDemoItems() {
  return [
    {
      _id: 'item_101',
      itemName: 'Alliance University Student ID Card',
      category: 'College ID Card',
      description: '3rd Year B.Tech CSE student ID card with red neck lanyard. Lost near 2nd floor reading area.',
      location: 'Alliance University Library',
      date: new Date(Date.now() - 86400000 * 1).toISOString(),
      type: 'lost',
      status: 'pending',
      verification: 'verified-real',
      recoveryStatus: 'open',
      contactName: 'Kavitha R',
      contact: '+91 98765 43210',
      reporter: 'usr_student_1',
      reporterName: 'Kavitha R',
      image: '',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
    },
    {
      _id: 'item_102',
      itemName: 'Alliance University ID Card (CSE Student)',
      category: 'College ID Card',
      description: 'Turned-in student identity card with red lanyard found on study table. Handed over to Student Affairs.',
      location: 'Alliance University Library',
      date: new Date(Date.now() - 43200000).toISOString(),
      type: 'found',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      handover: 'Student Affairs Office (Admin Block)',
      contactName: 'Library Security Desk',
      contact: '+91 80 4619 1500',
      reporter: 'usr_admin_1',
      reporterName: 'Library Security',
      privateVerification: 'Dep: CSE, Reg ending in 410',
      image: '',
      createdAt: new Date(Date.now() - 43200000).toISOString()
    },
    {
      _id: 'item_103',
      itemName: 'Boat Airdopes 141 (Black Case)',
      category: 'Electronics',
      description: 'Matte black earbud charging case with small silver scuff on lid. Lost during lunch break at food court.',
      location: 'Alliance Food Court',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      type: 'lost',
      status: 'approved',
      verification: 'pending',
      recoveryStatus: 'open',
      contactName: 'Rohan Sharma',
      contact: '+91 91234 56789',
      reporter: 'usr_student_2',
      reporterName: 'Rohan Sharma',
      image: '',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      _id: 'item_104',
      itemName: 'Boat Wireless Earbuds (Black Charging Case)',
      category: 'Electronics',
      description: 'Found on table at Alliance Food Court dining area. Kept safely at supervisory counter.',
      location: 'Alliance Food Court',
      date: new Date(Date.now() - 86400000 * 1.5).toISOString(),
      type: 'found',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      handover: 'Food Court Supervisory Desk',
      contactName: 'Food Court Staff',
      contact: '+91 80 4619 1520',
      reporter: 'usr_admin_1',
      reporterName: 'Food Court Staff',
      privateVerification: 'Right earbud has scratch on outer rim',
      image: '',
      createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString()
    },
    {
      _id: 'item_105',
      itemName: 'Casio fx-991CW Scientific Calculator',
      category: 'Electronics',
      description: 'Engineering scientific calculator left in Room 204 in LC2 (Faculty of Engineering). Verified and returned to student.',
      location: 'LC2 (Faculty of Engineering and Technology)',
      date: new Date(Date.now() - 86400000 * 4).toISOString(),
      type: 'found',
      status: 'resolved',
      verification: 'verified-real',
      recoveryStatus: 'claimed',
      handover: 'Returned to student owner upon ID and roll number verification.',
      contactName: 'Faculty Coordinator',
      contact: '+91 80 4619 1550',
      reporter: 'usr_admin_1',
      reporterName: 'Faculty Coordinator',
      privateVerification: 'Owner initials "K.V." written inside sliding cover',
      image: '',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
    },
    {
      _id: 'item_106',
      itemName: 'Fastrack Blue Sports Water Bottle',
      category: 'Personal Belongings',
      description: '750ml stainless steel sports bottle with carabiner loop left beside football turf bleachers.',
      location: 'Alliance Football Ground',
      date: new Date(Date.now() - 86400000 * 3).toISOString(),
      type: 'lost',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      contactName: 'Rohan Sharma',
      contact: '+91 91234 56789',
      reporter: 'usr_student_2',
      reporterName: 'Rohan Sharma',
      image: '',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      _id: 'item_107',
      itemName: 'SanDisk 64GB Dual USB Drive',
      category: 'Electronics',
      location: 'LC3 (near Nescafé)',
      date: new Date(Date.now() - 86400000 * 3.5).toISOString(),
      type: 'lost',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      description: 'Plugged into terminal 14 in LC3 computer lab near Nescafé.',
      contactName: 'Kavitha R',
      contact: '+91 98765 43210',
      reporter: 'usr_student_1',
      reporterName: 'Kavitha R',
      image: '',
      createdAt: new Date(Date.now() - 86400000 * 3.5).toISOString()
    },
    {
      _id: 'item_108',
      itemName: 'Black Foldable Campus Umbrella',
      category: 'Personal Belongings',
      location: 'Nescafé',
      date: new Date(Date.now() - 86400000 * 1).toISOString(),
      type: 'found',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      handover: 'Nescafé Counter',
      description: 'Left on the side counter at Nescafé courtyard.',
      contactName: 'Nescafé Barista',
      contact: '+91 80 4619 1525',
      reporter: 'usr_admin_1',
      reporterName: 'Nescafé Staff',
      privateVerification: 'Silver button handle with Alliance tag',
      image: '',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
    },
    {
      _id: 'item_109',
      itemName: 'Constitution Law Bare Acts & Notes Folder',
      category: 'Study Materials',
      location: 'LC2 (Alliance School of Law)',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      type: 'lost',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      description: 'Black zip folder with handwritten notes from Moot Court Room.',
      contactName: 'Rohan Sharma',
      contact: '+91 91234 56789',
      reporter: 'usr_student_2',
      reporterName: 'Rohan Sharma',
      image: '',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      _id: 'item_110',
      itemName: 'HP 65W Blue-Pin Laptop Charger',
      category: 'Charger and Electronics Accessories',
      location: 'Alliance School of Business',
      date: new Date(Date.now() - 86400000 * 2.5).toISOString(),
      type: 'lost',
      status: 'approved',
      verification: 'pending',
      recoveryStatus: 'open',
      description: 'Original HP charger left plugged in Executive Classroom 102.',
      contactName: 'Kavitha R',
      contact: '+91 98765 43210',
      reporter: 'usr_student_1',
      reporterName: 'Kavitha R',
      image: '',
      createdAt: new Date(Date.now() - 86400000 * 2.5).toISOString()
    },
    {
      _id: 'item_111',
      itemName: 'SG Pro Cricket Batting Gloves (White)',
      category: 'Sports Equipment',
      location: 'Alliance Cricket Ground',
      date: new Date(Date.now() - 86400000 * 1.2).toISOString(),
      type: 'found',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      handover: 'Sports Pavilion Desk',
      description: 'Pair of leather cricket gloves found near cricket pavilion practice nets.',
      contactName: 'Sports Coach',
      contact: '+91 80 4619 1570',
      reporter: 'usr_admin_1',
      reporterName: 'Sports Department',
      privateVerification: 'Right glove marked with initials "A.K."',
      image: '',
      createdAt: new Date(Date.now() - 86400000 * 1.2).toISOString()
    },
    {
      _id: 'item_112',
      itemName: 'Mikasa Volleyball & Wristband',
      category: 'Sports Equipment',
      location: 'Alliance Volleyball Court',
      date: new Date(Date.now() - 86400000 * 1.8).toISOString(),
      type: 'found',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      handover: 'Alliance Activity Center',
      description: 'Official match volleyball left by the volleyball sand court.',
      contactName: 'Gym Coordinator',
      contact: '+91 80 4619 1580',
      reporter: 'usr_admin_1',
      reporterName: 'Activity Center Desk',
      privateVerification: 'Navy blue wristband tied to ball mesh bag',
      image: '',
      createdAt: new Date(Date.now() - 86400000 * 1.8).toISOString()
    }
  ];
}

const memoryStore = {
  users: [
    {
      _id: 'usr_admin_1',
      id: 'usr_admin_1',
      name: 'Campus Administrator',
      email: 'admin@alliance.edu.in',
      passwordHash: bcrypt.hashSync('Admin@1234', 10),
      role: 'admin',
      createdAt: new Date().toISOString()
    },
    {
      _id: 'usr_student_1',
      id: 'usr_student_1',
      name: 'Kavitha R',
      email: 'kavitha.r@ced.alliance.edu.in',
      passwordHash: bcrypt.hashSync('Student@1234', 10),
      role: 'user',
      createdAt: new Date().toISOString()
    },
    {
      _id: 'usr_student_2',
      id: 'usr_student_2',
      name: 'Rohan Sharma',
      email: 'rohan.s@ced.alliance.edu.in',
      passwordHash: bcrypt.hashSync('Student@1234', 10),
      role: 'user',
      createdAt: new Date().toISOString()
    }
  ],
  items: getInitialDemoItems(),
  claims: [
    {
      _id: 'claim_demo_1',
      item: { _id: 'item_105', itemName: 'Casio fx-991CW Scientific Calculator', category: 'Electronics', location: 'Academic Block 1', date: new Date(Date.now() - 86400000 * 4).toISOString() },
      claimant: { id: 'usr_student_1', _id: 'usr_student_1', name: 'Kavitha R', email: 'kavitha.r@ced.alliance.edu.in' },
      details: 'My initials K.V. are etched inside the blue sliding cover. I had Calculus exam in Room 302.',
      proof: 'Student ID card matched with registered batch list.',
      status: 'approved',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    }
  ],
  conversations: [],
  messages: [],
  notifications: [
    {
      _id: 'notif_1',
      recipient: 'usr_student_1',
      text: 'Potential Match: A student ID card matching your lost report was turned in at Central Library.',
      link: 'matches.html',
      type: 'possible_match',
      readAt: null,
      createdAt: new Date().toISOString()
    },
    {
      _id: 'notif_2',
      recipient: 'usr_student_2',
      text: 'Potential Match: Wireless earbuds matching your lost Boat Airdopes was found at Cafeteria & Food Court.',
      link: 'matches.html',
      type: 'possible_match',
      readAt: null,
      createdAt: new Date().toISOString()
    }
  ]
};

// ---------------- MONGOOSE SCHEMAS (if connected) ----------------
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });

const itemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['lost', 'found', 'Lost', 'Found'], required: true },
  status: { type: String, default: 'pending' },
  recoveryStatus: { type: String, default: 'open' },
  contactName: String,
  contact: String,
  handover: String,
  image: String,
  privateVerification: String,
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reporterName: String
}, { timestamps: true });

let UserModel, ItemModel;

async function initDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
    isMongoConnected = true;
    UserModel = mongoose.models.User || mongoose.model('User', userSchema);
    ItemModel = mongoose.models.Item || mongoose.model('Item', itemSchema);
    console.log('MongoDB successfully connected.');
  } catch (err) {
    isMongoConnected = false;
    console.log('MongoDB offline or unreachable; active in robust in-memory datastore mode.');
  }
}
initDatabase();

// ---------------- AUTH HELPERS ----------------
function generateToken(user) {
  return jwt.sign(
    { sub: user._id?.toString() || user.id, role: user.role, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function getUserFromToken(req) {
  try {
    const authHeader = req.headers.authorization || '';
    let token = '';
    if (authHeader.startsWith('Bearer ')) token = authHeader.slice(7).trim();
    else if (req.cookies && req.cookies.token) token = req.cookies.token;

    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.sub;
    const user = memoryStore.users.find(u => (u._id?.toString() || u.id) === String(userId));
    if (user) return { id: user._id || user.id, _id: user._id || user.id, name: user.name, email: user.email, role: user.role };
    return { id: decoded.sub, _id: decoded.sub, name: decoded.name, email: decoded.email, role: decoded.role };
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Authentication required. Please log in.' });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = getUserFromToken(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator access required.' });
  }
  req.user = user;
  next();
}

// ---------------- AUTH ROUTES ----------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: isMongoConnected ? 'mongodb' : 'in-memory',
    database: isMongoConnected ? 'connected' : 'in-memory fallback active'
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const exists = memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (exists) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const newUser = {
    _id: `usr_${Date.now()}`,
    id: `usr_${Date.now()}`,
    name: name.trim(),
    email: cleanEmail,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'user',
    createdAt: new Date().toISOString()
  };

  memoryStore.users.push(newUser);
  const token = generateToken(newUser);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 86400000 });
  res.status(201).json({
    message: 'Registration successful',
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const user = memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid official student email or password.' });
  }

  const token = generateToken(user);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 86400000 });
  res.json({
    message: 'Login successful',
    token,
    user: { id: user.id || user._id, name: user.name, email: user.email, role: user.role }
  });
});

app.post('/api/admin/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const user = memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail && u.role === 'admin');

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid administrator credentials.' });
  }

  const token = generateToken(user);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 86400000 });
  res.json({
    message: 'Admin login successful',
    token,
    user: { id: user.id || user._id, name: user.name, email: user.email, role: user.role }
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Not logged in' });
  }
  res.json({ user });
});

// ---------------- REPORTS & ITEMS ROUTING ----------------

// Helper to normalize item types ('lost' | 'found')
function normalizeType(type) {
  if (!type) return 'lost';
  const lower = String(type).trim().toLowerCase();
  return lower === 'found' ? 'found' : 'lost';
}

// CREATE Lost or Found Report
function handleCreateReport(type, req, res) {
  const user = getUserFromToken(req) || { id: 'usr_guest', name: req.body.contactName || 'Student', role: 'user' };
  const b = req.body || {};

  const reportType = normalizeType(type || b.type);
  const itemName = (b.itemName || '').trim();
  const category = (b.category || '').trim();
  const location = (b.location || b.locationLost || '').trim();
  const date = b.date || b.dateLost || new Date().toISOString();
  const description = (b.description || '').trim();

  if (!itemName || !category || !location || !description) {
    return res.status(400).json({ message: 'Please provide item name, category, location, and description.' });
  }

  const newItem = {
    _id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    itemName,
    category,
    location,
    date: new Date(date).toISOString(),
    type: reportType,
    status: 'pending',
    recoveryStatus: 'open',
    description,
    handover: b.handover || '',
    contactName: b.contactName || user.name,
    contact: b.contact || '',
    image: b.image || '',
    privateVerification: b.privateVerification || '',
    reporter: user.id || user._id,
    reporterName: user.name,
    createdAt: new Date().toISOString()
  };

  memoryStore.items.unshift(newItem);

  // Check for auto-match notifications
  const oppositeType = reportType === 'lost' ? 'found' : 'lost';
  const matches = memoryStore.items.filter(i => 
    i.type === oppositeType &&
    (i.category === category || i.location.toLowerCase() === location.toLowerCase() || i.itemName.toLowerCase().includes(itemName.toLowerCase()))
  );

  if (matches.length > 0) {
    const notifyUser = {
      _id: `notif_${Date.now()}`,
      recipient: user.id,
      text: `Potential match found: ${matches[0].itemName} (${matches[0].type}) in ${matches[0].location}.`,
      link: 'matches.html',
      type: 'possible_match',
      readAt: null,
      createdAt: new Date().toISOString()
    };
    memoryStore.notifications.unshift(notifyUser);
    io.emit('notification', notifyUser);
  }

  res.status(201).json({
    message: `${reportType === 'lost' ? 'Lost' : 'Found'} report submitted successfully.`,
    item: newItem,
    report: newItem
  });
}

app.post('/api/reports/lost', (req, res) => handleCreateReport('lost', req, res));
app.post('/api/reports/found', (req, res) => handleCreateReport('found', req, res));
app.post('/api/reports', (req, res) => handleCreateReport(req.body.type, req.body, res));

// GET Items (supports q, category, type: 'lost'|'found', status, dateFrom, dateTo)
app.get('/api/items', (req, res) => {
  const { q, category, type, status, dateFrom, dateTo } = req.query;
  let results = [...memoryStore.items];

  if (type && type !== 'all') {
    const targetType = normalizeType(type);
    results = results.filter(i => normalizeType(i.type) === targetType);
  }

  if (category && category !== 'all') {
    results = results.filter(i => i.category.toLowerCase() === category.toLowerCase());
  }

  if (status && status !== 'all') {
    results = results.filter(i => i.status.toLowerCase() === status.toLowerCase() || i.recoveryStatus?.toLowerCase() === status.toLowerCase());
  }

  if (q) {
    const term = q.toLowerCase();
    results = results.filter(i => 
      i.itemName.toLowerCase().includes(term) ||
      i.description.toLowerCase().includes(term) ||
      i.location.toLowerCase().includes(term) ||
      i.category.toLowerCase().includes(term)
    );
  }

  if (dateFrom) {
    const from = new Date(dateFrom).getTime();
    results = results.filter(i => new Date(i.date).getTime() >= from);
  }

  if (dateTo) {
    const to = new Date(dateTo).getTime();
    results = results.filter(i => new Date(i.date).getTime() <= to);
  }

  res.json({ items: results, reports: results });
});

// GET Reports alias for compatibility
app.get('/api/reports', (req, res) => {
  const { search, category, type, status } = req.query;
  req.query.q = search;
  const items = [...memoryStore.items];
  let filtered = items;
  if (type) filtered = filtered.filter(i => normalizeType(i.type) === normalizeType(type));
  if (category) filtered = filtered.filter(i => i.category.toLowerCase() === category.toLowerCase());
  if (status) filtered = filtered.filter(i => i.status === status);
  if (search) {
    const t = search.toLowerCase();
    filtered = filtered.filter(i => i.itemName.toLowerCase().includes(t) || i.description.toLowerCase().includes(t));
  }
  res.json({ reports: filtered, items: filtered });
});

// GET Single Item Details
app.get('/api/items/:id', (req, res) => {
  const item = memoryStore.items.find(i => String(i._id) === String(req.params.id));
  if (!item) return res.status(404).json({ message: 'Item not found.' });
  res.json({ item });
});

app.get('/api/reports/:id', (req, res) => {
  const item = memoryStore.items.find(i => String(i._id) === String(req.params.id));
  if (!item) return res.status(404).json({ message: 'Report not found.' });
  res.json({ report: item, item });
});

// PATCH Item Status or Type
app.patch('/api/items/:id', requireAuth, (req, res) => {
  const item = memoryStore.items.find(i => String(i._id) === String(req.params.id));
  if (!item) return res.status(404).json({ message: 'Item not found.' });

  const { status, type, recoveryStatus } = req.body;
  if (status) item.status = status;
  if (type) item.type = normalizeType(type);
  if (recoveryStatus) item.recoveryStatus = recoveryStatus;

  res.json({ message: 'Item updated successfully', item });
});

// DELETE Item Report
app.delete('/api/items/:id', requireAuth, (req, res) => {
  const idx = memoryStore.items.findIndex(i => String(i._id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: 'Report not found.' });
  memoryStore.items.splice(idx, 1);
  res.json({ message: 'Report deleted successfully' });
});

// ---------------- DASHBOARD & USER REPORTS ----------------
app.get('/api/dashboard', requireAuth, (req, res) => {
  const userId = req.user.id || req.user._id;
  const reports = memoryStore.items.filter(i => String(i.reporter) === String(userId) || req.user.role === 'admin');
  const claims = memoryStore.claims.filter(c => String(c.claimant?.id || c.claimant?._id || c.claimant) === String(userId));
  const conversations = memoryStore.conversations.filter(c => c.participants.some(p => String(p._id || p.id || p) === String(userId)));
  const notifications = memoryStore.notifications.filter(n => !n.recipient || String(n.recipient) === String(userId));

  res.json({
    reports,
    claims,
    conversations,
    notifications
  });
});

app.get('/api/my/reports', requireAuth, (req, res) => {
  const userId = req.user.id || req.user._id;
  const reports = memoryStore.items.filter(i => String(i.reporter) === String(userId));
  res.json({ reports });
});

// ---------------- CLAIMS SYSTEM ----------------
app.post('/api/claims', requireAuth, (req, res) => {
  const { itemId, details } = req.body || {};
  const item = memoryStore.items.find(i => String(i._id) === String(itemId));
  if (!item) return res.status(404).json({ message: 'Item not found.' });

  const newClaim = {
    _id: `claim_${Date.now()}`,
    item: { _id: item._id, itemName: item.itemName, category: item.category, location: item.location, date: item.date },
    claimant: { id: req.user.id, _id: req.user.id, name: req.user.name, email: req.user.email },
    details: details || '',
    proof: '',
    proofRequest: '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  memoryStore.claims.unshift(newClaim);
  item.status = 'pending';
  item.recoveryStatus = 'claim_pending';

  res.status(201).json({ message: 'Claim submitted successfully for verification.', claim: newClaim });
});

app.patch('/api/claims/:id/proof', requireAuth, (req, res) => {
  const claim = memoryStore.claims.find(c => String(c._id) === String(req.params.id));
  if (!claim) return res.status(404).json({ message: 'Claim not found.' });
  claim.proof = req.body.proof || '';
  res.json({ message: 'Proof submitted', claim });
});

app.patch('/api/claims/:id/status', requireAdmin, (req, res) => {
  const claim = memoryStore.claims.find(c => String(c._id) === String(req.params.id));
  if (!claim) return res.status(404).json({ message: 'Claim not found.' });
  claim.status = req.body.status;
  claim.decisionReason = req.body.reason || '';
  claim.decidedAt = new Date().toISOString();
  claim.decisionBy = req.user;

  const item = memoryStore.items.find(i => String(i._id) === String(claim.item?._id));
  if (item && req.body.status === 'approved') {
    item.recoveryStatus = 'returned';
    item.status = 'resolved';
  }
  res.json({ message: 'Claim decision recorded', claim });
});

app.patch('/api/claims/:id/request-proof', requireAdmin, (req, res) => {
  const claim = memoryStore.claims.find(c => String(c._id) === String(req.params.id));
  if (!claim) return res.status(404).json({ message: 'Claim not found.' });
  claim.proofRequest = req.body.request || '';
  res.json({ message: 'Proof requested', claim });
});

// ---------------- USER-TO-USER MESSAGING & CONVERSATIONS ----------------
app.get('/api/conversations', requireAuth, (req, res) => {
  const userId = req.user.id || req.user._id;
  const userConvs = memoryStore.conversations.filter(c => 
    c.participants.some(p => String(p._id || p.id || p) === String(userId))
  );
  res.json({ conversations: userConvs });
});

app.post('/api/conversations', requireAuth, (req, res) => {
  const userId = req.user.id || req.user._id;
  const { itemId, matchId } = req.body || {};

  let targetItem = null;
  let otherParticipant = null;

  if (itemId) {
    targetItem = memoryStore.items.find(i => String(i._id) === String(itemId));
    if (targetItem) {
      const reporterId = targetItem.reporter;
      const reporterUser = memoryStore.users.find(u => String(u.id || u._id) === String(reporterId));
      otherParticipant = reporterUser ? { _id: reporterUser.id || reporterUser._id, name: reporterUser.name, email: reporterUser.email } : { _id: 'peer_student', name: targetItem.contactName || 'Student', email: '' };
    }
  }

  // Look for existing conversation
  let existing = memoryStore.conversations.find(c => {
    if (itemId && c.item && String(c.item._id) === String(itemId)) {
      return c.participants.some(p => String(p._id) === String(userId));
    }
    return false;
  });

  if (existing) {
    return res.json({ conversation: existing });
  }

  const newConv = {
    _id: `conv_${Date.now()}`,
    item: targetItem ? { _id: targetItem._id, itemName: targetItem.itemName, category: targetItem.category, location: targetItem.location } : null,
    participants: [
      { _id: userId, name: req.user.name, email: req.user.email },
      otherParticipant || { _id: 'peer_1', name: 'Student Peer', email: 'peer@ced.alliance.edu.in' }
    ],
    latestMessage: null,
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0
  };

  memoryStore.conversations.unshift(newConv);
  res.status(201).json({ conversation: newConv });
});

app.get('/api/conversations/:id/messages', requireAuth, (req, res) => {
  const convId = req.params.id;
  const messages = memoryStore.messages.filter(m => String(m.conversationId) === String(convId));
  res.json({ messages });
});

app.post('/api/conversations/:id/messages', requireAuth, (req, res) => {
  const convId = req.params.id;
  const bodyText = (req.body.body || req.body.message || '').trim();
  if (!bodyText) return res.status(400).json({ message: 'Message cannot be empty.' });

  const conv = memoryStore.conversations.find(c => String(c._id) === String(convId));
  if (!conv) return res.status(404).json({ message: 'Conversation not found.' });

  const userId = req.user.id || req.user._id;
  const newMsg = {
    _id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    conversationId: convId,
    senderId: userId,
    sender: { _id: userId, name: req.user.name },
    body: bodyText,
    createdAt: new Date().toISOString()
  };

  memoryStore.messages.push(newMsg);
  conv.latestMessage = newMsg;
  conv.lastMessageAt = newMsg.createdAt;

  // Broadcast real-time message to socket room
  io.to(`conversation_${convId}`).emit('conversation:message', newMsg);
  io.emit('conversation:message', newMsg);

  res.status(201).json({ message: newMsg });
});

// ---------------- NOTIFICATIONS ----------------
app.get('/api/notifications', (req, res) => {
  const user = getUserFromToken(req);
  const userId = user ? (user.id || user._id) : null;
  const list = memoryStore.notifications.filter(n => !userId || !n.recipient || String(n.recipient) === String(userId));
  const unreadCount = list.filter(n => !n.readAt).length;
  res.json({ notifications: list, unreadCount });
});

app.patch('/api/notifications/:id/read', (req, res) => {
  const notif = memoryStore.notifications.find(n => String(n._id) === String(req.params.id));
  if (notif) notif.readAt = new Date().toISOString();
  res.json({ notification: notif });
});

// ---------------- MATCHES API ----------------
app.get('/api/matches', (req, res) => {
  const lostItems = memoryStore.items.filter(i => normalizeType(i.type) === 'lost' && i.status !== 'resolved');
  const foundItems = memoryStore.items.filter(i => normalizeType(i.type) === 'found' && i.status !== 'resolved');

  const matches = [];
  lostItems.forEach(l => {
    foundItems.forEach(f => {
      const catMatch = l.category.toLowerCase() === f.category.toLowerCase();
      const locMatch = l.location.toLowerCase() === f.location.toLowerCase();
      const nameMatch = l.itemName.toLowerCase().split(' ').some(w => w.length > 3 && f.itemName.toLowerCase().includes(w));

      if (catMatch || (locMatch && nameMatch)) {
        matches.push({
          _id: `match_${l._id}_${f._id}`,
          status: 'Possible Match Found',
          lostItem: l,
          foundItem: f,
          contactItemId: f._id,
          createdAt: new Date().toISOString()
        });
      }
    });
  });

  res.json({ matches });
});

// ---------------- CAMPUS MAP API ----------------
app.get('/api/map/lost-items', (req, res) => {
  const { mapCategory, mapStatus } = req.query;
  let lostItems = memoryStore.items.filter(i => normalizeType(i.type) === 'lost');

  if (mapCategory && mapCategory !== 'all') {
    lostItems = lostItems.filter(i => i.category.toLowerCase() === mapCategory.toLowerCase());
  }

  const locationCounts = {};
  lostItems.forEach(item => {
    const loc = item.location || 'Other Campus Location';
    if (!locationCounts[loc]) {
      locationCounts[loc] = { name: loc, reportCount: 0, categories: {}, items: [] };
    }
    locationCounts[loc].reportCount += 1;
    locationCounts[loc].categories[item.category] = (locationCounts[loc].categories[item.category] || 0) + 1;
    locationCounts[loc].items.push({ id: item._id, itemName: item.itemName, category: item.category, date: item.date, status: item.status });
  });

  const locations = Object.values(locationCounts).map(loc => ({
    name: loc.name,
    reportCount: loc.reportCount,
    categories: Object.entries(loc.categories).map(([name, count]) => ({ name, count })),
    items: loc.items
  })).sort((a, b) => b.reportCount - a.reportCount);

  const resolvedCount = memoryStore.items.filter(i => normalizeType(i.type) === 'lost' && (i.status === 'resolved' || i.recoveryStatus === 'returned')).length;

  res.json({
    summary: {
      totalReports: lostItems.length,
      mostFrequentLocation: locations[0]?.name || 'Library',
      mostFrequentCount: locations[0]?.reportCount || 0,
      locationCount: locations.length,
      resolvedReportCount: resolvedCount,
      commonCategories: [
        { name: 'Accessories', count: 4 },
        { name: 'Electronics', count: 3 },
        { name: 'ID Cards', count: 2 }
      ]
    },
    categoryOptions: [
      'College ID Card',
      'Laptop',
      'Mobile Phone',
      'Charger and Electronics Accessories',
      'Headphones and Earbuds',
      'Wallet and Purse',
      'Keys',
      'Backpack and Handbag',
      'Watch'
    ],
    locations
  });
});

// ---------------- AI CHATBOT ROUTE ----------------
app.post('/api/chatbot/message', (req, res) => {
  const query = String(req.body.message || '').trim().toLowerCase();

  let answer = "I'm your Campus Lost & Found Assistant. I can help you report lost belongings, look up found items, and navigate the recovery process!";
  let links = [
    { label: "Report a Lost Item", href: "lost.html" },
    { label: "Search Found Items", href: "found.html" },
    { label: "View Possible Matches", href: "matches.html" }
  ];
  let items = [];

  if (query.includes('id') || query.includes('card') || query.includes('access card')) {
    answer = "For lost or found College ID Cards or University Access Cards:\n1. All ID cards found on campus are safely handed over to the Student Affairs Office (Central Campus).\n2. For student privacy, ID numbers and photos are not publicly displayed.\n3. Visit the Student Affairs Office with an alternate photo ID to claim yours.";
    links = [
      { label: "Report Lost ID Card", href: "lost.html" },
      { label: "Check Found ID Cards", href: "found.html" },
      { label: "Campus Map & Office Location", href: "map.html" }
    ];
  } else if (query.includes('how to report') || query.includes('lost something') || query.includes('lost my') || query.includes('report lost')) {
    answer = "To report a lost item:\n1. Click 'Report Lost' in the navigation bar.\n2. Fill in the item name, category, approximate date, campus location, and details.\n3. You will receive real-time notifications as soon as any matching item is turned in!";
    links = [
      { label: "Go to Report Lost Form", href: "lost.html" },
      { label: "Search Current Found Items", href: "found.html" }
    ];
  } else if (query.includes('found') || query.includes('report found') || query.includes('turn in')) {
    answer = "Thank you for helping fellow students!\nTo report a found item:\n1. Open 'Report Found' and provide item details and where you found it.\n2. Hand the item over to the Security Office, Student Affairs Office, or Library Reception desk.\n3. The rightful owner can verify and claim it through the portal.";
    links = [
      { label: "Report Found Item", href: "found.html" },
      { label: "View Campus Map", href: "map.html" }
    ];
  } else if (query.includes('claim') || query.includes('how do i claim') || query.includes('collect')) {
    answer = "To claim a found item:\n1. Search the Found table on the 'Report Found' or 'Search Items' page.\n2. Click 'Claim' and provide specific identifying marks only the owner would know (e.g. engravings, wallpaper, sticker, or contents).\n3. Once the administrator or finder approves, you will be notified to collect it at the designated campus office.";
    links = [
      { label: "Browse Found Items", href: "found.html" },
      { label: "My Submitted Claims", href: "history.html" }
    ];
  } else if (query.includes('admin') || query.includes('office') || query.includes('contact') || query.includes('where')) {
    answer = "Campus Lost & Found Administration is managed by the Student Affairs Office at Alliance University Central Campus.\n• Office: Student Affairs Office, Central Campus\n• Phone: +91 80 4619 1500\n• Email: studentaffairs@alliance.edu.in";
    links = [
      { label: "Campus Contact Details", href: "contact.html" },
      { label: "Campus Map", href: "map.html" }
    ];
  } else {
    // Search the items database for matching keywords
    const matches = memoryStore.items.filter(i => 
      query.split(' ').some(word => word.length > 2 && (i.itemName.toLowerCase().includes(word) || i.category.toLowerCase().includes(word) || i.location.toLowerCase().includes(word)))
    );

    if (matches.length > 0) {
      items = matches.slice(0, 3);
      answer = `I found ${matches.length} relevant item(s) in our records that might match what you're asking about:`;
      links = [
        { label: "View All Search Results", href: "search.html" },
        { label: "Check Matches Found", href: "matches.html" }
      ];
    } else {
      answer = "I'm here to assist with anything related to Alliance University's Lost & Found. You can report items, track status, connect with finders, or contact campus administration.";
    }
  }

  res.json({ answer, links, items });
});

// ---------------- CONTACT FORM ----------------
app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Name, email, and message are required.' });
  }
  res.json({ message: 'Thank you. Your message has been received by Campus Administration.' });
});

// ---------------- ADMIN ENDPOINTS ----------------
app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  const total = memoryStore.items.length;
  const lost = memoryStore.items.filter(i => normalizeType(i.type) === 'lost').length;
  const found = memoryStore.items.filter(i => normalizeType(i.type) === 'found').length;
  res.json({ reports: total, lost, found });
});

app.get('/api/admin/reports', requireAdmin, (req, res) => {
  res.json({ reports: memoryStore.items });
});

app.get('/api/admin/claims', requireAdmin, (req, res) => {
  res.json({ claims: memoryStore.claims });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = memoryStore.users.map(u => ({ id: u.id || u._id, name: u.name, email: u.email, role: u.role }));
  res.json({ users });
});

app.patch('/api/admin/users/:id/role', requireAdmin, (req, res) => {
  const user = memoryStore.users.find(u => String(u.id || u._id) === String(req.params.id));
  if (!user) return res.status(404).json({ message: 'User not found.' });
  user.role = req.body.role === 'admin' ? 'admin' : 'user';
  res.json({ message: 'User role updated', user });
});

// ---------------- AUTOMATED MATCHING ENGINE ----------------
function calculateMatchScore(lostItem, foundItem) {
  let score = 0;
  
  // 1. Category match (35%)
  if (lostItem.category && foundItem.category && lostItem.category.toLowerCase() === foundItem.category.toLowerCase()) {
    score += 35;
  }
  
  // 2. Location match (25%)
  if (lostItem.location && foundItem.location) {
    const loc1 = lostItem.location.toLowerCase();
    const loc2 = foundItem.location.toLowerCase();
    if (loc1 === loc2 || loc1.includes(loc2) || loc2.includes(loc1)) {
      score += 25;
    }
  }
  
  // 3. Keyword / title similarity (40%)
  const stopWords = new Set(['the', 'and', 'for', 'with', 'item', 'lost', 'found', 'near', 'left', 'room', 'block', 'floor', 'campus']);
  const words1 = (lostItem.itemName + ' ' + (lostItem.description || '')).toLowerCase().split(/[\s,.-]+/).filter(w => w.length > 2 && !stopWords.has(w));
  const words2 = (foundItem.itemName + ' ' + (foundItem.description || '')).toLowerCase().split(/[\s,.-]+/).filter(w => w.length > 2 && !stopWords.has(w));
  
  let commonWords = 0;
  const set2 = new Set(words2);
  words1.forEach(w => {
    if (set2.has(w)) commonWords++;
  });
  
  if (commonWords > 0) {
    score += Math.min(40, commonWords * 15);
  }
  
  return Math.min(98, Math.max(0, score));
}

app.get('/api/matches', (req, res) => {
  const lost = memoryStore.items.filter(i => normalizeType(i.type) === 'lost' && i.status !== 'resolved');
  const found = memoryStore.items.filter(i => normalizeType(i.type) === 'found' && i.status !== 'resolved');
  
  const matches = [];
  lost.forEach(l => {
    found.forEach(f => {
      const score = calculateMatchScore(l, f);
      if (score >= 50) {
        matches.push({
          id: `match_${l._id}_${f._id}`,
          score,
          lostItem: l,
          foundItem: f
        });
      }
    });
  });
  
  matches.sort((a, b) => b.score - a.score);
  res.json({ matches, total: matches.length });
});

// ---------------- ADMIN VERIFICATION & LIFECYCLE ----------------
app.patch('/api/items/:id/verification', (req, res) => {
  const item = memoryStore.items.find(i => String(i._id) === String(req.params.id));
  if (!item) return res.status(404).json({ message: 'Item not found.' });
  const { verification } = req.body;
  if (['verified-real', 'flagged-fake', 'pending'].includes(verification)) {
    item.verification = verification;
  }
  res.json({ message: 'Verification status updated', item });
});

app.patch('/api/items/:id/lifecycle', (req, res) => {
  const item = memoryStore.items.find(i => String(i._id) === String(req.params.id));
  if (!item) return res.status(404).json({ message: 'Item not found.' });
  const { recoveryStatus, handoverNote } = req.body;
  if (recoveryStatus) item.recoveryStatus = recoveryStatus;
  if (handoverNote) item.handover = handoverNote;
  if (recoveryStatus === 'claimed' || recoveryStatus === 'returned') {
    item.status = 'resolved';
  }
  res.json({ message: 'Lifecycle status updated', item });
});

app.post('/api/admin/reset-demo', (req, res) => {
  memoryStore.items = getInitialDemoItems();
  memoryStore.claims = [
    {
      _id: 'claim_demo_1',
      item: { _id: 'item_105', itemName: 'Casio fx-991CW Scientific Calculator', category: 'Electronics', location: 'Academic Block 1', date: new Date(Date.now() - 86400000 * 4).toISOString() },
      claimant: { id: 'usr_student_1', _id: 'usr_student_1', name: 'Kavitha R', email: 'kavitha.r@ced.alliance.edu.in' },
      details: 'My initials K.V. are etched inside the blue sliding cover. I had Calculus exam in Room 302.',
      proof: 'Student ID card matched with registered batch list.',
      status: 'approved',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    }
  ];
  memoryStore.notifications = [
    {
      _id: 'notif_1',
      recipient: 'usr_student_1',
      text: 'Potential Match: A student ID card matching your lost report was turned in at Central Library.',
      link: 'matches.html',
      type: 'possible_match',
      readAt: null,
      createdAt: new Date().toISOString()
    },
    {
      _id: 'notif_2',
      recipient: 'usr_student_2',
      text: 'Potential Match: Wireless earbuds matching your lost Boat Airdopes was found at Cafeteria & Food Court.',
      link: 'matches.html',
      type: 'possible_match',
      readAt: null,
      createdAt: new Date().toISOString()
    }
  ];
  res.json({ ok: true, message: 'All demo items and records have been reset to verified campus defaults.', items: memoryStore.items });
});

// ---------------- START SERVER ----------------
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  Alliance University Lost & Found Portal Backend`);
    console.log(`  Server listening at: http://localhost:${PORT}`);
    console.log(`  Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

module.exports = { app, server, memoryStore, calculateMatchScore, getInitialDemoItems };
