/**
 * @OnlyCurrentDoc
 * Limits this script to the one spreadsheet it's attached to. Without this line
 * Google asks for access to every spreadsheet in your account.
 */

/**
 * BCN Riders · order attempt log (Google Apps Script web app, bound to a Google Sheet)
 *
 * Each time a rider taps "Copy & pay" or "Copy" on the site, the page sends their
 * order here. This script adds a row to the "Attempts" sheet and emails you.
 * Setup: README.md, section "Order notifications".
 *
 * Nothing is trusted from the page: the build and sizes must be real options, text is
 * trimmed and length-capped, a hidden honeypot field catches form-filling bots,
 * repeat clicks within a minute are ignored, and at most 30 rows are logged per
 * 10 minutes so a flood can't burn the daily email quota.
 *
 * Permissions it asks for: this spreadsheet only (@OnlyCurrentDoc above), send email
 * as you (notifications only; it can't read your mail), and your email address (to
 * know where to send them).
 */

const NOTIFY_EMAIL = "";          // leave empty to email the account that deploys this script
const SHEET_NAME = "Attempts";
const TZ = "Europe/Madrid";
const TIERS = { pro: "PRO", sport: "SPORT", socks: "SOCKS" };
const KIT_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
const SOCK_SIZES = ["S", "M", "L"];
const HEADERS = ["Time (Barcelona)", "Action", "Build", "Name", "Jersey / vest", "Bibs", "Socks", "Order line", "Site"];

/** Run once from the editor: creates the sheet and asks for permissions. */
function setup() {
  const sheet = sheet_();
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  console.log("Ready. Notifications go to " + (NOTIFY_EMAIL || Session.getEffectiveUser().getEmail()));
}

function doGet() {
  return ContentService.createTextOutput("BCN Riders order log is running.");
}

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (d.hp) return ok_();                                   // honeypot filled in: a bot

    const tier = TIERS[d.tier];
    const name = clean_(d.name, 60);
    const action = d.action === "copy" ? "copy" : "pay";
    const kit = d.tier !== "socks";
    const top = kit ? pick_(d.top, KIT_SIZES) : "";
    const bibs = kit ? pick_(d.bibs, KIT_SIZES) : "";
    const socks = pick_(d.socks, SOCK_SIZES);
    if (!tier || !name) return ok_();

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return ok_();
    try {
      const cache = CacheService.getScriptCache();
      const dupKey = "dup:" + digest_([action, tier, name.toLowerCase(), top, bibs, socks].join("|"));
      if (cache.get(dupKey)) return ok_();                    // same click again within a minute
      const count = Number(cache.get("count") || 0);
      if (count >= 30) return ok_();                          // flood guard
      cache.put(dupKey, "1", 60);
      cache.put("count", String(count + 1), 600);

      const line = clean_(d.line, 120);
      const site = clean_(d.site, 60);
      const when = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd HH:mm:ss");
      sheet_().appendRow([when, action, tier, safe_(name), top, bibs, socks, safe_(line), safe_(site)]);

      const verb = action === "pay" ? "went to pay" : "copied their order";
      MailApp.sendEmail(
        NOTIFY_EMAIL || Session.getEffectiveUser().getEmail(),
        "BCN Riders order: " + tier + " · " + name,
        name + " " + verb + ".\n\n" + line + "\n\n" + when + " Barcelona time, via " + site +
          "\n\nAll attempts: " + SpreadsheetApp.getActiveSpreadsheet().getUrl()
      );
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error(err);
  }
  return ok_();
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function ok_() {
  return ContentService.createTextOutput("ok");
}

function clean_(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function pick_(v, allowed) {
  const s = clean_(v, 4).toUpperCase();
  return allowed.indexOf(s) >= 0 ? s : "";
}

/** Stop a name like "=HYPERLINK(...)" from running as a formula in the sheet. */
function safe_(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function digest_(s) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s));
}
