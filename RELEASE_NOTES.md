# Limier — Notes de version

## v0.1.0 (V1) — 2026-06-09

Première version réellement exploitable, **legal by design**.

### Ajouté
- **Portail base légale obligatoire** avant toute recherche (4 bases + engagement anti-abus), journalisé localement.
- **Backend de collecte** (Node, sous PM2) — résultats réels et sourcés :
  - Pseudo : présence sur 14 plateformes publiques (API/HTTP officiels).
  - Domaine : RDAP/WHOIS + DNS (A/NS/TXT/MX).
  - E-mail : syntaxe + MX + Gravatar public.
  - Téléphone : normalisation E.164 (pays probable) — **aucun reverse-lookup**.
  - Nom : requêtes web légales prêtes à ouvrir (ou API Brave si `BRAVE_API_KEY`).
- **Rapport d'enquête** : chaque résultat avec source, URL, date, confiance, sensibilité, raison, action recommandée.
- **Masquage des données sensibles** par défaut + badges (confiance/sensibilité).
- **Export Markdown**, filtres (trouvés, confiance), copie de citation.
- **PWA** installable (manifest + service worker), thème sombre, responsive mobile.
- Pages **À propos / usage responsable** et **Sources & limites**.

### Sécurité
- Audit du dépôt : **aucun secret** committé. `.gitignore` durci (`.env`, clés, certs).

### Volontairement limité (pour rester légal)
- Pas de doxxing, bases volées, reconnaissance faciale, profilage d'enfants.
- Téléphone : pas de recherche automatique du propriétaire.
- Moteurs web : pas de scraping — requêtes prêtes à ouvrir si pas de clé API officielle.

### Déploiement
- Web : https://limier.kdl-tech.fr (nginx + HTTPS), backend PM2 `limier-api`, proxy `/api/`.

### Prochain pas recommandé
- Brancher une **API de recherche officielle** (Brave/Bing) via `.env` pour le module Nom.
