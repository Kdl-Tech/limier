<div align="center">

# 🐕 Limier

**Recherche OSINT légale en sources ouvertes.**
Assistant d'enquête open-source — collecte, classe, cite ses sources, note la confiance.

[![License: MIT](https://img.shields.io/badge/License-MIT-22d3ee.svg)](LICENSE)
![PWA](https://img.shields.io/badge/PWA-installable-24c8db)
![React](https://img.shields.io/badge/React-19-61dafb)

🌐 **Démo : https://limier.kdl-tech.fr**

</div>

---

## ⚠️ Usage responsable (legal by design)

Limier agrège **uniquement** des informations **publiques et légales**. Avant toute
recherche, l'utilisateur doit déclarer une **base légale** (RGPD) :

1. Ma propre empreinte numérique
2. Une personne ayant donné son consentement
3. Recherche généalogique / familiale non intrusive
4. Investigation professionnelle encadrée

…et accepter de **ne pas** utiliser Limier pour harceler, profiler illégalement,
doxxer ou surveiller une personne.

### Ce que Limier **ne fait pas**
- ❌ Pas de recherche d'adresse/téléphone privé d'un tiers, pas de doxxing.
- ❌ Pas de bases volées, pas de contournement de connexion, pas de data brokers douteux.
- ❌ Pas de reconnaissance faciale, pas de collecte/profilage d'enfants.
- ❌ Pas de scraping agressif des moteurs (requêtes « prêtes à ouvrir » à la place).

## ✨ Fonctionnalités V1 (résultats réels & sourcés)

| Module | Méthode (légale) | Statut |
|---|---|---|
| **Pseudo** | présence sur 14 plateformes publiques (API/HTTP officiels) | ✅ réel |
| **Domaine** | RDAP/WHOIS + DNS (A/NS/TXT/MX) | ✅ réel |
| **E-mail** | syntaxe + MX du domaine + Gravatar public | ✅ réel |
| **Téléphone** | normalisation E.164 + pays probable (aucun reverse-lookup) | 🟡 normalisation |
| **Nom** | requêtes web légales prêtes à ouvrir (ou API officielle si clé) | 🟡 liens |

Chaque résultat porte : **source, URL, date de collecte, confiance** (fort/moyen/faible),
**sensibilité** (public / personnel possible / sensible), **raison du score**, **action recommandée**.
Les éléments **sensibles sont masqués par défaut**. Export du rapport en **Markdown**.

## 🧱 Stack

- **Frontend** : React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui — **PWA** installable, thème sombre.
- **Backend** : Node (zéro dépendance, `fetch` global), `server/server.js` — sous PM2.
- **Sources** : API publiques des plateformes, DNS, RDAP. Aucune authentification.

## 🚀 Installation (dev)

```bash
npm install
npm run dev                 # interface web (http://localhost:5173)
node server/server.js       # backend de collecte (http://127.0.0.1:4123)
```

En local, le frontend appelle automatiquement l'API de production si aucun backend local.

### Build
```bash
npm run build               # -> dist/ (statique + PWA)
npm run lint
```

## 🔧 Variables d'environnement (backend)

| Variable | Rôle | Défaut |
|---|---|---|
| `PORT` | port d'écoute du backend | `4123` |
| `BRAVE_API_KEY` | (optionnel) recherche web via API officielle Brave ; **si absent**, Limier ne scrape pas et fournit des requêtes prêtes à ouvrir | — |

> Les clés ne sont **jamais** committées : placez-les dans un `.env` (ignoré par git).

## 🌐 Déploiement (référence)

- `dist/` servi en statique par **nginx** (HTTPS via Let's Encrypt).
- `server/server.js` lancé sous **PM2** ; nginx proxifie `/api/` vers `127.0.0.1:4123`.
- Healthcheck : `GET /api/health`.

## 🧪 Modèle de résultat

```jsonc
{ "id", "collector", "type", "title", "url", "excerpt", "detail": [],
  "source", "collectedAt", "confidence": "fort|moyen|faible",
  "reason", "sensitivity": "public|potentiellement_personnel|sensible",
  "found", "status", "recommendation" }
```

## 🧭 Limites

Limier **ne garantit pas l'identité** : un même pseudo n'implique pas la même personne.
Les résultats sont des **pistes à vérifier** via leurs sources. Toujours recouper.

## 📄 Licence

[MIT](LICENSE) © 2026 Karim DeLucia (KDL)
