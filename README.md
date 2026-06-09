<div align="center">

# 🛰️ OSINT Trace

**Recherche d'empreinte numérique en sources ouvertes — éthique et légale.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22d3ee.svg)](LICENSE)
![Tauri](https://img.shields.io/badge/Tauri-2-24c8db)
![React](https://img.shields.io/badge/React-19-61dafb)

</div>

---

## ⚠️ Usage responsable

OSINT Trace agrège **uniquement des informations publiquement accessibles**, dans un
cadre **légal**. Au démarrage, l'application impose le choix d'une **base légale**
(RGPD, art. 6) et la journalise :

- 🧍 **votre propre** empreinte numérique ;
- 🤝 une personne **consentante** ;
- 🕵️ un **cadre professionnel légitime** (enquête, journalisme, conformité).

L'outil **n'accède jamais** à des bases de données volées, ni à du contenu derrière
authentification, et **ne contourne** aucune protection. Le profilage d'un tiers sans
base légale est interdit. **Vous êtes responsable de l'usage que vous en faites.**

## ✨ Fonctionnalités

- Recherche multi-éléments : nom, prénom(s), e-mail, pseudo, **téléphone (actuel ou ancien)**, ville, employeur…
- Collecteurs modulaires sur **sources publiques** : pseudos (multi-plateformes),
  e-mail & fuites publiques, téléphone, domaines/WHOIS, réseaux sociaux publics,
  recherche d'images, moteurs & archives.
- **Journal d'investigation** en temps réel.
- Traitement **local-first** : les données restent sur votre machine.
- Interface sobre « console d'investigation » (thème sombre).

## 🧱 Stack

| Couche | Techno |
|---|---|
| Cœur multiplateforme | **Tauri 2** (Rust) → Windows `.exe`, Android `.apk`, Linux, macOS, web |
| Interface | **React 19 + Vite + TypeScript** |
| Design | **Tailwind CSS v4 + shadcn/ui** |
| Collecte | Backend **Rust** (requêtes réseau sans CORS) |

## 🚀 Développement

```bash
npm install
npm run dev          # interface web (http://localhost:5173)
npm run tauri dev    # application de bureau (nécessite Rust + webkit2gtk)
```

### Builds
```bash
npm run tauri build              # .exe / binaire bureau
npm run tauri android build      # .apk (toolchain Android requise)
```

## 🗺️ Feuille de route

- [x] Fondation Tauri + UI + thème
- [x] Portail base légale (RGPD) + journalisation
- [ ] Moteur de collecte Rust (1er collecteur : pseudos)
- [ ] Graphe de liens entre entités
- [ ] Export de rapport (PDF / JSON)
- [ ] Packaging `.exe` et `.apk`

## 📄 Licence

[MIT](LICENSE) © 2026 Karim DeLucia (KDL)
