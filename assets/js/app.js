/* BCN Riders · 2027 membership drive */
(() => {
  // ---- Config -------------------------------------------------------------
  // Revolut payment links. Each link has one required free-text field
  // ("2027 BCN Riders team kit and membership!") capped at 100 characters.
  // Revolut can't prefill it from the URL, so we copy the order line to the
  // clipboard and the rider pastes it in.
  const TIERS = {
    pro:   { label: "PRO",   name: "Pro kit",   price: 310, kit: true,  url: "https://checkout.revolut.com/pay/13c8f00d-b9e4-40de-af45-252ce0d1945d" },
    sport: { label: "SPORT", name: "Sport kit", price: 250, kit: true,  url: "https://checkout.revolut.com/pay/a3461062-6c07-467c-b8de-de26318ea2d1" },
    socks: { label: "SOCKS", name: "Socks",     price: 30,  kit: false, url: "https://checkout.revolut.com/pay/204e310b-dd72-438d-a3ab-9d4e1a518a68" },
  };
  // Order window. Kit takes about a month to make, and we want it handed out
  // before 17 Dec: close Sun 1 Nov, order goes to Obbi Mon 2 Nov, kit lands
  // ~2 Dec, leaving two weeks of cushion. Barcelona is on CET (+01:00) by then.
  const ORDER_CLOSE = new Date("2026-11-01T23:59:59+01:00");
  const REVOLUT_FIELD_MAX = 100;
  const STORE_KEY = "bcnr-order-2027";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ---- Countdown ----------------------------------------------------------
  function tick() {
    const ms = Math.max(0, ORDER_CLOSE - Date.now());
    if (!ms) {
      $("#countdown").classList.add("is-closed");
      $("#cd-label").textContent = "The club order's gone to Italy";
      return;
    }
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    $("#cd-days").textContent = d;
    $("#cd-hours").textContent = String(h).padStart(2, "0");
    $("#cd-mins").textContent = String(m).padStart(2, "0");
  }
  tick();
  setInterval(tick, 30_000);

  // ---- Order form ---------------------------------------------------------
  const form = $("#order-form");
  const nameEl = $("#name");
  const topEl = $("#size-top");
  const bibsEl = $("#size-bibs");
  const socksEl = $("#size-socks");
  const summaryEl = $("#summary");
  const payBtn = $("#pay-btn");
  const payNote = $("#pay-note");
  const toast = $("#toast");
  let attempted = false;

  const tierKey = () => form.elements.tier.value;
  const clean = (s) => s.replace(/\s+/g, " ").replace(/[|·]/g, "").trim();

  function orderLine() {
    const t = TIERS[tierKey()];
    const parts = [
      t.kit ? `Jersey/Vest ${topEl.value || "?"}` : null,
      t.kit ? `Bibs ${bibsEl.value || "?"}` : null,
      `Socks ${socksEl.value || "?"}`,
    ].filter(Boolean);
    const tail = ` · ${t.label} · ${parts.join(" · ")}`;
    const name = clean(nameEl.value).slice(0, REVOLUT_FIELD_MAX - tail.length);
    return name + tail;
  }

  function missing() {
    const t = TIERS[tierKey()];
    const sizes = t.kit ? [topEl, bibsEl, socksEl] : [socksEl];
    return {
      name: !clean(nameEl.value),
      sizes: sizes.filter((el) => !el.value),
    };
  }

  function render() {
    const key = tierKey();
    const t = TIERS[key];
    form.classList.toggle("is-socks", !t.kit);
    const m = missing();
    const ready = !m.name && m.sizes.length === 0;

    summaryEl.textContent = ready ? orderLine() : "Fill in your name and sizes";
    summaryEl.classList.toggle("is-empty", !ready);

    if (!t.url) {
      payBtn.textContent = `€${t.price} payment link coming soon`;
      payBtn.setAttribute("aria-disabled", "true");
      payBtn.removeAttribute("href");
      payNote.textContent = "The socks-only checkout isn't live yet. Check back soon, or ask in the group.";
    } else {
      payBtn.textContent = `Copy & pay €${t.price} on Revolut →`;
      payBtn.removeAttribute("aria-disabled");
      payBtn.href = t.url;
      payNote.textContent = "Secure checkout by Revolut. Paid to Guava Bikes, who handle the club's bulk order.";
    }

    if (attempted) showErrors(m);
    save();
  }

  function showErrors(m) {
    nameEl.classList.toggle("is-invalid", m.name);
    $("#name-err").hidden = !m.name;
    [topEl, bibsEl, socksEl].forEach((el) => el.classList.toggle("is-invalid", m.sizes.includes(el)));
    $("#size-err").hidden = m.sizes.length === 0;
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers / non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch {}
      ta.remove();
      return ok;
    }
  }

  function flashToast() {
    toast.hidden = false;
    toast.animate?.([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 220 });
  }

  payBtn.addEventListener("click", (e) => {
    attempted = true;
    const m = missing();
    if (m.name || m.sizes.length) {
      e.preventDefault();
      showErrors(m);
      (m.name ? nameEl : m.sizes[0]).focus();
      return;
    }
    // Start the copy synchronously inside the click so it keeps user activation,
    // then let the link open Revolut in a new tab.
    copy(orderLine());
    flashToast();
  });

  $("#copy-btn").addEventListener("click", async () => {
    attempted = true;
    const m = missing();
    if (m.name || m.sizes.length) { showErrors(m); return; }
    const ok = await copy(orderLine());
    const btn = $("#copy-btn");
    btn.textContent = ok ? "Copied ✓" : "Select & copy";
    setTimeout(() => (btn.textContent = "Copy"), 1800);
  });

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", (e) => e.preventDefault());

  // Tier cards preselect the tier in the form
  $$("[data-pick]").forEach((a) =>
    a.addEventListener("click", () => {
      form.elements.tier.value = a.dataset.pick;
      render();
      setTimeout(() => nameEl.focus({ preventScroll: true }), 500);
    })
  );

  // Remember the rider's own entries on this device only
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        tier: tierKey(), name: nameEl.value, top: topEl.value, bibs: bibsEl.value, socks: socksEl.value,
      }));
    } catch {}
  }
  function restore() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (!s) return;
      if (TIERS[s.tier]) form.elements.tier.value = s.tier;
      nameEl.value = s.name || "";
      topEl.value = s.top || "";
      bibsEl.value = s.bibs || "";
      socksEl.value = s.socks || "";
    } catch {}
  }
  restore();
  render();

  // ---- Size guide tabs ----------------------------------------------------
  $$(".tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".tabs button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      $$(".sizetable").forEach((p) => (p.hidden = p.dataset.panel !== b.dataset.tab));
    })
  );

  // ---- Kit lightbox -------------------------------------------------------
  const shots = $$(".gallery__item");
  const lb = $("#lightbox"), lbImg = $("#lb-img"), lbCap = $("#lb-cap");
  let shot = 0;
  function showShot(i) {
    shot = (i + shots.length) % shots.length;
    const img = $("img", shots[shot]);
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = $("figcaption", shots[shot])?.textContent || "";
    lb.classList.toggle("is-white", shots[shot].classList.contains("gallery__item--white"));
  }
  shots.forEach((f, i) => {
    f.tabIndex = 0;
    f.setAttribute("role", "button");
    f.setAttribute("aria-label", `View ${$("img", f).alt} larger`);
    const open = () => { showShot(i); lb.showModal?.() ?? lb.setAttribute("open", ""); };
    f.addEventListener("click", open);
    f.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
  lb.addEventListener("click", (e) => {
    const act = e.target.closest("[data-lb]")?.dataset.lb;
    if (act === "prev") showShot(shot - 1);
    else if (act === "next") showShot(shot + 1);
    // Anything outside the photo counts as "outside" (the figure fills the screen on phones)
    else if (act === "close" || !e.target.closest("img, figcaption")) lb.close();
  });
  // Swipe left/right on touch screens
  let touchX = null;
  lb.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) showShot(shot + (dx < 0 ? 1 : -1));
  });
  lb.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") showShot(shot - 1);
    if (e.key === "ArrowRight") showShot(shot + 1);
  });

  // ---- Routes -------------------------------------------------------------
  const ROUTES = window.BCN_ROUTES || [];
  const rwgps = (id) => `https://ridewithgps.com/routes/${id}`;
  const photoUrl = (id) => `https://ridewithgps.com/photos/${id}/medium.jpg`;
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const kindLabel = { road: "Road", gravel: "Gravel", mtb: "MTB", other: "Hike" };
  // Brand line colours, drawn over a navy casing. Keep in sync with .chip dots in styles.css.
  const KIND_COLOR = { road: "#2f43a6", gravel: "#a9cbe8", mtb: "#ffffff", other: "#c9dff2" };
  const CASING = "#1b2a44";
  const DIST = { any: [0, Infinity], short: [0, 60], mid: [60, 100], long: [100, Infinity] };
  const fmt = (n) => n.toLocaleString("en-GB");
  const title = (r) => r.name.replace(/^(ROAD|GRVL\+*)\s*:?\s*/i, "");
  const byId = new Map(ROUTES.map((r) => [r.id, r]));

  const stats = (r) => `
    <span><b>${fmt(Math.round(r.km))}</b> km</span>
    <span><b>${fmt(r.gain)}</b> m ↑</span>
    ${r.unpaved > 0 ? `<span><b>${r.unpaved}%</b> unpaved</span>` : ""}`;

  // Google encoded polyline → [[lat, lng], ...]
  function decode(str) {
    const out = [];
    let i = 0, lat = 0, lng = 0;
    while (i < str.length) {
      for (const k of [0, 1]) {
        let shift = 0, res = 0, b;
        do { b = str.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        const d = res & 1 ? ~(res >> 1) : res >> 1;
        if (k === 0) lat += d; else lng += d;
      }
      out.push([lat / 1e5, lng / 1e5]);
    }
    return out;
  }

  // Elevation profile as an SVG area chart
  function profileSvg(ele) {
    if (!ele || ele.length < 2) return "";
    const W = 300, H = 70, lo = Math.min(...ele), hi = Math.max(...ele), span = Math.max(hi - lo, 50);
    const pts = ele.map((e, i) => `${((i / (ele.length - 1)) * W).toFixed(1)},${(H - 4 - ((e - lo) / span) * (H - 10)).toFixed(1)}`);
    return `
      <div class="routecard__elev">
        <span class="routecard__label">Elevation</span>
        <svg class="routecard__profile" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
          <polygon points="0,${H} ${pts.join(" ")} ${W},${H}" fill="#a9cbe8" fill-opacity=".55"/>
          <polyline points="${pts.join(" ")}" fill="none" stroke="#1b2a44" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
        </svg>
        <div class="routecard__axis"><span>${fmt(lo)} m</span><span>${fmt(hi)} m</span></div>
      </div>`;
  }

  // Map
  const mapEl = $("#clubmap");
  const card = $("#route-card");
  const L = window.L;
  let map = null, selected = null;
  const lines = new Map(); // id -> { line, casing, hit }

  if (L && mapEl) {
    map = L.map(mapEl, { scrollWheelZoom: false, zoomSnap: 0.25, zoomControl: false }).setView([41.6, 2.1], 9); // Barcelona until fitted
    L.control.zoom({ position: "bottomleft" }).addTo(map);
    L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      subdomains: "abc",
      attribution: 'Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM · Style © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>) · Routes © <a href="https://ridewithgps.com">Ride with GPS</a>',
    }).addTo(map);
    map.on("click", () => select(null));
    // Only take over the scroll wheel after someone has clicked into the map
    map.on("focus click", () => map.scrollWheelZoom.enable());
    mapEl.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());

    ROUTES.forEach((r) => {
      if (!r.line) return;
      const ll = decode(r.line);
      const color = KIND_COLOR[r.kind] || KIND_COLOR.road;
      const casing = L.polyline(ll, { color: CASING, weight: 8, opacity: .9, lineJoin: "round", lineCap: "round", interactive: false });
      const line = L.polyline(ll, { color, weight: 4.5, opacity: 1, lineJoin: "round", lineCap: "round", interactive: false });
      // Invisible wide stroke so lines are easy to hover and tap
      const hit = L.polyline(ll, { color: "#000", weight: 20, opacity: 0 });
      hit.bindTooltip(esc(title(r)), { sticky: true, className: "maptip", direction: "top", offset: [0, -6] });
      hit.on("click", (e) => { L.DomEvent.stopPropagation(e); select(r.id); });
      hit.on("mouseover", () => { if (selected !== r.id) { casing.setStyle({ weight: 11, opacity: 1 }); line.setStyle({ weight: 6.5, opacity: 1 }); casing.bringToFront(); line.bringToFront(); } });
      hit.on("mouseout", () => restyle());
      lines.set(r.id, { line, casing, hit });
    });
  }

  function restyle() {
    lines.forEach(({ line, casing }, id) => {
      const on = id === selected, dim = selected && !on;
      casing.setStyle({ weight: on ? 12 : 8, opacity: dim ? .55 : .9 });
      line.setStyle({ weight: on ? 7 : 4.5, opacity: dim ? .7 : 1 });
    });
    if (selected && lines.has(selected)) { lines.get(selected).casing.bringToFront(); lines.get(selected).line.bringToFront(); }
    lines.forEach(({ hit }) => hit._map && hit.bringToFront());
  }

  function select(id, { fly = true } = {}) {
    selected = id;
    restyle();
    $$(".route").forEach((el) => el.classList.toggle("is-on", +el.dataset.id === id));
    const r = id && byId.get(id);
    if (!r) { card.hidden = true; return; }
    card.innerHTML = `
      <button class="routecard__close" aria-label="Close route">×</button>
      ${r.photo ? `<img class="routecard__photo" src="${photoUrl(r.photo)}" alt="" onerror="this.remove()">` : ""}
      <div class="routecard__body">
        <div class="routecard__tags">
          <span class="tag tag--${r.kind}">${kindLabel[r.kind]}</span>
          ${r.surface && r.surface !== "unknown" ? `<span class="tag tag--surface">${esc(r.surface)}</span>` : ""}
        </div>
        <h3>${esc(title(r))}</h3>
        ${r.start ? `<p class="routecard__start">Starts in <b>${esc(r.start)}</b></p>` : ""}
        <dl class="routecard__stats">
          <div><dt>Distance</dt><dd>${fmt(Math.round(r.km))} km</dd></div>
          <div><dt>Climbing</dt><dd>${fmt(r.gain)} m</dd></div>
          <div><dt>Unpaved</dt><dd>${r.unpaved}%</dd></div>
          <div><dt>Type</dt><dd>${r.type === "loop" ? "Loop" : "A to B"}</dd></div>
        </dl>
        ${profileSvg(r.ele)}
        <a class="btn btn--navy btn--block btn--sm" href="${rwgps(r.id)}" target="_blank" rel="noopener">Open on Ride with GPS →</a>
      </div>`;
    card.hidden = false;
    card.scrollTop = 0;
    $(".routecard__close", card).addEventListener("click", () => select(null));
    if (fly && map && lines.has(id)) {
      const wide = innerWidth > 880; // matches the bottom-sheet breakpoint in styles.css
      map.fitBounds(lines.get(id).line.getBounds(), {
        paddingTopLeft: [40, 70],
        paddingBottomRight: wide ? [card.offsetWidth + 60, 40] : [40, Math.min(card.offsetHeight + 30, mapEl.clientHeight * .6)],
        maxZoom: 14,
      });
    }
  }

  // Filters popover on the map
  const filterBtn = $("#map-filter-btn"), filterPanel = $("#map-filters");
  filterBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = filterPanel.hidden;
    filterPanel.hidden = !open;
    filterBtn.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => {
    if (filterPanel && !filterPanel.hidden && !e.target.closest("#map-filters, #map-filter-btn")) {
      filterPanel.hidden = true;
      filterBtn.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && filterPanel && !filterPanel.hidden) { filterPanel.hidden = true; filterBtn.setAttribute("aria-expanded", "false"); filterBtn.focus(); }
  });
  // Keep Leaflet from treating clicks in the overlays as map clicks / drags
  if (L) [".clubmap__tools", "#route-card"].forEach((s) => { const el = $(s); if (el) { L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el); } });

  // Library (list + map share the same filters)
  const PAGE = 12;
  let kind = "all", dist = "any", query = "", sort = "new", shown = PAGE;
  const listEl = $("#route-list"), countEl = $("#route-count"), moreBtn = $("#route-more"), mapCount = $("#map-count");

  function filtered() {
    const q = query.toLowerCase();
    const [lo, hi] = DIST[dist];
    const out = ROUTES.filter((r) =>
      (kind === "all" ? r.kind !== "other" : r.kind === kind) &&
      r.km >= lo && r.km < hi &&
      (!q || r.name.toLowerCase().includes(q) || r.start.toLowerCase().includes(q))
    );
    const by = {
      new: (a, b) => b.featured - a.featured || b.created.localeCompare(a.created),
      short: (a, b) => a.km - b.km,
      long: (a, b) => b.km - a.km,
      climb: (a, b) => b.gain - a.gain,
    }[sort];
    return out.sort(by);
  }

  function renderMap(all, { fit }) {
    if (!map) return;
    const ids = new Set(all.map((r) => r.id));
    lines.forEach(({ line, casing, hit }, id) => {
      const show = ids.has(id);
      [casing, line, hit].forEach((l) => (show ? l.addTo(map) : l.remove()));
    });
    if (selected && !ids.has(selected)) select(null);
    restyle();
    mapCount.textContent = `${all.length} route${all.length === 1 ? "" : "s"}`;
    const active = (kind !== "all") + (dist !== "any");
    filterBtn.querySelector("b").textContent = active ? ` · ${active}` : "";
    const vis = all.filter((r) => lines.has(r.id));
    if (fit && vis.length) {
      const b = L.latLngBounds([]);
      vis.forEach((r) => b.extend(lines.get(r.id).line.getBounds()));
      map.fitBounds(b, { paddingTopLeft: [30, 70], paddingBottomRight: [30, 30], maxZoom: 13 });
    }
  }

  function renderRoutes({ fit = true } = {}) {
    const all = filtered();
    const page = all.slice(0, shown);
    countEl.textContent = `${all.length} route${all.length === 1 ? "" : "s"}`;
    listEl.innerHTML = page.length
      ? page.map((r) => `
        <article class="route${r.id === selected ? " is-on" : ""}" data-id="${r.id}" tabindex="0" aria-label="Show ${esc(title(r))} on the map">
          <img class="route__map" src="https://ridewithgps.com/routes/${r.id}/hover_preview.png" alt="" loading="lazy" onerror="this.remove()">
          <div class="route__top">
            <span class="route__name">${esc(r.name)}</span>
            <span class="tag tag--${r.kind}">${kindLabel[r.kind]}</span>
          </div>
          <div class="stats">${stats(r)}</div>
          <div class="route__meta">
            <span>${r.start ? esc(r.start) + " · " : ""}${r.type}</span>
            <a href="${rwgps(r.id)}" target="_blank" rel="noopener" aria-label="Open ${esc(title(r))} on Ride with GPS">RWGPS ↗</a>
          </div>
        </article>`).join("")
      : `<p class="routes__empty">No routes match that. Try another search or filter.</p>`;
    moreBtn.hidden = all.length <= shown;
    renderMap(all, { fit });
  }

  listEl.addEventListener("click", (e) => {
    if (e.target.closest("a")) return; // let the RWGPS link through
    const el = e.target.closest(".route");
    if (!el) return;
    // Scroll first: a page scroll mid-flight cancels Leaflet's fly animation
    const mapBox = $(".clubmap").getBoundingClientRect();
    const onScreen = mapBox.top >= 0 && mapBox.bottom <= innerHeight;
    if (!onScreen) $(".clubmap").scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => select(+el.dataset.id), onScreen ? 0 : 600);
  });
  listEl.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("route")) { e.preventDefault(); e.target.click(); }
  });

  // Type chips appear both above the list and in the map's Filters panel
  function setKind(k) {
    kind = k; shown = PAGE;
    $$(".chip[data-kind]").forEach((x) => x.classList.toggle("is-on", x.dataset.kind === k));
    renderRoutes();
  }
  $$(".chip[data-kind]").forEach((c) => c.addEventListener("click", () => setKind(c.dataset.kind)));
  $$(".chip[data-dist]").forEach((c) =>
    c.addEventListener("click", () => {
      dist = c.dataset.dist; shown = PAGE;
      $$(".chip[data-dist]").forEach((x) => x.classList.toggle("is-on", x === c));
      renderRoutes();
    })
  );
  $("#map-filters-reset")?.addEventListener("click", () => {
    dist = "any";
    $$(".chip[data-dist]").forEach((x) => x.classList.toggle("is-on", x.dataset.dist === "any"));
    setKind("all");
  });
  let searchT;
  $("#route-search").addEventListener("input", (e) => {
    query = e.target.value.trim(); shown = PAGE;
    clearTimeout(searchT);
    searchT = setTimeout(() => renderRoutes(), 200);
  });
  $("#route-sort").addEventListener("change", (e) => { sort = e.target.value; renderRoutes({ fit: false }); });
  moreBtn.addEventListener("click", () => { shown += PAGE; renderRoutes({ fit: false }); });
  renderRoutes();
  // Open the default route's panel without zooming away from the overview
  if (byId.has(window.BCN_DEFAULT_ROUTE) && innerWidth > 880) select(window.BCN_DEFAULT_ROUTE, { fly: false });
})();
