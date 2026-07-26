# CROSS FEATHER — 3D-printable Beyblade-style top 🪶✕🪶

Two double-tipped feathers crossed at 90° form an X-shaped blade: serrated
barb edges, raised rachis (shaft) ridges, engraved barbs, and a ball-point
performance tip. Every feature is 180°-rotationally symmetric so the top
spins balanced.

> Fan-made original design — not an official Beyblade part and not
> compatible with Takara Tomy launchers.

## Files

| File | What it is |
|---|---|
| `blueprint.svg` | Dimensioned blueprint sheet (views, dims, print spec) |
| `cross_feather_blade.stl` | **Piece A** — blade + hub + grip stem |
| `cross_feather_tip.stl` | **Piece B** — cone + ball performance tip |
| `cross_feather_onepiece.stl` | Both fused, for resin printers |
| `generate.py` | Parametric generator — edit `P`, re-run, everything regenerates |
| `preview_*.png` | Render previews |

## Print it

Both pieces print **flat with zero supports** (that's why it's two pieces):

- **Piece A**: blade-face down, exactly as exported
- **Piece B**: boss-face down (cone pointing up) — its 49° cone needs no support
- PLA or PETG (PETG survives battles better) · 0.12–0.16 mm layers ·
  **100% infill** (spin mass = spin time) · 4 walls

**Assembly**: drop of CA glue in the recess under the hub, press the tip's
boss home, spin it gently on the tip while the glue is wet to check it runs
true. Total ~8 g, 55 × 55 × 25 mm.

**Spin it**: grip the hex stem / flange and rip it like a dreidel — or drill
a 2 mm hole through the stem and use a string pull.

**Heavyweight mod**: epoxy a steel M12 fender washer centered over the hub
ring for real battle mass.

## Remix it

`generate.py` is the true blueprint — fully parametric. Want a 70 mm span,
a needle tip, or fatter feathers? Change `P` at the top and re-run:

```bash
pip install numpy shapely trimesh manifold3d matplotlib
python3 generate.py
```
