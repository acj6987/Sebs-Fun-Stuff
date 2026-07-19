# 🍷 Seb's Complete Wine Guide

An illustrated reference to **every major type of wine in the world** — 53 wines across
7 families:

- **Red wines** — Cabernet Sauvignon, Merlot, Pinot Noir, Syrah/Shiraz, Malbec, Zinfandel, Sangiovese, Tempranillo, Nebbiolo, Grenache, Barbera, Cabernet Franc, Gamay, Carménère, Pinotage, Mourvèdre, Petite Sirah
- **White wines** — Chardonnay, Sauvignon Blanc, Riesling, Pinot Grigio/Gris, Gewürztraminer, Chenin Blanc, Viognier, Albariño, Grüner Veltliner, Sémillon, Muscat/Moscato, Torrontés, Verdejo, Vermentino
- **Rosé wines** — Provence Rosé, White Zinfandel, Rosato & Rosado
- **Sparkling wines** — Champagne, Prosecco, Cava, Crémant, Franciacorta, Lambrusco, Sparkling Rosé
- **Dessert wines** — Sauternes, Ice Wine, Tokaji Aszú, Late Harvest, Vin Santo, Moscato d'Asti
- **Fortified wines** — Port, Sherry, Madeira, Marsala, Vermouth
- **Orange & skin-contact wines** — the 8,000-year-old Georgian tradition

Every wine has:

- 🎨 a **detailed illustration** (hand-drawn SVG — the glass shape and wine colour are true to each style)
- 📊 a tasting profile (body, sweetness, tannin, acidity)
- 🌍 origin, key regions, alcohol level, serving temperature and glassware
- 👅 flavour notes and 🍽️ food pairings
- 🍇 five or six **fascinating facts** — nearly 300 across the site

## Running it

No build, no dependencies, no internet needed. Just open the page:

```
open wine-guide/index.html        # macOS
xdg-open wine-guide/index.html    # Linux
```

Or serve it: `python3 -m http.server` and browse to `/wine-guide/`.

## How it's built

- `index.html` — the page shell
- `css/styles.css` — cellar-dark theme, responsive grid, modal
- `js/wines.js` — all the wine data (add a wine here and it appears automatically)
- `js/app.js` — SVG illustration engine, search, category filters, detail modal

Plain HTML/CSS/JS — every illustration is generated SVG, so the whole site works
offline as a single folder.
