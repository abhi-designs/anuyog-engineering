/* Shared helpers + data layer. Reads the catalogue from Supabase; if Supabase is not
   configured yet (or unreachable) it falls back to assets/catalogue.json so the site never breaks. */
const A = window.ANUYOG;
export const CO = A.company, CFG = A;

export const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const money = n => n == null ? "On request" : "₹ " + Number(n).toLocaleString("en-IN");
export const digits = s => String(s).replace(/\D/g, "");

let _db;
export async function getDb() {
  if (_db !== undefined) return _db;
  const { url, anonKey } = A.supabase || {};
  if (!url || !anonKey || /YOUR/i.test(url + anonKey)) return (_db = null);
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm");
    // Public pages keep no session, no cookies, no local storage. Only the admin page does.
    const admin = document.body.dataset.page === "admin";
    _db = createClient(url, anonKey, { auth: { persistSession: admin, autoRefreshToken: admin, detectSessionInUrl: false } });
  } catch (e) { console.warn("Supabase unavailable, using local catalogue", e); _db = null; }
  return _db;
}

let _cat;
export async function loadCatalogue() {
  if (_cat) return _cat;
  const db = await getDb();
  if (db) {
    const [c, p] = await Promise.all([
      db.from("categories").select("*").order("sort"),
      db.from("products").select("*").eq("published", true).order("sort")
    ]);
    if (!c.error && !p.error && (p.data.length || c.data.length)) return (_cat = { cats: c.data, prods: p.data, live: true });
  }
  const j = await (await fetch("assets/catalogue.json")).json();
  return (_cat = { ...j, live: false });
}
