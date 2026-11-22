/* Admin: real login via Supabase Auth. There is no password in this file — access is decided
   by the database (admins table + Row Level Security), so a visitor reading this code gets nothing. */
import { CO, esc, money, digits, getDb } from "./core.js";

const root = document.getElementById("root");
const $ = (s, r = root) => r.querySelector(s);
const msg = (t, err) => `<div class="msg${err ? " err" : ""}">${esc(t)}</div>`;
const db = await getDb();

if (!db) root.innerHTML = `<h1>Admin</h1>${msg("Supabase isn't connected yet. Put your project URL and anon key in assets/config.js (see README step 3).", true)}`;
else boot();

async function isAdmin() { const { data } = await db.rpc("is_admin"); return data === true; }

async function boot() {
  const { data: { session } } = await db.auth.getSession();
  if (session && await isAdmin()) return app();
  login(session ? "That account is signed in but is not on the admin list." : "");
  if (session) await db.auth.signOut();
}

function login(note) {
  root.innerHTML = `<div style="max-width:400px;margin:8vh auto 0"><h1 style="font-size:2rem">Staff sign-in</h1>
    <p class="muted" style="margin:6px 0 20px">${esc(CO.name)} admin</p>${note ? msg(note, true) : ""}
    <form id="lf"><div class="field"><label for="em">Email</label><input id="em" type="email" required autocomplete="username"></div>
    <div class="field"><label for="pw">Password</label><input id="pw" type="password" required autocomplete="current-password"></div>
    <button class="btn brass wide">Sign in</button></form><p id="le"></p></div>`;
  $("#lf").onsubmit = async e => {
    e.preventDefault();
    const { error } = await db.auth.signInWithPassword({ email: $("#em").value.trim(), password: $("#pw").value });
    if (error) return $("#le").innerHTML = msg("Wrong email or password.", true);
    if (await isAdmin()) app(); else { await db.auth.signOut(); login("That account is not on the admin list."); }
  };
}

function app() {
  root.innerHTML = `<div class="adm-bar"><h1 style="font-size:1.8rem">Admin</h1>
    <div class="acts"><a class="btn ghost sm" href="index.html">View site</a><button class="btn ghost sm" id="out">Sign out</button></div></div>
    <div class="tabs"><button data-t="inq" class="on">Inquiries</button><button data-t="prod">Products</button></div><div id="panel"></div>`;
  $("#out").onclick = async () => { await db.auth.signOut(); login(); };
  const tabs = root.querySelectorAll(".tabs button");
  tabs.forEach(b => b.onclick = () => { tabs.forEach(x => x.classList.toggle("on", x === b)); b.dataset.t === "inq" ? inquiries() : products(); });
  inquiries();
}

/* ---------- inquiries ---------- */
const STATUS = ["new", "contacted", "quoted", "won", "closed"];
async function inquiries() {
  const panel = $("#panel"); panel.innerHTML = '<p class="muted">Loading…</p>';
  const { data, error } = await db.from("inquiries").select("*").order("created_at", { ascending: false });
  if (error) return panel.innerHTML = msg(error.message, true);
  let filter = "all";
  const draw = () => {
    const list = data.filter(r => filter === "all" || r.status === filter);
    panel.innerHTML = `<div class="adm-bar"><div class="acts"><label>Show <select id="flt"><option value="all">All (${data.length})</option>${STATUS.map(s => `<option value="${s}" ${s === filter ? "selected" : ""}>${s} (${data.filter(r => r.status === s).length})</option>`).join("")}</select></label></div>
      <button class="btn ghost sm" id="csv">Export CSV</button></div>
      ${list.map(r => `<article class="icard" data-id="${r.id}"><header><span>${new Date(r.created_at).toLocaleString("en-IN")}</span><span>AN-${r.id.slice(0, 8).toUpperCase()}</span></header>
        <h3>${esc(r.item)} <small style="font-weight:400">× ${esc(r.qty || "—")}</small></h3>
        <p><strong>${esc(r.name)}</strong>${r.company ? " · " + esc(r.company) : ""}${r.city ? " · " + esc(r.city) : ""}<br>
          <a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>${r.email ? ` · <a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : ""}</p>
        ${r.message ? `<pre>${esc(r.message)}</pre>` : ""}
        <div class="acts"><select class="st">${STATUS.map(s => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}</select>
          <a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/${digits(r.phone).replace(/^0+/, "").replace(/^(\d{10})$/, "91$1")}">WhatsApp</a>
          <button class="btn ghost sm del" style="color:var(--bad)">Delete</button></div></article>`).join("") || '<p class="muted">No inquiries here.</p>'}`;
    $("#flt").onchange = e => { filter = e.target.value; draw(); };
    $("#csv").onclick = () => {
      const cols = ["created_at", "id", "item", "qty", "name", "company", "city", "phone", "email", "message", "status"];
      const csv = [cols.join(","), ...data.map(r => cols.map(c => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "anuyog-inquiries.csv"; a.click();
    };
    panel.querySelectorAll(".icard").forEach(c => {
      const id = c.dataset.id;
      c.querySelector(".st").onchange = async e => { const { error } = await db.from("inquiries").update({ status: e.target.value }).eq("id", id); if (error) return alert(error.message); data.find(r => r.id === id).status = e.target.value; };
      c.querySelector(".del").onclick = async () => {
        if (!confirm("Delete this inquiry permanently? Do this when a customer asks for erasure.")) return;
        const { error } = await db.from("inquiries").delete().eq("id", id); if (error) return alert(error.message);
        data.splice(data.findIndex(r => r.id === id), 1); draw();
      };
    });
  };
  draw();
}

/* ---------- products ---------- */
const slugify = s => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const num = s => { const n = Number(String(s || "").replace(/[^\d.]/g, "")); return s && n ? n : null; };
const lines = t => t.split("\n").map(l => l.split("|").map(s => s.trim())).filter(a => a[0]);

async function products() {
  const panel = $("#panel"); panel.innerHTML = '<p class="muted">Loading…</p>';
  const [{ data: cats }, { data: prods, error }] = await Promise.all([db.from("categories").select("*").order("sort"), db.from("products").select("*").order("sort")]);
  if (error) return panel.innerHTML = msg(error.message, true);
  panel.innerHTML = `<div class="adm-bar"><span class="muted">${prods.length} products</span><button class="btn brass sm" id="add">Add product</button></div>
    <div class="plist">${prods.map(p => `<div class="prow" data-s="${esc(p.slug)}">${p.img ? `<img src="${esc(p.img)}" alt="">` : '<span class="th"></span>'}
      <div><b>${esc(p.name)}</b><small>${esc(p.category)} · ${money(p.from_price)} ${p.published ? "" : "· hidden"}${p.featured ? " · featured" : ""}</small></div>
      <button class="btn ghost sm ed">Edit</button></div>`).join("")}</div>`;
  $("#add").onclick = () => form(null);
  panel.querySelectorAll(".ed").forEach(b => b.onclick = () => form(prods.find(p => p.slug === b.closest(".prow").dataset.s)));

  function form(p) {
    const v = p || { specs: [], variants: [], published: true, unit: "Piece" };
    panel.innerHTML = `<form id="pf" class="icard"><h2 style="font-size:1.4rem">${p ? "Edit" : "New"} product</h2>
      <div class="row2"><div class="field"><label>Name</label><input id="f-name" required maxlength="160" value="${esc(v.name)}"></div>
        <div class="field"><label>Category</label><select id="f-cat">${cats.map(c => `<option value="${esc(c.slug)}" ${c.slug === v.category ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div></div>
      <div class="row2"><div class="field"><label>Starting price (₹, blank = on request)</label><input id="f-price" inputmode="numeric" value="${v.from_price ?? ""}"></div>
        <div class="field"><label>Unit</label><input id="f-unit" value="${esc(v.unit)}"></div></div>
      <div class="field"><label>One-line summary (shown on cards)</label><input id="f-short" maxlength="300" value="${esc(v.short)}"></div>
      <div class="field"><label>Full description</label><textarea id="f-long" rows="4">${esc(v.long)}</textarea></div>
      <div class="field"><label>Specification <small>— one per line: Label | Value</small></label><textarea id="f-specs" rows="5">${esc(v.specs.map(s => s.join(" | ")).join("\n"))}</textarea></div>
      <div class="field"><label>Sizes <small>— one per line: Name | Dimensions | Price (leave price empty for “on request”)</small></label><textarea id="f-vars" rows="5">${esc(v.variants.map(x => [x.name, x.d, x.price ?? ""].join(" | ")).join("\n"))}</textarea></div>
      <div class="field"><label>Photo <small>— JPG/PNG/WebP, up to 3 MB</small></label>${v.img ? `<img src="${esc(v.img)}" alt="" style="width:120px;border-radius:10px;margin-bottom:8px">` : ""}<input id="f-file" type="file" accept="image/jpeg,image/png,image/webp"></div>
      <div class="acts" style="margin:6px 0 16px"><label><input type="checkbox" id="f-feat" ${v.featured ? "checked" : ""}> Featured on home</label><label><input type="checkbox" id="f-pub" ${v.published ? "checked" : ""}> Visible on site</label></div>
      <div class="acts"><button class="btn brass" id="save">Save</button><button type="button" class="btn ghost" id="cancel">Cancel</button>${p ? '<button type="button" class="btn ghost" id="rm" style="color:var(--bad);margin-left:auto">Delete product</button>' : ""}</div><div id="fe"></div></form>`;
    $("#cancel").onclick = products;
    if (p) $("#rm").onclick = async () => { if (!confirm("Delete this product permanently?")) return; const { error } = await db.from("products").delete().eq("slug", p.slug); error ? alert(error.message) : products(); };
    $("#pf").onsubmit = async e => {
      e.preventDefault(); const btn = $("#save"); btn.disabled = true; btn.textContent = "Saving…";
      try {
        const slug = p ? p.slug : slugify($("#f-name").value);
        let img = v.img || null; const file = $("#f-file").files[0];
        if (file) {
          if (file.size > 3 * 1024 * 1024) throw new Error("Photo is over 3 MB — please shrink it first.");
          const path = `${slug}-${Date.now()}.${file.name.split(".").pop().toLowerCase()}`;
          const up = await db.storage.from("product-images").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
          if (up.error) throw up.error; img = db.storage.from("product-images").getPublicUrl(path).data.publicUrl;
        }
        const row = { name: $("#f-name").value.trim(), category: $("#f-cat").value, from_price: num($("#f-price").value), unit: $("#f-unit").value.trim() || "Piece",
          short: $("#f-short").value.trim(), long: $("#f-long").value.trim(), img, featured: $("#f-feat").checked, published: $("#f-pub").checked,
          specs: lines($("#f-specs").value).filter(a => a[1]).map(a => [a[0], a.slice(1).join(" | ")]),
          variants: lines($("#f-vars").value).map(a => ({ name: a[0], d: a[1] || "", price: num(a[2]) })) };
        const res = p ? await db.from("products").update(row).eq("slug", slug) : await db.from("products").insert({ ...row, slug, sort: prods.length + 1 });
        if (res.error) throw res.error; products();
      } catch (err) { $("#fe").innerHTML = msg(err.message || String(err), true); btn.disabled = false; btn.textContent = "Save"; }
    };
  }
}
