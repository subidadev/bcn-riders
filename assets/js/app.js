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
    socks: { label: "SOCKS", name: "Socks",     price: 30,  kit: false, url: "" }, // TODO: add the €30 Revolut link
  };
  const MEMBERSHIP_START = new Date("2027-01-01T00:00:00+01:00"); // Barcelona time
  const REVOLUT_FIELD_MAX = 100;
  const STORE_KEY = "bcnr-order-2027";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ---- Countdown ----------------------------------------------------------
  function tick() {
    const ms = Math.max(0, MEMBERSHIP_START - Date.now());
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

  // ---- Routes -------------------------------------------------------------
  const ROUTES = window.BCN_ROUTES || [];
  const FEATURED = window.BCN_FEATURED || [];
  const rwgps = (id) => `https://ridewithgps.com/routes/${id}`;
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const kindLabel = { road: "Road", gravel: "Gravel", mtb: "MTB", other: "Hike" };
  const fmt = (n) => n.toLocaleString("en-GB");

  const stats = (r) => `
    <span><b>${fmt(Math.round(r.km))}</b> km</span>
    <span><b>${fmt(r.gain)}</b> m ↑</span>
    ${r.unpaved > 0 ? `<span><b>${r.unpaved}%</b> unpaved</span>` : ""}`;

  // Featured: live Ride with GPS map embeds
  $("#featured").innerHTML = FEATURED
    .map((id) => ROUTES.find((r) => r.id === id))
    .filter(Boolean)
    .map((r) => `
      <article class="feat">
        <div class="feat__map" style="background-image:url(https://ridewithgps.com/routes/${r.id}/hover_preview.png)">
          <iframe loading="lazy" title="${esc(r.name)} map"
            src="https://ridewithgps.com/embeds?type=route&id=${r.id}&metricUnits=true&sampleGraph=true&hideSurface=false"></iframe>
        </div>
        <div class="feat__body">
          <div>
            <h3>${esc(r.name.replace(/^(ROAD|GRVL)\s*:?\s*/i, ""))}</h3>
            <div class="stats">${stats(r)}</div>
          </div>
          <a class="btn btn--ghost btn--sm" href="${rwgps(r.id)}" target="_blank" rel="noopener">Open route</a>
        </div>
      </article>`)
    .join("");

  // Library
  const PAGE = 12;
  let kind = "all", query = "", sort = "new", shown = PAGE;
  const listEl = $("#route-list"), countEl = $("#route-count"), moreBtn = $("#route-more");

  function filtered() {
    const q = query.toLowerCase();
    const out = ROUTES.filter((r) =>
      (kind === "all" ? r.kind !== "other" : r.kind === kind) &&
      (!q || r.name.toLowerCase().includes(q) || r.start.toLowerCase().includes(q))
    );
    const by = {
      new: (a, b) => b.created.localeCompare(a.created),
      short: (a, b) => a.km - b.km,
      long: (a, b) => b.km - a.km,
      climb: (a, b) => b.gain - a.gain,
    }[sort];
    return out.sort(by);
  }

  function renderRoutes() {
    const all = filtered();
    const page = all.slice(0, shown);
    countEl.textContent = `${all.length} route${all.length === 1 ? "" : "s"}`;
    listEl.innerHTML = page.length
      ? page.map((r) => `
        <a class="route" href="${rwgps(r.id)}" target="_blank" rel="noopener">
          <img class="route__map" src="https://ridewithgps.com/routes/${r.id}/hover_preview.png" alt="" loading="lazy" onerror="this.remove()">
          <div class="route__top">
            <span class="route__name">${esc(r.name)}</span>
            <span class="tag tag--${r.kind}">${kindLabel[r.kind]}</span>
          </div>
          <div class="stats">${stats(r)}</div>
          <div class="route__meta">${r.start ? esc(r.start) + " · " : ""}${r.type}</div>
        </a>`).join("")
      : `<p class="routes__empty">No routes match that. Try another search.</p>`;
    moreBtn.hidden = all.length <= shown;
  }

  $$(".chip").forEach((c) =>
    c.addEventListener("click", () => {
      $$(".chip").forEach((x) => x.classList.toggle("is-on", x === c));
      kind = c.dataset.kind; shown = PAGE; renderRoutes();
    })
  );
  $("#route-search").addEventListener("input", (e) => { query = e.target.value.trim(); shown = PAGE; renderRoutes(); });
  $("#route-sort").addEventListener("change", (e) => { sort = e.target.value; renderRoutes(); });
  moreBtn.addEventListener("click", () => { shown += PAGE; renderRoutes(); });
  renderRoutes();
})();
