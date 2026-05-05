# 🌐 ACTOOS Vitrine Corporate

Site vitrine statique pour **actoos.com** - Le Hub du Groupe ACTOOS.

## 🚀 Stack Technique

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **100% Statique** (SSG - Static Site Generation)

## 📦 Installation

```bash
cd vitrine
npm install
```

## 💻 Développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## 🏗️ Build & Export

```bash
npm run build
```

Le site statique sera généré dans le dossier `out/`.

## 🚀 Déploiement

### Vercel (Recommandé)

1. Connecter le repo GitHub
2. Sélectionner le dossier `vitrine/` comme root
3. Framework: Next.js
4. Deploy!

### Netlify

1. Build command: `npm run build`
2. Publish directory: `out`

### Cloudflare Pages

1. Build command: `npm run build`
2. Build output directory: `out`

### Hébergement statique (S3, GCS, etc.)

1. `npm run build`
2. Upload le contenu de `out/` vers votre bucket
3. Configurer le bucket en mode "static website"

## 📁 Structure

```
vitrine/
├── app/
│   ├── globals.css      # Styles globaux + Tailwind
│   ├── layout.tsx       # Layout avec metadata SEO
│   └── page.tsx         # Page principale
├── public/
│   ├── logo-icon.png    # Favicon / Icône
│   ├── logo-actoos.png  # Logo avec texte
│   └── logo-actoos-slogan.png  # Logo + slogan
├── next.config.js       # Config Next.js (export statique)
├── tailwind.config.js   # Config Tailwind
└── package.json
```

## 🎨 Design

- **Palette** : Slate & Gold (#D4AF37)
- **Inspiration** : Stripe, Vercel, Apple
- **Responsive** : Mobile-first

## 🔗 Liens Produits

- **actoos.com** → Ce site (Hub)
- **pro.actoos.com** → ACTOOS PRO (SaaS B2B)
- **one.actoos.com** → ACTOOS ONE (Super-App)

---

*© 2026 ACTOOS Group*
