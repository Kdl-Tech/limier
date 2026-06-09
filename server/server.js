/*
 * Limier — backend d'enquête OSINT « legal by design ».
 * Node >= 18 (fetch global). Zéro dépendance. Zéro stockage.
 *
 * Règles : sources PUBLIQUES & LÉGALES (API officielles, DNS, RDAP). Aucune
 * authentification, aucune base volée, aucun reverse-lookup agressif, aucune
 * reconnaissance faciale, aucune collecte d'enfants. Chaque constat cite sa
 * SOURCE, sa DATE, sa CONFIANCE et sa SENSIBILITÉ.
 *
 * POST /api/search { username?, email?, domain?, phone?, name? }
 */
const http = require("node:http");
const crypto = require("node:crypto");
const dns = require("node:dns").promises;

// Chargement optionnel d'un .env local (jamais committé) — ex. BRAVE_API_KEY.
try {
  const fs = require("node:fs");
  for (const line of fs.readFileSync(__dirname + "/.env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
} catch {}

const PORT = process.env.PORT || 4123;
const UA = "Mozilla/5.0 (compatible; LimierOSINT/1.0; +https://limier.kdl-tech.fr)";
const now = () => new Date().toISOString();
let SEQ = 0;

function item(o) {
  return {
    id: `${o.collector}-${++SEQ}`,
    collector: o.collector,
    type: o.type,
    title: o.title,
    url: o.url || null,
    excerpt: o.excerpt || null,
    detail: o.detail || [],
    source: o.source,
    collectedAt: now(),
    confidence: o.confidence,            // fort | moyen | faible
    reason: o.reason || "",
    sensitivity: o.sensitivity || "public", // public | potentiellement_personnel | sensible
    found: !!o.found,
    status: o.status || (o.found ? "trouvé" : "non trouvé"),
    recommendation: o.recommendation || reco(o),
  };
}
function reco(o) {
  if (o.type === "requete") return "Ouvrir et vérifier manuellement";
  if (!o.found) return "Ignorer";
  if (o.sensitivity === "sensible") return "Prudence — base légale requise";
  if (o.sensitivity === "potentiellement_personnel") return "Vérifier et recouper";
  return "Vérifier la source";
}

async function probe(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(url, { redirect: "follow", signal: ac.signal, headers: { "User-Agent": UA, Accept: "*/*" } });
    const body = await r.text().catch(() => "");
    return { status: r.status, ok: r.ok, body };
  } catch { return { status: 0, ok: false, body: "" }; }
  finally { clearTimeout(t); }
}

// Recherche web via API officielle Brave (légale). Activée si BRAVE_API_KEY est défini.
async function braveSearch(query, key) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=6&country=fr`, {
      signal: ac.signal,
      headers: { Accept: "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": key, "User-Agent": UA },
    });
    if (!r.ok) return { ok: false, status: r.status, results: [] };
    const j = await r.json();
    return { ok: true, status: 200, results: (j.web && j.web.results) || [] };
  } catch { return { ok: false, status: 0, results: [] }; }
  finally { clearTimeout(t); }
}

/* ===================== A. PSEUDO ===================== */
const PLATEFORMES = [
  { n: "GitHub", cat: "Dev", strong: true, url: (u) => `https://github.com/${u}`, via: (u) => `https://api.github.com/users/${u}`, check: async (u) => { const r = await probe(`https://api.github.com/users/${u}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "GitLab", cat: "Dev", strong: true, url: (u) => `https://gitlab.com/${u}`, via: (u) => `https://gitlab.com/api/v4/users?username=${u}`, check: async (u) => { const r = await probe(`https://gitlab.com/api/v4/users?username=${u}`); return { found: r.ok && /"id":/.test(r.body), signal: r.ok ? "API match" : `HTTP ${r.status}` }; } },
  { n: "Dev.to", cat: "Dev", strong: true, url: (u) => `https://dev.to/${u}`, via: (u) => `https://dev.to/api/users/by_username?url=${u}`, check: async (u) => { const r = await probe(`https://dev.to/api/users/by_username?url=${u}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "Docker Hub", cat: "Dev", strong: true, url: (u) => `https://hub.docker.com/u/${u}`, via: (u) => `https://hub.docker.com/v2/users/${u}/`, check: async (u) => { const r = await probe(`https://hub.docker.com/v2/users/${u}/`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "npm", cat: "Dev", strong: true, url: (u) => `https://www.npmjs.com/~${u}`, via: (u) => `https://registry.npmjs.org/-/user/org.couchdb.user:${u}`, check: async (u) => { const r = await probe(`https://registry.npmjs.org/-/user/org.couchdb.user:${u}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "Reddit", cat: "Social", strong: true, url: (u) => `https://www.reddit.com/user/${u}`, via: (u) => `https://www.reddit.com/user/${u}/about.json`, check: async (u) => { const r = await probe(`https://www.reddit.com/user/${u}/about.json`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "HackerNews", cat: "Social", strong: true, url: (u) => `https://news.ycombinator.com/user?id=${u}`, via: (u) => `https://hacker-news.firebaseio.com/v0/user/${u}.json`, check: async (u) => { const r = await probe(`https://hacker-news.firebaseio.com/v0/user/${u}.json`); return { found: r.ok && r.body.trim() !== "null", signal: r.body.trim() === "null" ? "absent" : "objet utilisateur" }; } },
  { n: "Mastodon.social", cat: "Social", strong: false, url: (u) => `https://mastodon.social/@${u}`, via: (u) => `https://mastodon.social/@${u}`, check: async (u) => { const r = await probe(`https://mastodon.social/@${u}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "Wikipedia", cat: "Social", strong: false, url: (u) => `https://en.wikipedia.org/wiki/User:${u}`, via: (u) => `https://en.wikipedia.org/wiki/User:${u}`, check: async (u) => { const r = await probe(`https://en.wikipedia.org/wiki/User:${encodeURIComponent(u)}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "Chess.com", cat: "Jeux", strong: true, url: (u) => `https://www.chess.com/member/${u}`, via: (u) => `https://api.chess.com/pub/player/${u}`, check: async (u) => { const r = await probe(`https://api.chess.com/pub/player/${u.toLowerCase()}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "Lichess", cat: "Jeux", strong: true, url: (u) => `https://lichess.org/@/${u}`, via: (u) => `https://lichess.org/api/user/${u}`, check: async (u) => { const r = await probe(`https://lichess.org/api/user/${u}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "Gravatar", cat: "Identité", strong: true, url: (u) => `https://gravatar.com/${u}`, via: (u) => `https://en.gravatar.com/${u}.json`, check: async (u) => { const r = await probe(`https://en.gravatar.com/${u}.json`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "Keybase", cat: "Identité", strong: true, url: (u) => `https://keybase.io/${u}`, via: (u) => `https://keybase.io/_/api/1.0/user/lookup.json?username=${u}`, check: async (u) => { const r = await probe(`https://keybase.io/_/api/1.0/user/lookup.json?username=${u}`); return { found: r.ok && /"code":\s*0/.test(r.body) && !/"them":\s*null/.test(r.body), signal: "API lookup" }; } },
  { n: "Pastebin", cat: "Autre", strong: false, url: (u) => `https://pastebin.com/u/${u}`, via: (u) => `https://pastebin.com/u/${u}`, check: async (u) => { const r = await probe(`https://pastebin.com/u/${u}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
];

async function moduleUsername(u) {
  const items = await Promise.all(PLATEFORMES.map(async (p) => {
    let found = false, signal = "—";
    try { const r = await p.check(u); found = r.found; signal = r.signal; } catch { signal = "erreur réseau"; }
    return item({ collector: "username", type: "profil", title: `${p.n} — ${p.cat}`, url: p.url(u), source: p.via(u),
      found, confidence: found ? (p.strong ? "fort" : "moyen") : "faible",
      reason: found ? `Présence confirmée par la source (${signal}).` : `Aucune présence (${signal}).`,
      sensitivity: "public", excerpt: signal });
  }));
  items.sort((a, b) => (b.found - a.found) || a.title.localeCompare(b.title));
  return { id: "username", label: "Pseudo", input: u, found: items.filter((i) => i.found).length, total: items.length, items };
}

/* ===================== B. E-MAIL ===================== */
async function moduleEmail(email) {
  email = email.trim();
  const items = [];
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email);
  items.push(item({ collector: "email", type: "email", title: "Syntaxe de l'adresse", found: valid, confidence: valid ? "fort" : "faible", reason: valid ? "Conforme RFC 5322 (simplifiée)." : "Format non conforme.", source: "validation locale", sensitivity: "public", excerpt: valid ? "valide" : "invalide" }));
  if (valid) {
    const domain = email.split("@")[1].toLowerCase();
    let mx = []; try { mx = await dns.resolveMx(domain); } catch {}
    items.push(item({ collector: "email", type: "email", title: "Le domaine peut recevoir des e-mails (MX)", found: mx.length > 0, confidence: mx.length > 0 ? "fort" : "faible", reason: mx.length > 0 ? `${mx.length} enregistrement(s) MX publié(s).` : "Aucun MX — domaine non destiné au courrier.", source: `DNS MX · ${domain}`, sensitivity: "public", excerpt: mx.length ? `${mx.length} MX` : "0 MX" }));
    const hash = crypto.createHash("md5").update(email.toLowerCase()).digest("hex");
    const gr = await probe(`https://en.gravatar.com/${hash}.json`);
    const has = gr.status === 200;
    items.push(item({ collector: "email", type: "profil", title: "Profil Gravatar public lié à l'e-mail", found: has, url: has ? `https://gravatar.com/${hash}` : null, confidence: has ? "fort" : "faible", reason: has ? "Un profil Gravatar public existe pour cette adresse." : `Pas de Gravatar public (HTTP ${gr.status}).`, source: "https://en.gravatar.com/<md5(email)>.json", sensitivity: "potentiellement_personnel", excerpt: `HTTP ${gr.status}` }));
  }
  return { id: "email", label: "E-mail", input: email, found: items.filter((i) => i.found).length, total: items.length, items };
}

/* ===================== C. DOMAINE ===================== */
async function moduleDomain(domain) {
  domain = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  const items = [];
  const r = await probe(`https://rdap.org/domain/${domain}`);
  if (r.status === 200) {
    let j = {}; try { j = JSON.parse(r.body); } catch {}
    const ev = (j.events || []).reduce((a, e) => { a[e.eventAction] = e.eventDate; return a; }, {});
    const reg = (j.entities || []).find((e) => (e.roles || []).includes("registrar"));
    let regName; try { regName = reg.vcardArray[1].find((x) => x[0] === "fn")[3]; } catch {}
    const detail = [regName && `Registrar : ${regName}`, ev.registration && `Créé : ${String(ev.registration).slice(0, 10)}`, ev.expiration && `Expire : ${String(ev.expiration).slice(0, 10)}`, Array.isArray(j.status) && j.status.length && `Statut : ${j.status.join(", ")}`].filter(Boolean);
    items.push(item({ collector: "domain", type: "domaine", title: "Enregistrement du domaine (RDAP / WHOIS)", found: true, confidence: "fort", reason: "Données officielles renvoyées par le registre (RDAP).", detail, url: `https://rdap.org/domain/${domain}`, source: `https://rdap.org/domain/${domain}`, sensitivity: "public", excerpt: regName || "objet RDAP" }));
  } else {
    items.push(item({ collector: "domain", type: "domaine", title: "Enregistrement du domaine (RDAP / WHOIS)", found: false, confidence: "faible", reason: `RDAP HTTP ${r.status} — domaine non enregistré ou TLD non couvert.`, source: `https://rdap.org/domain/${domain}`, sensitivity: "public" }));
  }
  let a = [], ns = [], txt = [];
  try { a = await dns.resolve4(domain); } catch {}
  try { ns = await dns.resolveNs(domain); } catch {}
  try { txt = (await dns.resolveTxt(domain)).map((x) => x.join("")); } catch {}
  const detail = [a.length && `A : ${a.slice(0, 3).join(", ")}`, ns.length && `NS : ${ns.slice(0, 3).join(", ")}`, txt.length && `TXT : ${txt.length} enregistrement(s)`].filter(Boolean);
  items.push(item({ collector: "domain", type: "domaine", title: "Résolution DNS (A / NS / TXT)", found: a.length > 0 || ns.length > 0, confidence: a.length || ns.length ? "fort" : "faible", reason: "Enregistrements DNS publics résolus.", detail, source: "résolveur DNS public", sensitivity: "public", excerpt: `${a.length + ns.length + txt.length} enr.` }));
  return { id: "domain", label: "Domaine", input: domain, found: items.filter((i) => i.found).length, total: items.length, items };
}

/* ===================== D. TÉLÉPHONE (normalisation seule) ===================== */
const INDICATIFS = { "+33": "France", "+1": "Amérique du Nord", "+44": "Royaume-Uni", "+32": "Belgique", "+41": "Suisse", "+49": "Allemagne", "+34": "Espagne", "+39": "Italie", "+212": "Maroc", "+590": "Guadeloupe", "+596": "Martinique", "+594": "Guyane", "+262": "Réunion" };
function modulefPhone(raw) {
  const cleaned = raw.replace(/[^\d+]/g, "");
  let e164 = cleaned;
  if (/^0\d{9}$/.test(cleaned)) e164 = "+33" + cleaned.slice(1); // hypothèse FR si 0X……
  let pays = "inconnu";
  for (const k of Object.keys(INDICATIFS).sort((a, b) => b.length - a.length)) { if (e164.startsWith(k)) { pays = INDICATIFS[k]; break; } }
  const digits = e164.replace(/\D/g, "");
  const plausible = digits.length >= 8 && digits.length <= 15;
  const items = [];
  items.push(item({ collector: "phone", type: "telephone", title: "Numéro normalisé (format E.164)", found: plausible, confidence: plausible ? "moyen" : "faible", reason: plausible ? `Longueur plausible (${digits.length} chiffres). Pays probable : ${pays}. La validité technique n'implique pas l'attribution.` : "Longueur hors plage E.164 (8–15 chiffres).", detail: [`Normalisé : ${e164}`, `Pays probable : ${pays}`], source: "normalisation locale (E.164)", sensitivity: "potentiellement_personnel", excerpt: e164, status: plausible ? "incertain" : "non trouvé" }));
  // Liens de recherche manuelle légale (à ouvrir par l'humain — pas de reverse-lookup automatique)
  const q = encodeURIComponent('"' + e164 + '"');
  items.push(item({ collector: "phone", type: "requete", title: "Recherches manuelles légales (à ouvrir)", found: false, status: "à vérifier", confidence: "faible", reason: "Liens publics à ouvrir manuellement. Limier NE fait PAS de reverse-lookup automatique du propriétaire.", detail: [`Moteur : https://duckduckgo.com/?q=${q}`], url: `https://duckduckgo.com/?q=${q}`, source: "requête publique générée", sensitivity: "sensible" }));
  return { id: "phone", label: "Téléphone", input: e164, found: items.filter((i) => i.found).length, total: items.length, items };
}

/* ===================== E. NOM → requêtes web prêtes (fallback sans API) ===================== */
async function moduleName(name, ctx) {
  const full = [name, ctx.city, ctx.employer].filter(Boolean).join(" ");
  const q = (s) => encodeURIComponent(s);
  const out = [];
  const key = process.env.BRAVE_API_KEY;

  // A. Recherche web via API officielle Brave (si clé configurée) — résultats réels et sourcés.
  if (key) {
    const { ok, results } = await braveSearch(full || name, key);
    for (const w of results.slice(0, 6)) {
      out.push(item({ collector: "name", type: "page_web", title: w.title || w.url, url: w.url,
        excerpt: (w.description || "").replace(/<[^>]+>/g, ""), found: true, status: "trouvé",
        confidence: "moyen", reason: "Résultat renvoyé par l'API officielle Brave Search pour cette requête (à recouper).",
        source: "Brave Search API", sensitivity: "potentiellement_personnel" }));
    }
    if (!ok) out.push(item({ collector: "name", type: "requete", title: "Recherche web (API Brave)", found: false, status: "indisponible", confidence: "faible", reason: "API Brave momentanément indisponible — repli sur les liens manuels.", source: "Brave Search API", sensitivity: "public" }));
  }

  // B. Toujours : quelques requêtes légales prêtes à ouvrir (vérification manuelle, pas de scraping).
  const ready = [
    { n: "Google", u: `https://www.google.com/search?q=${q('"' + name + '" ' + (ctx.city || ""))}` },
    { n: "LinkedIn (public)", u: `https://www.bing.com/search?q=${q('site:linkedin.com/in "' + name + '"')}` },
  ];
  for (const x of ready) {
    out.push(item({ collector: "name", type: "requete", title: `Recherche prête : ${x.n}`, url: x.u, found: false, status: "à vérifier",
      confidence: "faible", reason: key ? "Lien public complémentaire à ouvrir manuellement." : "Aucune clé d'API : Limier ne scrape pas les moteurs — ouvre le lien pour vérifier toi-même.",
      detail: [`Requête : ${full}`], source: "requête publique générée (non scrapée)", sensitivity: "public" }));
  }
  return { id: "name", label: "Nom / recherche web", input: full, found: out.filter((i) => i.found).length, total: out.length, items: out };
}

function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" }); return res.end(); }
  if (req.method === "GET" && req.url.startsWith("/api/health")) { return send(res, 200, { ok: true, service: "limier-api", version: "1.0", platforms: PLATEFORMES.length, modules: ["username", "email", "domain", "phone", "name"], searchApi: !!process.env.BRAVE_API_KEY }); }
  if (req.method === "POST" && req.url.startsWith("/api/search")) {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 2e4) req.destroy(); });
    req.on("end", async () => {
      let b = {}; try { b = JSON.parse(data || "{}"); } catch {}
      const username = String(b.username || "").trim().replace(/^@/, "");
      const email = String(b.email || "").trim();
      const domain = String(b.domain || "").trim();
      const phone = String(b.phone || "").trim();
      const name = String(b.name || "").trim();
      const ctx = { city: String(b.city || "").trim(), employer: String(b.employer || "").trim() };
      const jobs = [];
      if (/^[A-Za-z0-9._-]{1,40}$/.test(username)) jobs.push(moduleUsername(username));
      if (email) jobs.push(moduleEmail(email));
      if (domain) jobs.push(moduleDomain(domain));
      if (phone) jobs.push(Promise.resolve(modulefPhone(phone)));
      if (name) jobs.push(moduleName(name, ctx));
      if (!jobs.length) return send(res, 400, { error: "Fournis au moins un pseudo, e-mail, domaine, téléphone ou nom." });
      const t0 = Date.now();
      SEQ = 0;
      const modules = await Promise.all(jobs);
      send(res, 200, {
        subject: { username: username || null, email: email || null, domain: domain || null, phone: phone || null, name: name || null },
        ranAt: now(), durationMs: Date.now() - t0,
        methodology: "Sources publiques & légales uniquement : API officielles, DNS, RDAP (WHOIS), normalisation locale. Aucune authentification, aucune base volée, aucun reverse-lookup automatique, aucune reconnaissance faciale.",
        identityNote: "Limier ne garantit pas l'identité. L'existence d'un élément est sourcée ; l'appartenance à une même personne doit être recoupée. Les données sensibles sont signalées.",
        modules,
      });
    });
    return;
  }
  send(res, 404, { error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => console.log(`limier-api v1 écoute sur 127.0.0.1:${PORT}`));
