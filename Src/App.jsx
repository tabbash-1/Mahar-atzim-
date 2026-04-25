import { useState, useEffect } from "react";

const SUPABASE_URL = "https://brddbduyetctvlznllou.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGRiZHV5ZXRjdHZsem5sbG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDA3NTgsImV4cCI6MjA5MjUxNjc1OH0.q9djSSCBI7WmlWeCfyMubd_kQrnpPAcOwkQD07En7Iw";

const db = {
  async get(table, filters = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
    Object.entries(filters).forEach(([k, v]) => { url += `&${k}=eq.${v}`; });
    const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    return r.json();
  },
  async insert(table, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    return r.json();
  },
  async update(table, id, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    return r.json();
  },
  async delete(table, id) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
  },
};

const emptyForm = { name: "", category: "", cost_price: "", sell_price: "", quantity: "", unit: "יח'", min_stock: "", image: "" };
const UNITS = ["יח'", "מ'", "מ\"ר", "לוח", "שק", "טון", "דלי", "ק\"ג", "ליטר"];
const EMOJI_OPTIONS = ["📦","🔧","🪚","🔨","🪛","🔑","🧲","🪝","🗜️","🧰","🪣","🪜","🏗️","🏠","💡","🪟","🚪","🛠️","⚡","🧴","🔩","🎨","🧱","⚙️","🪵","🔲"];

const profit = (p) => (p.sell_price || 0) - (p.cost_price || 0);
const margin = (p) => p.sell_price > 0 ? Math.round(((p.sell_price - p.cost_price) / p.sell_price) * 100) : 0;

const CATEGORY_IMAGES = {
  "עצים": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&h=80&fit=crop",
  "רעפים": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=80&h=80&fit=crop",
  "פנילים": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=80&h=80&fit=crop",
  "ברגים": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=80&h=80&fit=crop",
  "חומרי בניה": "https://images.unsplash.com/photo-1590666027016-03ee0d8e9e2c?w=80&h=80&fit=crop",
  "צבעים": "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=80&h=80&fit=crop",
  "ברזול": "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=80&h=80&fit=crop",
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "", error: "" });
  const [loginLoading, setLoginLoading] = useState(false);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("הכל");
  const [view, setView] = useState("inventory");
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📦");
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  };

  // ── LOAD DATA ────────────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([db.get("categories"), db.get("products")]);
      setCategories(Array.isArray(cats) ? cats : []);
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (e) {
      showToast("שגיאה בטעינת נתונים", "error");
    }
    setLoading(false);
  };

  useEffect(() => { if (currentUser) loadData(); }, [currentUser]);

  // ── LOGIN ────────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) {
      setLoginForm(f => ({ ...f, error: "יש למלא שם משתמש וסיסמה" })); return;
    }
    setLoginLoading(true);
    try {
      const users = await db.get("users", { username: loginForm.username.trim() });
      const user = Array.isArray(users) && users.find(u => u.password === loginForm.password);
      if (user) {
        setCurrentUser(user);
        setLoginForm({ username: "", password: "", error: "" });
      } else {
        setLoginForm(f => ({ ...f, error: "שם משתמש או סיסמה שגויים" }));
      }
    } catch {
      setLoginForm(f => ({ ...f, error: "שגיאת חיבור לשרת" }));
    }
    setLoginLoading(false);
  };

  const handleLogout = () => { setCurrentUser(null); setShowUserMenu(false); setView("inventory"); };

  // ── PRODUCTS ─────────────────────────────────────────────────────────────────
  const getCatIcon = (name) => categories.find(c => c.name === name)?.icon || "📦";
  const getProductImage = (p) => p.image || CATEGORY_IMAGES[p.category] || "";

  const filtered = products
    .filter(p => activeCategory === "הכל" || p.category === activeCategory)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "he");
      if (sortBy === "sell_price") return b.sell_price - a.sell_price;
      if (sortBy === "quantity") return b.quantity - a.quantity;
      if (sortBy === "margin") return margin(b) - margin(a);
      return 0;
    });

  const lowStock = products.filter(p => p.quantity <= p.min_stock);
  const totalSell = products.reduce((s, p) => s + (p.sell_price || 0) * (p.quantity || 0), 0);
  const totalCost = products.reduce((s, p) => s + (p.cost_price || 0) * (p.quantity || 0), 0);

  const handleSave = async () => {
    if (!form.name || !form.sell_price || !form.quantity) {
      showToast("יש למלא את כל שדות החובה", "error"); return;
    }
    setSaving(true);
    const data = {
      name: form.name, category: form.category || categories[0]?.name || "",
      cost_price: +form.cost_price || 0, sell_price: +form.sell_price,
      quantity: +form.quantity, unit: form.unit, min_stock: +form.min_stock || 0,
      image: imagePreview || form.image || "",
    };
    try {
      if (editingProduct) {
        await db.update("products", editingProduct.id, data);
        showToast("המוצר עודכן בהצלחה ✓");
      } else {
        await db.insert("products", data);
        showToast("המוצר נוסף בהצלחה ✓");
      }
      await loadData();
      resetForm();
    } catch {
      showToast("שגיאה בשמירה", "error");
    }
    setSaving(false);
  };

  const resetForm = () => {
    setView("inventory"); setEditingProduct(null);
    setImagePreview(""); setForm(emptyForm);
  };

  const handleEdit = (p) => {
    setEditingProduct(p);
    setImagePreview(p.image || "");
    setForm({ name: p.name, category: p.category, cost_price: p.cost_price, sell_price: p.sell_price, quantity: p.quantity, unit: p.unit, min_stock: p.min_stock, image: p.image || "" });
    setView("edit");
  };

  const handleDelete = async (id) => {
    await db.delete("products", id);
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast("המוצר נמחק");
  };

  const handleQtyChange = async (id, delta) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const newQty = Math.max(0, p.quantity + delta);
    setProducts(prev => prev.map(x => x.id === id ? { ...x, quantity: newQty } : x));
    await db.update("products", id, { quantity: newQty });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    if (categories.find(c => c.name === name)) { showToast("הקטגוריה כבר קיימת", "error"); return; }
    try {
      await db.insert("categories", { name, icon: newCatIcon });
      await loadData();
      showToast(`הקטגוריה "${name}" נוספה ✓`);
      setNewCatName(""); setNewCatIcon("📦"); setShowAddCategory(false);
    } catch { showToast("שגיאה בהוספת קטגוריה", "error"); }
  };

  // ─── CSS ──────────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;600;700;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#13151e}::-webkit-scrollbar-thumb{background:#c9a227;border-radius:3px}
    input,select{outline:none;font-family:inherit}
    .card{background:#191c28;border:1px solid #252838;border-radius:14px}
    .btn-primary{background:linear-gradient(135deg,#c9a227,#e8c547);color:#0d0f18;border:none;border-radius:9px;padding:10px 22px;font-family:inherit;font-weight:800;font-size:14px;cursor:pointer;transition:all .2s}
    .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(201,162,39,.4)}
    .btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
    .btn-ghost{background:transparent;border:1px solid #252838;color:#8a8694;border-radius:9px;padding:8px 16px;font-family:inherit;font-size:13px;cursor:pointer;transition:all .2s}
    .btn-ghost:hover{border-color:#c9a227;color:#c9a227}
    .btn-danger{background:transparent;border:1px solid rgba(239,68,68,.3);color:#f87171;border-radius:9px;padding:5px 12px;font-family:inherit;font-size:12px;cursor:pointer;transition:all .2s}
    .btn-danger:hover{background:rgba(239,68,68,.08)}
    .input-field{background:#10121a;border:1px solid #252838;border-radius:9px;padding:10px 14px;color:#e8e4dc;font-size:14px;width:100%;transition:border-color .2s}
    .input-field:focus{border-color:#c9a227}
    .tag{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
    .low-badge{background:rgba(239,68,68,.12);color:#f87171;border:1px solid rgba(239,68,68,.28)}
    .ok-badge{background:rgba(34,197,94,.1);color:#4ade80;border:1px solid rgba(34,197,94,.22)}
    .qty-btn{width:30px;height:30px;border-radius:7px;border:1px solid #252838;background:#10121a;color:#c9a227;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
    .qty-btn:hover{background:rgba(201,162,39,.08);border-color:#c9a227}
    .product-row{border-bottom:1px solid #1c1f2e;transition:background .15s}
    .product-row:last-child{border-bottom:none}
    .product-row:hover{background:rgba(201,162,39,.025)}
    .cat-tab{padding:8px 15px;border-radius:9px;cursor:pointer;font-size:13px;font-weight:700;border:none;font-family:inherit;transition:all .2s;white-space:nowrap}
    .cat-tab.active{background:rgba(201,162,39,.15);color:#c9a227;border:1px solid rgba(201,162,39,.3)}
    .cat-tab:not(.active){background:#13151e;color:#8a8694;border:1px solid #1c1f2e}
    .cat-tab:not(.active):hover{color:#e8e4dc;border-color:#252838}
    .toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);padding:12px 28px;border-radius:12px;font-size:14px;font-weight:700;z-index:9999;animation:slideUp .3s ease;box-shadow:0 8px 30px rgba(0,0,0,.5);white-space:nowrap}
    @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
    .product-img{width:46px;height:46px;border-radius:9px;object-fit:cover;border:1px solid #252838;flex-shrink:0}
    .product-img-placeholder{width:46px;height:46px;border-radius:9px;background:linear-gradient(135deg,#1a1d2a,#252838);border:1px solid #252838;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
    .upload-area{border:2px dashed #252838;border-radius:10px;padding:22px;text-align:center;cursor:pointer;transition:border-color .2s;display:block}
    .upload-area:hover{border-color:#c9a227}
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px}
    .modal{background:#191c28;border:1px solid #252838;border-radius:16px;padding:26px;width:100%;max-width:390px}
    .emoji-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:10px;max-height:160px;overflow-y:auto}
    .emoji-opt{width:36px;height:36px;border-radius:8px;border:1px solid #252838;background:#10121a;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:all .15s}
    .emoji-opt:hover,.emoji-opt.selected{border-color:#c9a227;background:rgba(201,162,39,.1)}
    .spinner{width:20px;height:20px;border:2px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .user-menu{position:absolute;top:54px;left:0;background:#191c28;border:1px solid #252838;border-radius:12px;padding:8px;min-width:190px;z-index:150;box-shadow:0 8px 30px rgba(0,0,0,.5)}
    .user-menu-item{padding:9px 14px;border-radius:8px;cursor:pointer;font-size:13px;color:#8a8694;transition:all .15s}
    .user-menu-item:hover{background:rgba(201,162,39,.08);color:#e8e4dc}
    .role-admin{background:rgba(201,162,39,.15);color:#c9a227;border:1px solid rgba(201,162,39,.3)}
    .role-worker{background:rgba(99,102,241,.12);color:#818cf8;border:1px solid rgba(99,102,241,.25)}
    .shimmer{background:linear-gradient(90deg,#191c28 25%,#1e2130 50%,#191c28 75%);background-size:200% 100%;animation:shimmer 1.4s infinite}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  `;

  // ─── LOGIN ────────────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div style={{ direction:"rtl", minHeight:"100vh", background:"#0d0f18", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Heebo','Segoe UI',sans-serif", padding:16 }}>
        <style>{css}</style>
        <div style={{ width:"100%", maxWidth:400 }}>
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <div style={{ width:72, height:72, background:"linear-gradient(135deg,#c9a227,#e8c547)", borderRadius:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:40, margin:"0 auto 14px" }}>🪵</div>
            <div style={{ fontWeight:900, fontSize:24, color:"#e8e4dc" }}>מחסן עצים וחומרי בניה</div>
            <div style={{ fontSize:13, color:"#8a8694", marginTop:6 }}>כניסה למערכת ניהול המלאי</div>
          </div>
          <div className="card" style={{ padding:28 }}>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, color:"#8a8694", marginBottom:6, display:"block", fontWeight:700 }}>שם משתמש</label>
              <input className="input-field" placeholder="הזן שם משתמש" value={loginForm.username}
                onChange={e => setLoginForm(f => ({ ...f, username: e.target.value, error: "" }))}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, color:"#8a8694", marginBottom:6, display:"block", fontWeight:700 }}>סיסמה</label>
              <input className="input-field" type="password" placeholder="הזן סיסמה" value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value, error: "" }))}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            {loginForm.error && (
              <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", borderRadius:8, padding:"10px 14px", color:"#f87171", fontSize:13, marginBottom:16, textAlign:"center" }}>
                ⚠ {loginForm.error}
              </div>
            )}
            <button className="btn-primary" style={{ width:"100%", padding:14, fontSize:15 }} onClick={handleLogin} disabled={loginLoading}>
              {loginLoading ? <span className="spinner" /> : "כניסה למערכת"}
            </button>
            <div style={{ marginTop:18, padding:14, background:"#10121a", borderRadius:10, fontSize:12 }}>
              <div style={{ color:"#8a8694", marginBottom:8, fontWeight:700 }}>משתמשים:</div>
              <div style={{ color:"#555", lineHeight:1.8 }}>
                מנהל / admin123 → <span className="tag role-admin">מנהל</span><br/>
                יוסי / yosi123 → <span className="tag role-worker">עובד</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN APP ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ direction:"rtl", minHeight:"100vh", background:"#0d0f18", color:"#e8e4dc", fontFamily:"'Heebo','Segoe UI',sans-serif" }} onClick={() => setShowUserMenu(false)}>
      <style>{css}</style>

      {/* HEADER */}
      <div style={{ background:"#11131d", borderBottom:"1px solid #1e2130", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, background:"linear-gradient(135deg,#c9a227,#e8c547)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🪵</div>
          <div>
            <div style={{ fontWeight:900, fontSize:16 }}>מחסן עצים וחומרי בניה</div>
            <div style={{ fontSize:11, color:"#8a8694" }}>ניהול מלאי • מחובר לענן ☁️</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {view === "inventory" && isAdmin && (
            <>
              <button className="btn-ghost" style={{ fontSize:12, padding:"7px 14px" }} onClick={e => { e.stopPropagation(); setShowAddCategory(true); }}>+ קטגוריה</button>
              <button className="btn-primary" onClick={() => { setEditingProduct(null); setImagePreview(""); setForm({ ...emptyForm, category: categories[0]?.name || "" }); setView("add"); }}>+ הוסף מוצר</button>
            </>
          )}
          {view !== "inventory" && <button className="btn-ghost" onClick={resetForm}>→ חזרה</button>}
          <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowUserMenu(v => !v)} style={{ display:"flex", alignItems:"center", gap:8, background:"#191c28", border:"1px solid #252838", borderRadius:10, padding:"7px 12px", cursor:"pointer", color:"#e8e4dc", fontFamily:"inherit", fontSize:13, fontWeight:700 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#818cf8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:"#fff" }}>
                {currentUser.display_name?.[0]}
              </div>
              <span style={{ display:"none" }}>{currentUser.display_name}</span>
              <span className={`tag ${isAdmin ? "role-admin" : "role-worker"}`} style={{ fontSize:10 }}>{isAdmin ? "מנהל" : "עובד"}</span>
              <span style={{ color:"#8a8694", fontSize:10 }}>▼</span>
            </button>
            {showUserMenu && (
              <div className="user-menu">
                <div style={{ padding:"8px 14px 10px", borderBottom:"1px solid #252838", marginBottom:4 }}>
                  <div style={{ fontWeight:800, fontSize:13 }}>{currentUser.display_name}</div>
                  <div style={{ fontSize:11, color:"#8a8694" }}>{isAdmin ? "🔐 הרשאות מנהל" : "👷 עובד"}</div>
                </div>
                <div className="user-menu-item" onClick={handleLogout}>🚪 יציאה מהמערכת</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1060, margin:"0 auto", padding:"22px 16px" }}>

        {/* LOADING */}
        {loading && (
          <div style={{ display:"grid", gap:12 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="shimmer" style={{ height:60, borderRadius:12 }} />
            ))}
          </div>
        )}

        {/* INVENTORY */}
        {!loading && view === "inventory" && (
          <>
            {/* STATS */}
            <div style={{ display:"grid", gridTemplateColumns: isAdmin ? "repeat(4,1fr)" : "repeat(2,1fr)", gap:12, marginBottom:20 }}>
              {[
                { label:'סה"כ מוצרים', value: products.length, icon:"📦", color:"#6366f1" },
                { label:"שווי מכירה", value:"₪"+totalSell.toLocaleString("he-IL"), icon:"💰", color:"#c9a227" },
                ...(isAdmin ? [
                  { label:"רווח גולמי", value:"₪"+(totalSell-totalCost).toLocaleString("he-IL"), icon:"📈", color:"#4ade80" },
                ] : []),
                { label:"מלאי נמוך", value:lowStock.length+" פריטים", icon:"⚠️", color:"#ef4444" },
              ].map((s, i) => (
                <div key={i} className="card" style={{ padding:"18px 20px", borderRight:`3px solid ${s.color}` }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
                  <div style={{ fontSize:20, fontWeight:900, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:12, color:"#8a8694", marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* LOW STOCK */}
            {lowStock.length > 0 && (
              <div style={{ background:"rgba(239,68,68,.07)", border:"1px solid rgba(239,68,68,.22)", borderRadius:10, padding:"12px 16px", marginBottom:18, display:"flex", gap:10 }}>
                <span style={{ fontSize:18 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight:800, color:"#f87171", fontSize:13 }}>התראה: מלאי נמוך</div>
                  <div style={{ fontSize:12, color:"#8a8694", marginTop:3 }}>{lowStock.map(p => p.name).join(" • ")}</div>
                </div>
              </div>
            )}

            {/* SEARCH + SORT */}
            <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
              <input className="input-field" placeholder="🔍 חיפוש מוצר..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex:1, minWidth:160 }} />
              <select className="input-field" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width:"auto", minWidth:150 }}>
                <option value="name">מיון: שם</option>
                <option value="sell_price">מיון: מחיר מכירה</option>
                <option value="quantity">מיון: כמות</option>
                {isAdmin && <option value="margin">מיון: % רווח</option>}
              </select>
            </div>

            {/* CATEGORY TABS */}
            <div style={{ display:"flex", gap:8, marginBottom:20, overflowX:"auto", paddingBottom:4 }}>
              {["הכל", ...categories.map(c => c.name)].map(c => (
                <button key={c} className={`cat-tab ${activeCategory === c ? "active" : ""}`} onClick={() => setActiveCategory(c)}>
                  {c === "הכל" ? "🔍 " : getCatIcon(c) + " "}{c}
                </button>
              ))}
            </div>

            {/* TABLE */}
            <div className="card" style={{ overflow:"hidden" }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr style={{ background:"#10121a", color:"#8a8694", fontSize:12 }}>
                      <th style={{ padding:"12px 16px", textAlign:"right", fontWeight:700 }}>מוצר</th>
                      <th style={{ padding:"12px 16px", textAlign:"right", fontWeight:700 }}>קטגוריה</th>
                      {isAdmin && <th style={{ padding:"12px 16px", textAlign:"right", fontWeight:700, color:"rgba(248,113,113,.7)" }}>עלות 🔐</th>}
                      <th style={{ padding:"12px 16px", textAlign:"right", fontWeight:700 }}>מחיר מכירה</th>
                      {isAdmin && <th style={{ padding:"12px 16px", textAlign:"right", fontWeight:700, color:"rgba(74,222,128,.7)" }}>רווח 🔐</th>}
                      <th style={{ padding:"12px 16px", textAlign:"right", fontWeight:700 }}>כמות</th>
                      <th style={{ padding:"12px 16px", textAlign:"right", fontWeight:700 }}>סטטוס</th>
                      {isAdmin && <th style={{ padding:"12px 16px", textAlign:"right", fontWeight:700 }}>פעולות</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={isAdmin ? 8 : 5} style={{ textAlign:"center", padding:44, color:"#8a8694" }}>לא נמצאו מוצרים</td></tr>
                    )}
                    {filtered.map(p => {
                      const isLow = p.quantity <= p.min_stock;
                      const img = getProductImage(p);
                      const pct = margin(p);
                      const profitColor = pct >= 30 ? "#4ade80" : pct >= 15 ? "#facc15" : "#f87171";
                      return (
                        <tr key={p.id} className="product-row">
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                              {img
                                ? <img src={img} alt={p.name} className="product-img" onError={e => { e.target.style.display = "none"; }} />
                                : <div className="product-img-placeholder">{getCatIcon(p.category)}</div>}
                              <span style={{ fontWeight:700 }}>{p.name}</span>
                            </div>
                          </td>
                          <td style={{ padding:"12px 16px" }}>
                            <span className="tag" style={{ background:"#13151e", color:"#c9a227", border:"1px solid #252838" }}>
                              {getCatIcon(p.category)} {p.category}
                            </span>
                          </td>
                          {isAdmin && (
                            <td style={{ padding:"12px 16px", color:"#f87171", fontWeight:700, whiteSpace:"nowrap" }}>
                              ₪{(p.cost_price || 0).toLocaleString("he-IL")}
                            </td>
                          )}
                          <td style={{ padding:"12px 16px", color:"#c9a227", fontWeight:800, whiteSpace:"nowrap" }}>
                            ₪{(p.sell_price || 0).toLocaleString("he-IL")}
                            <span style={{ color:"#8a8694", fontWeight:400, fontSize:11 }}> / {p.unit}</span>
                          </td>
                          {isAdmin && (
                            <td style={{ padding:"12px 16px", whiteSpace:"nowrap" }}>
                              <span style={{ fontWeight:800, color:profitColor }}>₪{profit(p).toLocaleString("he-IL")}</span>
                              <span style={{ color:"#8a8694", fontSize:11, marginRight:4 }}>({pct}%)</span>
                            </td>
                          )}
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                              <button className="qty-btn" onClick={() => handleQtyChange(p.id, -1)}>−</button>
                              <span style={{ minWidth:44, textAlign:"center", fontWeight:800, fontSize:15 }}>{(p.quantity || 0).toLocaleString("he-IL")}</span>
                              <button className="qty-btn" onClick={() => handleQtyChange(p.id, 1)}>+</button>
                            </div>
                          </td>
                          <td style={{ padding:"12px 16px" }}>
                            <span className={`tag ${isLow ? "low-badge" : "ok-badge"}`}>{isLow ? "⚠ נמוך" : "✓ זמין"}</span>
                          </td>
                          {isAdmin && (
                            <td style={{ padding:"12px 16px" }}>
                              <div style={{ display:"flex", gap:6 }}>
                                <button className="btn-ghost" style={{ padding:"5px 12px", fontSize:12 }} onClick={() => handleEdit(p)}>עריכה</button>
                                <button className="btn-danger" onClick={() => handleDelete(p.id)}>מחק</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ textAlign:"center", color:"#8a8694", fontSize:12, marginTop:14 }}>
              מציג {filtered.length} מתוך {products.length} מוצרים
            </div>
          </>
        )}

        {/* ADD / EDIT FORM */}
        {!loading && (view === "add" || view === "edit") && isAdmin && (
          <div className="card" style={{ padding:28, maxWidth:580, margin:"0 auto" }}>
            <h2 style={{ fontWeight:900, fontSize:20, marginBottom:24, color:"#c9a227" }}>
              {view === "add" ? "➕ הוספת מוצר חדש" : "✏️ עריכת מוצר"}
            </h2>

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, color:"#8a8694", marginBottom:8, display:"block", fontWeight:700 }}>תמונת מוצר</label>
              {imagePreview ? (
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <img src={imagePreview} alt="preview" style={{ width:90, height:90, borderRadius:12, objectFit:"cover", border:"2px solid #c9a227" }} />
                  <button className="btn-danger" onClick={() => setImagePreview("")}>הסר תמונה</button>
                </div>
              ) : (
                <label className="upload-area">
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display:"none" }} />
                  <div style={{ fontSize:32, marginBottom:8 }}>📷</div>
                  <div style={{ fontSize:13, color:"#8a8694" }}>לחץ להעלאת תמונה</div>
                  <div style={{ fontSize:11, color:"#555", marginTop:4 }}>JPG, PNG, WEBP</div>
                </label>
              )}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:15 }}>
              <div>
                <label style={{ fontSize:12, color:"#8a8694", marginBottom:6, display:"block", fontWeight:700 }}>שם המוצר *</label>
                <input className="input-field" placeholder="לדוגמה: עץ אורן 2×4" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ fontSize:12, color:"#f87171", marginBottom:6, display:"block", fontWeight:700 }}>🔐 מחיר עלות (₪)</label>
                  <input className="input-field" type="number" placeholder="0.00" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#c9a227", marginBottom:6, display:"block", fontWeight:700 }}>מחיר מכירה (₪) *</label>
                  <input className="input-field" type="number" placeholder="0.00" value={form.sell_price} onChange={e => setForm(f => ({ ...f, sell_price: e.target.value }))} />
                </div>
              </div>

              {form.cost_price && form.sell_price && +form.sell_price > 0 && (
                <div style={{ background:"rgba(74,222,128,.07)", border:"1px solid rgba(74,222,128,.2)", borderRadius:10, padding:"12px 16px", display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:13, color:"#8a8694" }}>רווח למוצר:</span>
                  <span style={{ fontWeight:800, color:"#4ade80" }}>
                    ₪{(+form.sell_price - +form.cost_price).toFixed(2)} ({Math.round(((+form.sell_price - +form.cost_price) / +form.sell_price) * 100)}%)
                  </span>
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ fontSize:12, color:"#8a8694", marginBottom:6, display:"block", fontWeight:700 }}>כמות *</label>
                  <input className="input-field" type="number" placeholder="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#8a8694", marginBottom:6, display:"block", fontWeight:700 }}>מינימום מלאי</label>
                  <input className="input-field" type="number" placeholder="0" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} />
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ fontSize:12, color:"#8a8694", marginBottom:6, display:"block", fontWeight:700 }}>קטגוריה</label>
                  <select className="input-field" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#8a8694", marginBottom:6, display:"block", fontWeight:700 }}>יחידת מידה</label>
                  <select className="input-field" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display:"flex", gap:10, marginTop:6 }}>
                <button className="btn-primary" style={{ flex:1, padding:13 }} onClick={handleSave} disabled={saving}>
                  {saving ? <span className="spinner" /> : view === "add" ? "שמור מוצר" : "עדכן מוצר"}
                </button>
                <button className="btn-ghost" style={{ flex:1, padding:13 }} onClick={resetForm}>ביטול</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD CATEGORY MODAL */}
      {showAddCategory && (
        <div className="modal-overlay" onClick={() => setShowAddCategory(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight:900, fontSize:18, marginBottom:20, color:"#c9a227" }}>➕ קטגוריה חדשה</h3>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:"#8a8694", marginBottom:6, display:"block", fontWeight:700 }}>שם הקטגוריה *</label>
              <input className="input-field" placeholder="לדוגמה: כלים" value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddCategory()} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, color:"#8a8694", marginBottom:4, display:"block", fontWeight:700 }}>אייקון נבחר: {newCatIcon}</label>
              <div className="emoji-grid">
                {EMOJI_OPTIONS.map(em => (
                  <button key={em} className={`emoji-opt ${newCatIcon === em ? "selected" : ""}`} onClick={() => setNewCatIcon(em)}>{em}</button>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-primary" style={{ flex:1 }} onClick={handleAddCategory}>הוסף קטגוריה</button>
              <button className="btn-ghost" style={{ flex:1 }} onClick={() => setShowAddCategory(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" style={{ background: toast.type === "error" ? "#ef4444" : "#22c55e", color:"#fff" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
