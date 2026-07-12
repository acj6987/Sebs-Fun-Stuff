# 🦉 Fauna — An Illustrated Animal Encyclopedia

A beautifully laid-out, static animal encyclopedia. Browse species with rich
descriptions and imagery, organised the way nature is — by **genus**, family,
and taxonomic class.

## Features

- **Genus-first organisation.** Species are grouped under their genus with the
  full taxonomic path (Class › Order › Family). Switch grouping to *class* or a
  flat A–Z list at any time.
- **Rich detail view.** Click any animal for a full-screen card: a descriptive
  essay, a taxonomy strip, quick-facts (conservation status, habitat, range,
  diet, size, lifespan) and a "Did you know?" list.
- **Instant search & filters.** Search across names, scientific names, genus,
  habitat and description; filter by animal group (Mammals, Birds, Reptiles,
  Amphibians, Fish, Invertebrates). Press `/` to jump to the search box.
- **Light & dark themes** with the toggle in the header (your choice is
  remembered).
- **Responsive** — a fluid card grid from phone to widescreen.
- **No build step, no dependencies.** Plain HTML, CSS and vanilla JavaScript.

## Running it

Just open `index.html` in a browser. Because the animal data is loaded as a
plain `<script>`, no local server is required — though you can run one if you
prefer:

```bash
npx http-server .    # then visit the printed URL
```

Images are served from [Wikimedia Commons](https://commons.wikimedia.org). If
an image is ever unavailable, a lettered placeholder is shown automatically.

## Project structure

```
index.html          Page shell (header, hero, controls, footer)
css/styles.css       Design tokens, layout, cards, and modal
js/app.js            Search, filtering, genus grouping, and the detail modal
data/animals.js      The dataset — one object per species
```

## Adding an animal

The encyclopedia is data-driven: to add a species, append one object to the
`ANIMALS` array in [`data/animals.js`](data/animals.js). The UI groups and
counts everything automatically.

```js
{
  name: "Common Name",
  scientificName: "Genus species",
  genus: "Genus",
  family: "Familyidae",
  order: "Order",
  class: "Class",
  group: "Mammals",              // Mammals | Birds | Reptiles | Amphibians | Fish | Invertebrates
  habitat: "Where it lives",
  range: "Geographic range",
  diet: "Carnivore",
  status: "Least Concern",       // drives the coloured conservation badge
  size: "…",
  lifespan: "…",
  image: wiki("Wikimedia_File_Name.jpg"),
  description: "A rich paragraph…",
  facts: ["Fun fact one.", "Fun fact two."],
}
```

The `wiki()` helper builds a stable image URL from a Wikimedia Commons file
name. Recognised `status` values light up the conservation badge; anything else
falls back to a neutral colour.
