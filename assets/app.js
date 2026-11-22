import { CO, CFG, esc, money, digits, getDb, loadCatalogue } from "./core.js";

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const page = document.body.dataset.page;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const qs = new URLSearchParams(location.search);
const NAV = [["products.html", "Products", "products"], ["about.html", "About", "about"], ["quality.html", "Quality", "quality"], ["contact.html", "Contact", "contact"]];

/* ---------- motion: smooth scroll, reveal, count-up, word split ---------- */
let lenis;
if (!reduce && window.Lenis) {
  lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
let io;
function reveal() {
  if (reduce) return $$(".rv").forEach(e => e.classList.add("in"));
  io ??= new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  $$(".rv:not(.in)").forEach(e => io.observe(e));
}
function countUp() {
  $$("[data-count]").forEach(el => {
    const to = +el.dataset.count, fmt = n => Math.round(n).toLocaleString("en-IN");
    if (reduce) return (el.textContent = fmt(to));
    new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return; o.disconnect();
      const t0 = performance.now(), d = 1400;
      const step = t => { const k = Math.min(1, (t - t0) / d); el.textContent = fmt(to * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }).observe(el);
  });
}
function splitWords() {
  $$("[data-split]").forEach(el => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w, i) =>
      `<span class="w"><span style="--i:${i}">${esc(w)}</span></span>`).join(" ");
    requestAnimationFrame(() => el.classList.add("in"));
  });
}

/* ---------- shell: header, drawer, footer, mobile bar ---------- */
function shell(cats) {
  const cur = k => k === page ? ' aria-current="page"' : "";
  document.body.insertAdjacentHTML("afterbegin", `
  <a class="skip" href="#main">Skip to content</a>
  <header class="hdr" id="hdr"><div class="wrap hdr-in">
    <a class="brand" href="index.html"><img src="assets/logo.png" alt="" width="40" height="40"><span><b>${esc(CO.name)}</b><small>Manufacturers &amp; Fabricators</small></span></a>
    <nav class="nav" aria-label="Main">${NAV.map(([h, t, k]) => `<a href="${h}"${cur(k)}>${t}</a>`).join("")}<a class="btn brass sm" href="inquiry.html">Send inquiry</a></nav>
    <button class="burger" id="burger" aria-expanded="false" aria-controls="drawer" aria-label="Open menu"><i></i><i></i></button>
  </div><div class="progress" id="prog"></div></header>
  <div class="scrim" id="scrim"></div>
  <aside class="drawer" id="drawer" aria-label="Site menu" inert>
    <nav>
      <a href="index.html">Home</a>
      <span class="dh">Products</span>
      ${cats.map(c => `<a class="sub" href="products.html?c=${c.slug}">${esc(c.name)}</a>`).join("")}
      <a class="sub" href="products.html">View the full range</a>
      <span class="dh">Company</span>
      <a href="about.html">About us</a><a href="quality.html">Quality &amp; process</a><a href="contact.html">Contact &amp; location</a>
      <a href="privacy.html">Privacy policy</a><a href="terms.html">Terms &amp; conditions</a>
    </nav>
    <div class="drawer-foot"><a class="btn brass wide" href="inquiry.html">Send an inquiry</a><a class="btn ghost wide" href="tel:${CO.phoneHref}">Call ${esc(CO.phone)}</a></div>
  </aside>`);

  document.body.insertAdjacentHTML("beforeend", `
  <footer class="ftr"><div class="wrap">
    <div class="ftr-grid">
      <div><h4>${esc(CO.name)}</h4>
        <p>Fabricators of stainless and mild steel equipment for pharmaceutical, food, chemical and commercial kitchen plants. Working out of Vapi since ${esc(CO.founded)}, building to drawing and to site measurement.</p>
        <p class="note">GST ${esc(CO.gst)}${CO.udyam ? "<br>Udyam " + esc(CO.udyam) : ""}</p></div>
      <div><h4>Categories</h4><ul>${cats.map(c => `<li><a href="products.html?c=${c.slug}">${esc(c.name)}</a></li>`).join("")}</ul></div>
      <div><h4>Company</h4><ul><li><a href="about.html">About us</a></li><li><a href="quality.html">Quality &amp; process</a></li><li><a href="inquiry.html">Send an inquiry</a></li><li><a href="contact.html">Contact</a></li><li><a href="privacy.html">Privacy policy</a></li><li><a href="terms.html">Terms &amp; conditions</a></li></ul></div>
      <div><h4>Reach us</h4><p>${esc(CO.contactPerson)}<br>${esc(CO.address)}</p>
        <p><a href="tel:${CO.phoneHref}">${esc(CO.phone)}</a><br><a href="tel:${CO.phone2Href}">${esc(CO.phone2)}</a><br><a href="mailto:${CO.email}">${esc(CO.email)}</a><br><span class="note">${esc(CO.hours)}</span></p></div>
    </div>
    <div class="ftr-bot"><span>© ${new Date().getFullYear()} ${esc(CO.name)}</span>
      <span class="priv"><i></i>No cookies, no tracking, no ads. <a href="privacy.html">How we handle your details</a></span></div>
  </div></footer>
  <a class="fab" href="https://wa.me/${CO.whatsapp}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.8 2.1 1.2 1 2.2 1.4 2.5 1.5.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4Z"/></svg></a>
  <div class="actionbar"><a class="btn ghost" href="tel:${CO.phoneHref}">Call</a><a class="btn ghost" href="https://wa.me/${CO.whatsapp}" target="_blank" rel="noopener">WhatsApp</a><a class="btn brass" href="inquiry.html">Inquire</a></div>`);

  const burger = $("#burger"), drawer = $("#drawer"), scrim = $("#scrim"), hdr = $("#hdr"), prog = $("#prog");
  let open = false;
  const set = o => {
    open = o; drawer.classList.toggle("on", o); scrim.classList.toggle("on", o); hdr.classList.toggle("open", o);
    burger.setAttribute("aria-expanded", o); burger.setAttribute("aria-label", o ? "Close menu" : "Open menu");
    drawer.inert = !o; document.body.classList.toggle("lock", o);
    lenis && (o ? lenis.stop() : lenis.start());
    if (o) drawer.querySelector("a").focus(); else burger.focus({ preventScroll: true });
  };
  burger.onclick = () => set(!open); scrim.onclick = () => set(false);
  addEventListener("keydown", e => e.key === "Escape" && open && set(false));
  $$("a", drawer).forEach(a => a.addEventListener("click", () => set(false)));

  let ly = 0;
  addEventListener("scroll", () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    hdr.classList.toggle("solid", y > 8); hdr.classList.toggle("hide", y > ly && y > 240 && !open);
    prog.style.transform = `scaleX(${max > 0 ? y / max : 0})`; ly = y;
  }, { passive: true });
}

/* ---------- product card + horizontal rail ---------- */
const thumb = p => p.img
  ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">`
  : `<span class="noimg"><span>${esc(p.name.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase())}</span></span>`;
const href = p => `product.html?p=${encodeURIComponent(p.slug)}`;
const card = (p, i = 0) => `<article class="card rv" style="--i:${i % 6}">
  <a class="ph" href="${href(p)}" aria-label="${esc(p.name)}" tabindex="-1">${thumb(p)}</a>
  <div class="card-b"><h3><a href="${href(p)}">${esc(p.name)}</a></h3>
    <div class="price">${money(p.from_price)} <small>onwards / ${esc(p.unit)}</small></div>
    <p>${esc(p.short)}</p>
    <div class="card-f"><span class="vtag">${p.variants.length} size options</span><a class="more" href="${href(p)}">View options <i>&rarr;</i></a></div></div></article>`;

function rail(id, list) {
  const el = $("#" + id); if (!el) return;
  el.innerHTML = list.map(card).join("");
  const step = () => Math.max(el.clientWidth * .8, 260);
  $$(`[data-rail="${id}"]`).forEach(b => b.onclick = () => el.scrollBy({ left: b.dataset.dir === "next" ? step() : -step(), behavior: "smooth" }));
  let down = false, sx = 0, sl = 0, moved = false;   // drag to scroll on desktop
  el.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") return; down = true; moved = false; sx = e.clientX; sl = el.scrollLeft; });
  addEventListener("pointermove", e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) { moved = true; el.classList.add("drag"); } el.scrollLeft = sl - dx; });
  addEventListener("pointerup", () => { down = false; el.classList.remove("drag"); });
  el.addEventListener("click", e => { if (moved) { e.preventDefault(); moved = false; } }, true);
}

/* ---------- pages ---------- */
function slideshow(items) {
  const box = $("#heroSlides"), cap = $("#heroCap"), dots = $("#heroDots");
  if (!box || !items.length) return;
  box.innerHTML = items.map((p, i) => `<img src="${esc(p.img)}" alt="${esc(p.name)}" class="${i ? "" : "on"}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>`).join("");
  dots.innerHTML = items.map((_, i) => `<button aria-label="Show ${esc(items[i].name)}" class="${i ? "" : "on"}"></button>`).join("");
  cap.textContent = items[0].name;
  let i = 0, t, hover = false;
  const go = n => {
    i = (n + items.length) % items.length;
    $$("img", box).forEach((im, k) => im.classList.toggle("on", k === i));
    $$("button", dots).forEach((d, k) => d.classList.toggle("on", k === i));
    cap.textContent = items[i].name;
  };
  $$("button", dots).forEach((d, k) => d.onclick = () => go(k));
  box.parentElement.addEventListener("mouseenter", () => hover = true);
  box.parentElement.addEventListener("mouseleave", () => hover = false);
  if (!reduce) t = setInterval(() => !hover && !document.hidden && go(i + 1), 4800);
}

async function home() {
  const { cats, prods } = await loadCatalogue();
  slideshow(prods.filter(p => p.img).slice(0, 6));
  rail("railFeat", prods.filter(p => p.featured));
  rail("railNew", prods.filter(p => !p.featured).slice(0, 8));
  $("#catGrid").innerHTML = cats.map((c, i) => `<a class="cat rv" style="--i:${i}" href="products.html?c=${c.slug}">
    <span class="n">0${i + 1}</span><h3>${esc(c.name)}</h3><p>${esc(c.blurb)}</p>
    <b>${prods.filter(p => p.category === c.slug).length} products <i>&rarr;</i></b></a>`).join("");
}

async function products() {
  const { cats, prods } = await loadCatalogue();
  let c = qs.get("c") || "all", q = "";
  if (c !== "all" && !cats.some(x => x.slug === c)) c = "all";
  const chips = $("#chips"), grid = $("#grid");
  chips.innerHTML = [{ slug: "all", name: "All products" }, ...cats].map(x => `<button data-c="${x.slug}">${esc(x.name)}</button>`).join("");
  const draw = () => {
    $$("button", chips).forEach(b => b.classList.toggle("on", b.dataset.c === c));
    const cat = cats.find(x => x.slug === c);
    $("#pTitle").textContent = cat ? cat.name : "All products";
    $("#pLede").textContent = cat ? cat.blurb : "The whole range. Every product carries its own size and capacity options, and almost everything is also built to your drawing.";
    document.title = (cat ? cat.name : "All products") + " — Anuyog Engineering, Vapi";
    const list = prods.filter(p => (c === "all" || p.category === c) && (!q || (p.name + " " + p.short).toLowerCase().includes(q)));
    $("#count").textContent = list.length + (list.length === 1 ? " product" : " products");
    grid.innerHTML = list.length ? list.map(card).join("") : `<p class="empty">Nothing matches that. Try a shorter word, or <a href="inquiry.html">send us what you need</a> — we build to drawing.</p>`;
    reveal();
  };
  chips.onclick = e => { const b = e.target.closest("button"); if (!b) return; c = b.dataset.c; history.replaceState(null, "", c === "all" ? "products.html" : "products.html?c=" + c); draw(); };
  $("#q").oninput = e => { q = e.target.value.trim().toLowerCase(); draw(); };
  draw();
}

async function product() {
  const { prods } = await loadCatalogue();
  const p = prods.find(x => x.slug === qs.get("p")), box = $("#pd");
  if (!p) { box.innerHTML = `<div class="prose"><h1>Product not found</h1><p>It may have been renamed. <a href="products.html">See the full range</a>.</p></div>`; return; }
  document.title = `${p.name} — Anuyog Engineering, Vapi`;
  let vi = 0;
  const wa = () => `https://wa.me/${CO.whatsapp}?text=${encodeURIComponent(`Hello, I'd like a quotation for: ${p.name}${p.variants[vi] ? " — " + p.variants[vi].name : ""}`)}`;
  box.innerHTML = `
  <div class="crumb"><a href="index.html">Home</a> &rsaquo; <a href="products.html">Products</a> &rsaquo; ${esc(p.name)}</div>
  <div class="pd">
    <div class="pd-img rv">${thumb(p)}</div>
    <div class="pd-info rv">
      <h1>${esc(p.name)}</h1>
      <div class="price big">${money(p.from_price)} <small>onwards / ${esc(p.unit)} · indicative, confirmed in a written quotation</small></div>
      <p>${esc(p.long)}</p>
      <h2 class="h3">Choose a size</h2>
      <div class="vars" id="vars">${p.variants.map((v, i) => `<label class="var"><input type="radio" name="v" value="${i}" ${i ? "" : "checked"}><span><b>${esc(v.name)}</b><em>${esc(v.d)}</em></span><strong>${money(v.price)}</strong></label>`).join("")}</div>
      <div class="pd-cta"><a class="btn brass" id="inq" href="#">Inquire about this size</a><a class="btn ghost" id="wa" target="_blank" rel="noopener" href="#">WhatsApp us</a></div>
    </div>
  </div>
  <div class="rv"><h2>Specification</h2><table class="spec"><tbody>${p.specs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table></div>`;
  const sync = () => { $("#inq").href = `inquiry.html?p=${encodeURIComponent(p.slug)}&v=${vi}`; $("#wa").href = wa(); };
  $("#vars").onchange = e => { vi = +e.target.value; sync(); };
  sync();
  const rel = prods.filter(x => x.category === p.category && x.slug !== p.slug).slice(0, 4);
  $("#related").innerHTML = rel.map(card).join("");
  if (!rel.length) $("#relSec").hidden = true;
}

async function inquiry() {
  const { cats, prods } = await loadCatalogue();
  const $f = id => $("#" + id), form = $f("form");
  $f("q-prod").innerHTML = '<option value="">Something else / custom fabrication</option>' +
    cats.map(c => `<optgroup label="${esc(c.name)}">${prods.filter(p => p.category === c.slug).map(p => `<option value="${esc(p.slug)}">${esc(p.name)}</option>`).join("")}</optgroup>`).join("");
  if (prods.some(p => p.slug === qs.get("p"))) $f("q-prod").value = qs.get("p");
  const fill = () => {
    const p = prods.find(x => x.slug === $f("q-prod").value);
    $f("varWrap").hidden = !p; $f("customWrap").hidden = !!p;
    if (p) $f("q-var").innerHTML = p.variants.map((v, i) => `<option value="${i}">${esc(v.name)} — ${esc(v.d)} (${money(v.price)})</option>`).join("") + '<option value="custom">Other size — see my notes below</option>';
  };
  $f("q-prod").onchange = fill; fill();
  if (qs.get("v") != null && !$f("varWrap").hidden && +qs.get("v") < $f("q-var").options.length - 1) $f("q-var").value = qs.get("v");

  form.onsubmit = async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const v = id => $f(id).value.trim(), p = prods.find(x => x.slug === v("q-prod"));
    const item = p ? p.name + (v("q-var") === "custom" ? " — custom size" : " — " + p.variants[+v("q-var")].name) : (v("q-custom") || "Custom fabrication");
    const row = { id: crypto.randomUUID(), item, qty: v("q-qty"), name: v("q-name"), company: v("q-company"), city: v("q-city"), phone: v("q-phone"), email: v("q-email"), message: v("q-msg"), consent: true };
    const btn = $f("send"); btn.disabled = true; btn.textContent = "Sending…";
    let saved = false;
    if ($f("q-hp").value) saved = true;                       // honeypot: bots fill the hidden field
    else { const db = await getDb(); if (db) saved = !(await db.from("inquiries").insert(row)).error; }
    const body = `Product: ${item}\nQuantity: ${row.qty}\n\nName: ${row.name}\nCompany: ${row.company}\nCity: ${row.city}\nPhone: ${row.phone}\nEmail: ${row.email}\n\nDetails:\n${row.message}`;
    form.hidden = true; const done = $f("done"); done.hidden = false;
    done.innerHTML = saved
      ? `<div class="ok"><h2>Received — thank you, ${esc(row.name)}.</h2><p>Your inquiry for <strong>${esc(item)}</strong> is with us (ref <b>AN-${row.id.slice(0, 8).toUpperCase()}</b>). We reply within one working day.</p></div>
         <p class="note">Want to be faster? Send the same details on WhatsApp too.</p>`
      : `<div class="ok warn"><h2>We couldn't save that just now.</h2><p>Nothing has reached us yet. Please send it on WhatsApp or email instead — your details are below, ready to go.</p></div>`;
    done.insertAdjacentHTML("beforeend", `<div class="stack"><a class="btn brass wide" target="_blank" rel="noopener" href="https://wa.me/${CO.whatsapp}?text=${encodeURIComponent(body)}">Send on WhatsApp</a><a class="btn ghost wide" href="mailto:${CO.email}?subject=${encodeURIComponent("Inquiry: " + item)}&body=${encodeURIComponent(body)}">Send by email</a></div>`);
    done.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  };
}

/* ---------- static pages: fill company details by element id ---------- */
function fillStatic() {
  const set = (id, v) => { const el = document.getElementById(id); if (!el) return; if (v) el.textContent = v; else { const dd = el.closest("dd"); dd?.previousElementSibling?.remove(); (dd || el).remove(); } };
  const m = { d1: CO.name, d4: CO.shopArea, d5: CO.team, d6: CO.gst, d7: CO.udyam, d8: CO.hours, cAddr: CO.address, cHours: CO.hours, cGst: CO.gst, cUdyam: CO.udyam, cPhone: CO.phone, cEmail: CO.email };
  Object.entries(m).forEach(([k, v]) => set(k, v));
  const a = (id, h) => { const el = document.getElementById(id); if (el) el.href = h; };
  a("cPhone", "tel:" + CO.phoneHref); a("cEmail", "mailto:" + CO.email); a("cWa", "https://wa.me/" + CO.whatsapp);
  a("cMap", "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(CO.address));
  const tc = $("#tc"); if (tc) tc.innerHTML = `${esc(CO.name)}<br>${esc(CO.address)}<br><a href="mailto:${CO.email}">${esc(CO.email)}</a><br><a href="tel:${CO.phoneHref}">${esc(CO.phone)}</a>`;
  $$("[data-region]").forEach(e => e.textContent = CFG.dataRegion);
  $$("[data-updated]").forEach(e => e.textContent = CFG.privacyUpdated);
  $$("[data-email]").forEach(e => { e.textContent = CO.email; e.href = "mailto:" + CO.email; });
  $$("main .sec .wrap > *, main .page-hd .wrap > *").forEach(e => e.classList.add("rv"));
}

/* ---------- boot ---------- */
const routes = { home, products, product, inquiry };
(async () => {
  let cats = [];
  try { cats = (await loadCatalogue()).cats; } catch (e) { console.warn(e); }
  shell(cats); splitWords(); fillStatic();
  try { await routes[page]?.(); } catch (e) { console.error(e); }
  reveal(); countUp();
})();
