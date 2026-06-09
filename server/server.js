/*
 * Limier — backend d'enquête OSINT (sources publiques uniquement).
 * Node >= 18 (fetch global). Aucune dépendance. Aucun stockage.
 *
 * Principe : ne PAS empiler des résultats en vrac. Chaque constat
 * - cite sa SOURCE (l'endpoint public interrogé),
 * - porte un NIVEAU DE CONFIANCE,
 * - alimente un rapport vérifiable.
 *
 * Endpoint : POST /api/search { username } -> présence sur plateformes publiques.
 */
const http = require("node:http");

const PORT = process.env.PORT || 4123;
const UA = "Mozilla/5.0 (compatible; LimierOSINT/0.1; +https://limier.kdl-tech.fr)";

async function probe(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(url, { redirect: "follow", signal: ac.signal,
      headers: { "User-Agent": UA, Accept: "*/*" } });
    const body = await r.text().catch(() => "");
    return { status: r.status, ok: r.ok, body };
  } catch {
    return { status: 0, ok: false, body: "" };
  } finally { clearTimeout(t); }
}

/*
 * Chaque plateforme :
 *  - url   : page profil lisible par un humain (pour vérification manuelle)
 *  - via   : SOURCE réellement interrogée (endpoint public) -> citée dans le rapport
 *  - check : renvoie { found, signal } où signal = preuve technique (ex. "HTTP 200")
 *  - conf  : niveau de confiance de la méthode quand found = true
 */
const PLATEFORMES = [
  { n: "GitHub", cat: "Dev", conf: "confirmé",
    url: (u) => `https://github.com/${u}`, via: (u) => `https://api.github.com/users/${u}`,
    check: async (u) => { const r = await probe(`https://api.github.com/users/${u}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "GitLab", cat: "Dev", conf: "confirmé",
    url: (u) => `https://gitlab.com/${u}`, via: (u) => `https://gitlab.com/api/v4/users?username=${u}`,
    check: async (u) => { const r = await probe(`https://gitlab.com/api/v4/users?username=${u}`); return { found: r.ok && /"id":/.test(r.body), signal: r.ok ? "API user match" : `HTTP ${r.status}` }; } },
  { n: "Dev.to", cat: "Dev", conf: "confirmé",
    url: (u) => `https://dev.to/${u}`, via: (u) => `https://dev.to/api/users/by_username?url=${u}`,
    check: async (u) => { const r = await probe(`https://dev.to/api/users/by_username?url=${u}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "Docker Hub", cat: "Dev", conf: "confirmé",
    url: (u) => `https://hub.docker.com/u/${u}`, via: (u) => `https://hub.docker.com/v2/users/${u}/`,
    check: async (u) => { const r = await probe(`https://hub.docker.com/v2/users/${u}/`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "npm", cat: "Dev", conf: "confirmé",
    url: (u) => `https://www.npmjs.com/~${u}`, via: (u) => `https://registry.npmjs.org/-/user/org.couchdb.user:${u}`,
    check: async (u) => { const r = await probe(`https://registry.npmjs.org/-/user/org.couchdb.user:${u}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "Reddit", cat: "Social", conf: "confirmé",
    url: (u) => `https://www.reddit.com/user/${u}`, via: (u) => `https://www.reddit.com/user/${u}/about.json`,
    check: async (u) => { const r = await probe(`https://www.reddit.com/user/${u}/about.json`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "HackerNews", cat: "Social", conf: "confirmé",
    url: (u) => `https://news.ycombinator.com/user?id=${u}`, via: (u) => `https://hacker-news.firebaseio.com/v0/user/${u}.json`,
    check: async (u) => { const r = await probe(`https://hacker-news.firebaseio.com/v0/user/${u}.json`); return { found: r.ok && r.body.trim() !== "null", signal: r.body.trim() === "null" ? "absent" : "objet utilisateur" }; } },
  { n: "Mastodon.social", cat: "Social", conf: "probable",
    url: (u) => `https://mastodon.social/@${u}`, via: (u) => `https://mastodon.social/@${u}`,
    check: async (u) => { const r = await probe(`https://mastodon.social/@${u}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "Wikipedia", cat: "Social", conf: "probable",
    url: (u) => `https://en.wikipedia.org/wiki/User:${u}`, via: (u) => `https://en.wikipedia.org/wiki/User:${u}`,
    check: async (u) => { const r = await probe(`https://en.wikipedia.org/wiki/User:${encodeURIComponent(u)}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "Chess.com", cat: "Jeux", conf: "confirmé",
    url: (u) => `https://www.chess.com/member/${u}`, via: (u) => `https://api.chess.com/pub/player/${u}`,
    check: async (u) => { const r = await probe(`https://api.chess.com/pub/player/${u.toLowerCase()}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "Lichess", cat: "Jeux", conf: "confirmé",
    url: (u) => `https://lichess.org/@/${u}`, via: (u) => `https://lichess.org/api/user/${u}`,
    check: async (u) => { const r = await probe(`https://lichess.org/api/user/${u}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "Gravatar", cat: "Identité", conf: "confirmé",
    url: (u) => `https://gravatar.com/${u}`, via: (u) => `https://en.gravatar.com/${u}.json`,
    check: async (u) => { const r = await probe(`https://en.gravatar.com/${u}.json`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
  { n: "Keybase", cat: "Identité", conf: "confirmé",
    url: (u) => `https://keybase.io/${u}`, via: (u) => `https://keybase.io/_/api/1.0/user/lookup.json?username=${u}`,
    check: async (u) => { const r = await probe(`https://keybase.io/_/api/1.0/user/lookup.json?username=${u}`); return { found: r.ok && /"code":\s*0/.test(r.body) && !/"them":\s*null/.test(r.body), signal: "API lookup" }; } },
  { n: "Pastebin", cat: "Autre", conf: "probable",
    url: (u) => `https://pastebin.com/u/${u}`, via: (u) => `https://pastebin.com/u/${u}`,
    check: async (u) => { const r = await probe(`https://pastebin.com/u/${u}`); return { found: r.status === 200, signal: `HTTP ${r.status}` }; } },
];

function send(res, code, obj) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" });
    return res.end();
  }
  if (req.method === "GET" && req.url.startsWith("/api/health")) {
    return send(res, 200, { ok: true, service: "limier-api", platforms: PLATEFORMES.length });
  }
  if (req.method === "POST" && req.url.startsWith("/api/search")) {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 1e4) req.destroy(); });
    req.on("end", async () => {
      let body = {};
      try { body = JSON.parse(data || "{}"); } catch {}
      const u = String(body.username || "").trim().replace(/^@/, "");
      if (!/^[A-Za-z0-9._-]{1,40}$/.test(u)) {
        return send(res, 400, { error: "Pseudo invalide ou manquant (lettres, chiffres, . _ -)." });
      }
      const t0 = Date.now();
      const results = await Promise.all(
        PLATEFORMES.map(async (p) => {
          let found = false, signal = "—";
          try { const r = await p.check(u); found = r.found; signal = r.signal; } catch (e) { signal = "erreur réseau"; }
          return {
            platform: p.n,
            category: p.cat,
            url: p.url(u),          // à vérifier par l'humain
            source: p.via(u),       // SOURCE interrogée (citée)
            found,
            confidence: found ? p.conf : null,
            signal,                 // preuve technique
          };
        })
      );
      results.sort((a, b) => (b.found - a.found) || a.category.localeCompare(b.category) || a.platform.localeCompare(b.platform));
      send(res, 200, {
        subject: u,
        found: results.filter((r) => r.found).length,
        total: results.length,
        durationMs: Date.now() - t0,
        ranAt: new Date().toISOString(),
        methodology:
          "Présence vérifiée via les API/endpoints publics de chaque plateforme (code HTTP ou objet renvoyé). Aucune authentification, aucune source privée.",
        identityNote:
          "L'EXISTENCE d'un compte portant ce pseudo est confirmée par la source. L'APPARTENANCE à une même personne n'est PAS établie : un pseudo identique doit être recoupé (photo, e-mail, recoupements) avant toute conclusion.",
        results,
      });
    });
    return;
  }
  send(res, 404, { error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => console.log(`limier-api écoute sur 127.0.0.1:${PORT}`));
