
import { useEffect, useState } from "react";
import {
  Search,
  Package,
  FilePlus2,
  ClipboardList,
  MapPin,
  BrainCircuit,
  Bell,
  MessageCircle,
  LayoutDashboard,
  Menu,
  X,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import "./App.css";

const TOKEN_KEY = "campusfind-token";

async function apiRequest(path, { method = "GET", token, body, signal } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || `Request failed (${response.status}).`);
  }

  return result;
}

function toUiItem(report) {
  const iconByCategory = {
    Accessories: "👛",
    Electronics: "🎧",
    Stationery: "📓",
    "Personal Items": "🧴",
  };
  const reportDate = new Date(report.date);

  return {
    id: report._id,
    name: report.itemName,
    category: report.category,
    location: report.location,
    description: report.description,
    status: report.type,
    icon: iconByCategory[report.category] || "📦",
    date: Number.isNaN(reportDate.getTime())
      ? "Date not provided"
      : reportDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
  };
}

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Search Items", icon: Search },
  { name: "Report Lost", icon: FilePlus2 },
  { name: "Report Found", icon: Package },
  { name: "My Reports", icon: ClipboardList },
  { name: "AI Matcher", icon: BrainCircuit },
  { name: "Campus Map", icon: MapPin },
  { name: "Notifications", icon: Bell },
  { name: "Contact", icon: MessageCircle },
];

function App() {
  const [page, setPage] = useState("Dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [items, setItems] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authDestination, setAuthDestination] = useState("Dashboard");
  const [busy, setBusy] = useState(false);

  const navigate = (name) => {
    const protectedPage = ["Report Lost", "Report Found", "My Reports"].includes(name);
    const destination = protectedPage && !token ? "Login" : name;
    if (destination === "Login") {
      setAuthDestination(protectedPage ? name : "Dashboard");
      setAuthMode("login");
    }
    setPage(destination);
    setMobileMenu(false);
    setMessage("");
    setError("");
  };

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    const suffix = params.size ? `?${params.toString()}` : "";

    const timeout = window.setTimeout(() => {
      apiRequest(`/reports${suffix}`, { signal: controller.signal })
        .then((result) => {
          if (active) setItems((result.reports || []).map(toUiItem));
        })
        .catch((requestError) => {
          if (active && requestError.name !== "AbortError") {
            setError(requestError.message);
          }
        });
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;
    apiRequest("/auth/me", { token })
      .then((result) => {
        if (active) setUser(result.user);
      })
      .catch((requestError) => {
        if (!active) return;
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setError(requestError.message);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (page !== "My Reports" || !token) return undefined;
    let active = true;
    apiRequest("/my/reports", { token })
      .then((result) => {
        if (active) setMyItems((result.reports || []).map(toUiItem));
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });

    return () => {
      active = false;
    };
  }, [page, token]);

  const saveReport = async (event, status) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (!token) {
        navigate(status === "Lost" ? "Report Lost" : "Report Found");
        return;
      }

      const data = new FormData(event.currentTarget);
      const result = await apiRequest("/reports", {
        method: "POST",
        token,
        body: {
          itemName: String(data.get("name") || "").trim(),
          category: String(data.get("category") || "").trim(),
          location: String(data.get("location") || "").trim(),
          description: String(data.get("description") || "").trim(),
          date: String(data.get("date") || new Date().toISOString().slice(0, 10)),
          type: status,
        },
      });

      const createdItem = toUiItem(result.report);
      setItems((current) => [createdItem, ...current]);
      setMyItems((current) => [createdItem, ...current]);
      setMessage("Your report has been added successfully!");
      setPage("My Reports");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const credentials = {
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || ""),
    };

    try {
      if (authMode === "register") {
        await apiRequest("/auth/register", {
          method: "POST",
          body: {
            name: String(form.get("name") || "").trim(),
            ...credentials,
          },
        });
      }

      const result = await apiRequest("/auth/login", {
        method: "POST",
        body: credentials,
      });
      sessionStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
      setUser(result.user);
      setPage(authDestination);
      setMessage(authMode === "register" ? "Account created and signed in." : "Signed in successfully.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setMyItems([]);
    setPage("Dashboard");
    setMessage("You have been signed out.");
    setError("");
  };

  const filteredItems = items.filter((item) =>
    `${item.name} ${item.category} ${item.location} ${item.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-overlay"
          onClick={() => setMobileMenu(false)}
          aria-label="Close menu"
        />
      )}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <Search size={23} />
          </div>
          <div>
            <strong>Campus<span>Find</span></strong>
            <small>ALLIANCE UNIVERSITY</small>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="campus-chip">
          <span className="live-dot" />
          Student Portal
          <span className="beta">BETA</span>
        </div>

        <nav className="side-nav">
          <p className="nav-heading">WORKSPACE</p>
          {navigation.slice(0, 5).map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-link ${page === name ? "active" : ""}`}
              onClick={() => navigate(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {page === name && <span className="active-bar" />}
            </button>
          ))}

          <p className="nav-heading smart-heading">SMART FEATURES</p>
          {navigation.slice(5, 8).map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-link ${page === name ? "active" : ""}`}
              onClick={() => navigate(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Notifications" && <span className="nav-count">2</span>}
              {page === name && <span className="active-bar" />}
            </button>
          ))}

          <p className="nav-heading smart-heading">SUPPORT</p>
          {navigation.slice(8).map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-link ${page === name ? "active" : ""}`}
              onClick={() => navigate(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {page === name && <span className="active-bar" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><CheckCircle2 size={20} /></div>
            <strong>Found something?</strong>
            <p>Help return an item to its owner.</p>
            <button onClick={() => navigate("Report Found")}>
              Report an item <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="profile">
            <div className="avatar">{user?.name?.slice(0, 1).toUpperCase() || "KV"}</div>
            <div>
              <strong>{user?.name || "Student User"}</strong>
              <small>{user?.role === "admin" ? "Administrator" : "Alliance University"}</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setMobileMenu(true)}
            aria-label="Open menu"
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">Workspace <ChevronRight size={14} /> <strong>{page}</strong></div>
          <div className="top-actions">
            <span className="today">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <button
              className="notification-button"
              onClick={() => navigate("Notifications")}
              aria-label="Notifications"
            >
              <Bell size={18} />
              <i />
            </button>
            <button
              className="top-avatar"
              type="button"
              onClick={user ? logout : () => navigate("Login")}
              title={user ? "Sign out" : "Sign in"}
              aria-label={user ? "Sign out" : "Sign in"}
            >
              {user?.name?.slice(0, 1).toUpperCase() || "KV"}
            </button>
          </div>
        </header>

        <section className="page-content">
          {error && <div className="error-message" role="alert">{error}</div>}
          {message && <div className="success-message"><CheckCircle2 size={17} /> {message}</div>}

          {(page === "Login" || page === "Register") && (
            <AuthPage
              mode={authMode}
              busy={busy}
              onModeChange={(mode) => {
                setAuthMode(mode);
                setPage(mode === "register" ? "Register" : "Login");
                setError("");
              }}
              onSubmit={submitAuth}
            />
          )}

          {page === "Dashboard" && (
            <>
              <div className="welcome-banner">
                <div className="welcome-content">
                  <div className="welcome-pill"><Sparkles size={13} /> YOUR CAMPUS, CONNECTED</div>
                  <h1>Lost something?<br /><span>Let's find it together.</span></h1>
                  <p>A smarter way to reconnect lost belongings with their owners across Alliance University.</p>
                  <div className="welcome-actions">
                    <button className="primary-button" onClick={() => navigate("Report Lost")}>
                      <Search size={16} /> Report a lost item
                    </button>
                    <button className="glass-button" onClick={() => navigate("Search Items")}>
                      Browse found items <ArrowUpRight size={15} />
                    </button>
                  </div>
                </div>
                <div className="hero-art">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="hero-circle"><MapPin size={60} /></div>
                  <div className="floating-tag tag-top"><Sparkles size={14} /> Smart matching</div>
                  <div className="floating-tag tag-bottom"><CheckCircle2 size={14} /> Campus community</div>
                </div>
                <span className="hero-decoration">CAMPUSFIND / 001</span>
              </div>

              <div className="section-heading">
                <div><h2>Your campus at a glance</h2><p>Here’s what’s happening in your community.</p></div>
                <span className="live-label"><span className="live-dot" /> Live overview</span>
              </div>

              <div className="stats-grid">
                <StatCard title="Total reports" value={items.length} description="Reports from the campus" icon={ClipboardList} color="blue" />
                <StatCard title="Lost items" value={items.filter((i) => i.status === "Lost").length} description="Waiting to be found" icon={Search} color="orange" />
                <StatCard title="Found items" value={items.filter((i) => i.status === "Found").length} description="Ready to be claimed" icon={Package} color="green" />
                <StatCard title="Smart matching" value="AI" description="Matching preview" icon={BrainCircuit} color="purple" />
              </div>

              <div className="dashboard-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div><h3>Recently reported</h3><p>Latest items around campus</p></div>
                    <button className="text-button" onClick={() => navigate("Search Items")}>View all <ArrowUpRight size={14} /></button>
                  </div>
                  {items.slice(0, 4).map((item) => <ItemRow key={item.id} item={item} />)}
                  {items.length === 0 && <p className="empty-message">No reports have been submitted yet.</p>}
                </div>

                <div className="panel quick-panel">
                  <div className="panel-heading"><div><h3>Quick actions</h3><p>What would you like to do?</p></div></div>
                  <QuickAction icon={Search} title="Search items" desc="Browse reported belongings" onClick={() => navigate("Search Items")} />
                  <QuickAction icon={FilePlus2} title="Report lost item" desc="Tell us what you lost" onClick={() => navigate("Report Lost")} />
                  <QuickAction icon={BrainCircuit} title="AI item matcher" desc="Explore matching features" onClick={() => navigate("AI Matcher")} />
                  <QuickAction icon={MapPin} title="Campus map" desc="Explore common locations" onClick={() => navigate("Campus Map")} />
                </div>
              </div>
            </>
          )}

          {(page === "Report Lost" || page === "Report Found") && (
            <ReportForm page={page} busy={busy} onSubmit={saveReport} />
          )}

          {page === "Search Items" && (
            <>
              <PageHeading title="Search items" description="Find lost and found belongings reported around campus." />
              <div className="search-box"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by item, category or location..." /></div>
              <div className="item-grid">
                {filteredItems.map((item) => <ItemCard key={item.id} item={item} />)}
                {filteredItems.length === 0 && <p>No matching items. Try another search.</p>}
              </div>
            </>
          )}

          {page === "My Reports" && (
            <>
              <PageHeading title="My reports" description="Review reports submitted by your account." />
              <div className="panel">
                {myItems.map((item) => <ItemRow key={item.id} item={item} />)}
                {myItems.length === 0 && <p className="empty-message">You have not submitted any reports yet.</p>}
              </div>
            </>
          )}

          {page === "AI Matcher" && <InfoPage icon={BrainCircuit} title="AI item matcher" text="Search item descriptions now. CLIP/SigLIP image similarity and semantic NLP matching can be connected in a later backend stage." />}
          {page === "Campus Map" && <InfoPage icon={MapPin} title="Campus map" text="This page will show common lost-item locations around the Alliance University campus. A verified map can be connected later." />}
          {page === "Notifications" && <InfoPage icon={Bell} title="Notifications" text="Your claim updates and possible item matches will appear here once backend notifications are connected." />}
          {page === "Contact" && <ContactPage />}
        </section>

        <footer className="footer">
          <span>© 2026 CampusFind · Alliance University</span>
          <span><span className="live-dot" /> Campus community portal</span>
        </footer>
      </main>
    </div>
  );
}

function StatCard({ title, value, description, icon: Icon, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}><Icon size={19} /></div>
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{description}</p>
    </div>
  );
}

function AuthPage({ mode, busy, onModeChange, onSubmit }) {
  const registering = mode === "register";

  return (
    <>
      <PageHeading
        title={registering ? "Create your account" : "Sign in"}
        description={
          registering
            ? "Create an account to submit and manage your reports."
            : "Sign in to submit reports and view your own submissions."
        }
      />
      <form className="form-panel auth-panel" onSubmit={onSubmit}>
        {registering && (
          <label>
            Full name *
            <input name="name" required maxLength="100" autoComplete="name" />
          </label>
        )}
        <label>
          Email address *
          <input
            name="email"
            type="email"
            required
            maxLength="254"
            autoComplete="email"
          />
        </label>
        <label>
          Password *
          <input
            name="password"
            type="password"
            required
            minLength="8"
            autoComplete={registering ? "new-password" : "current-password"}
          />
        </label>
        <div className="form-footer auth-actions">
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Please wait…" : registering ? "Create account" : "Sign in"}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onModeChange(registering ? "login" : "register")}
          >
            {registering ? "I already have an account" : "Create an account"}
          </button>
        </div>
      </form>
    </>
  );
}

function ItemRow({ item }) {
  return (
    <div className="item-row">
      <div className="item-emoji">{item.icon}</div>
      <div className="item-info">
        <strong>{item.name}</strong>
        <small><MapPin size={12} /> {item.location}</small>
      </div>
      <span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span>
      <span className="item-date">{item.date}</span>
    </div>
  );
}

function QuickAction({ icon: Icon, title, desc, onClick }) {
  return (
    <button className="quick-action" onClick={onClick}>
      <span className="quick-icon"><Icon size={18} /></span>
      <span className="quick-copy"><strong>{title}</strong><small>{desc}</small></span>
      <ChevronRight size={17} />
    </button>
  );
}

function PageHeading({ title, description }) {
  return (
    <div className="page-heading">
      <p className="eyebrow">CAMPUSFIND / STUDENT PORTAL</p>
      <h1>{title}</h1>
      <p className="page-description">{description}</p>
    </div>
  );
}

function ReportForm({ page, busy, onSubmit }) {
  const status = page === "Report Lost" ? "Lost" : "Found";
  const today = new Date();
  const localToday = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 10);
  return (
    <>
      <PageHeading title={page} description="Share the details below to help reconnect belongings with their owners." />
      <form className="form-panel" onSubmit={(event) => onSubmit(event, status)}>
        <h3>{status} item details</h3>
        <div className="form-grid">
          <label>Item name *<input name="name" required placeholder="e.g. Black laptop bag" /></label>
          <label>Category *<select name="category"><option>Electronics</option><option>Accessories</option><option>Personal Items</option><option>Stationery</option><option>Documents</option><option>Other</option></select></label>
          <label>Location *<input name="location" required placeholder="e.g. Library, Block A" /></label>
          <label>Date *<input name="date" type="date" required defaultValue={localToday} /></label>
        </div>
        <label>Description *<textarea name="description" required maxLength="1500" rows="4" placeholder="Color, brand, or distinctive features..." /></label>
        <div className="form-footer"><button className="primary-button" type="submit" disabled={busy}><FilePlus2 size={16} /> {busy ? "Submitting…" : "Submit report"}</button></div>
      </form>
    </>
  );
}

function ItemCard({ item }) {
  return (
    <article className="item-card">
      <div className="item-card-art"><span>{item.icon}</span><span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span></div>
      <div className="item-card-body">
        <small>{item.category}</small><h3>{item.name}</h3><p><MapPin size={13} /> {item.location}</p>
        <span className="item-date">{item.date}</span>
      </div>
    </article>
  );
}

function InfoPage({ icon: Icon, title, text }) {
  return (
    <>
      <PageHeading title={title} description="Explore campus tools and smart features." />
      <div className="info-panel"><div className="info-icon"><Icon size={30} /></div><h2>{title}</h2><p>{text}</p></div>
    </>
  );
}

function ContactPage() {
  const [sent, setSent] = useState(false);
  return (
    <>
      <PageHeading title="Contact support" description="Send a message about the portal or an item report." />
      <form className="form-panel contact-form" onSubmit={(event) => { event.preventDefault(); setSent(true); }}>
        <label>Your name<input required placeholder="Your name" /></label>
        <label>Email address<input required type="email" placeholder="you@example.com" /></label>
        <label>Message<textarea required rows="4" placeholder="How can we help?" /></label>
        <button className="primary-button" type="submit"><MessageCircle size={16} /> Send message</button>
        {sent && <p className="success-message">Message recorded in this demo.</p>}
      </form>
    </>
  );
}

export default App;
