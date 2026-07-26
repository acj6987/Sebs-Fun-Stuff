#!/usr/bin/env python3
"""
CROSS FEATHER — a 3D-printable Beyblade-style spinning top.

Two double-tipped feathers crossed at 90 degrees form the blade. Everything
is parametric: tweak PARAMS and re-run to regenerate the STLs, previews and
the dimensioned blueprint SVG.

Outputs (written next to this script):
  cross_feather_blade.stl     - piece A: blade + hub + grip stem (prints flat,
                                no supports)
  cross_feather_tip.stl       - piece B: performance tip (prints upside-down,
                                no supports); glues into the recess under A
  cross_feather_onepiece.stl  - both pieces fused, for resin printers
  preview_*.png               - render previews
  blueprint.svg               - dimensioned blueprint sheet

Requires: numpy, shapely, trimesh, manifold3d, matplotlib
    pip install numpy shapely trimesh manifold3d matplotlib
"""

import numpy as np
import trimesh
from shapely.geometry import Polygon, LineString, Point
from shapely.affinity import rotate as shp_rotate
from shapely.ops import unary_union
from pathlib import Path

OUT = Path(__file__).parent

# ============================================================= parameters ==
P = dict(
    # feather (one of the two crossed vanes)
    feather_len   = 55.0,   # tip-to-tip length  -> overall blade span
    feather_wid   = 14.0,   # max width of a feather
    blade_h       = 4.2,    # blade slab thickness
    rachis_wid    = 2.6,    # feather shaft ridge width
    rachis_h      = 1.4,    # ridge height above blade top
    groove_depth  = 0.65,   # engraved barb grooves
    groove_wid    = 0.9,

    # hub / stem
    hub_r         = 11.0,
    hub_h         = 7.0,
    ring_h        = 1.2,    # decorative ring + X emboss on hub top
    stem_r        = 4.6,    # hex grip stem (circumradius)
    stem_top      = 15.0,   # z of stem top
    flange_r      = 7.2,    # finger flange
    flange_h      = 1.8,

    # tip (piece B)
    boss_r        = 9.95,   # centering boss (fits recess in A)
    boss_h        = 1.15,
    recess_r      = 10.15,  # recess under hub (0.2 clearance on diameter)
    recess_h      = 1.25,
    tip_cone_r    = 8.5,
    tip_cone_h    = 7.5,
    tip_ball_r    = 2.2,
)

ENGINE = 'manifold'


def union(meshes):
    return trimesh.boolean.union(meshes, engine=ENGINE)


def difference(a, b):
    return trimesh.boolean.difference([a, b], engine=ENGINE)


def extrude(geom, height):
    """Extrude a Polygon or MultiPolygon into one mesh."""
    geoms = geom.geoms if geom.geom_type == 'MultiPolygon' else [geom]
    meshes = [trimesh.creation.extrude_polygon(g, height) for g in geoms
              if g.area > 1e-6]
    return meshes[0] if len(meshes) == 1 else union(meshes)


def cyl(r, z0, z1, sections=96):
    c = trimesh.creation.cylinder(radius=r, height=z1 - z0, sections=sections)
    c.apply_translation([0, 0, (z0 + z1) / 2])
    return c


# ========================================================== 2D feather ====
def half_width(x):
    """Feather half-width profile along its axis (lens with soft points)."""
    L, W = P['feather_len'], P['feather_wid']
    t = np.clip(np.abs(2 * x / L), 0, 1)
    return (W / 2) * np.maximum(0, 1 - t ** 2.2) ** 0.75


def feather_polygon():
    """One double-tipped feather along the X axis, serrated, 180deg-symmetric."""
    L = P['feather_len']
    xs = np.linspace(-L / 2, L / 2, 241)
    hw = half_width(xs)
    top = list(zip(xs, hw))
    bot = list(zip(xs[::-1], -hw[::-1]))
    poly = Polygon(top + bot).buffer(0)

    # barb serrations: small angled wedges cut from the edges. A notch at
    # (x, +edge) is mirrored at (-x, -edge) so the vane stays spin-balanced.
    wedges = []
    for xi in np.arange(-L / 2 + 9, L / 2 - 8, 5.0):
        y = float(half_width(np.array([xi + 1.2]))[0])
        w_up = Polygon([(xi - 0.3, y + 1.0), (xi + 3.4, y + 1.0), (xi + 1.0, y - 2.1)])
        wedges.append(w_up)
        wedges.append(shp_rotate(w_up, 180, origin=(0, 0)))
    # deeper split near each tip (real feathers part near the tip)
    for s in (1, -1):
        xt = s * (L / 2 - 7.5)
        y = float(half_width(np.array([xt]))[0])
        slit = Polygon([(xt - 0.6, s * (y + 1)), (xt + 0.9 * s + 0.6, s * (y + 1)),
                        (xt + 2.2 * s, s * (y - 4.5))])
        wedges.append(slit)
    poly = poly.difference(unary_union(wedges)).buffer(0)
    # keep the largest piece in case a sliver detaches
    if poly.geom_type == 'MultiPolygon':
        poly = max(poly.geoms, key=lambda g: g.area)
    return poly


def groove_polygons():
    """Barb grooves for BOTH feathers (engraved into the blade top)."""
    L = P['feather_len']
    gw = P['groove_wid'] / 2
    lines = []
    for xi in np.concatenate([np.arange(16, L / 2 - 6, 4.5),
                              -np.arange(16, L / 2 - 6, 4.5)]):
        for s in (1, -1):
            xe = xi + 2.8
            ye = s * max(1.5, float(half_width(np.array([xe]))[0]) - 1.2)
            lines.append(LineString([(xi, s * 1.9), (xe, ye)]).buffer(gw))
    one = unary_union(lines)
    both = unary_union([one, shp_rotate(one, 90, origin=(0, 0))])
    return both


# ========================================================== solids ========
def build_blade_unit(recess=True):
    """Piece A: crossed feathers + hub + hex stem + flange, recess underneath."""
    f = feather_polygon()
    cross = unary_union([f, shp_rotate(f, 90, origin=(0, 0))]).buffer(0)
    blade = extrude(cross, P['blade_h'])

    # rachis ridges (capsule along each feather axis)
    cap = LineString([(-P['feather_len'] / 2 + 5, 0),
                      (P['feather_len'] / 2 - 5, 0)]).buffer(P['rachis_wid'] / 2)
    ridges = unary_union([cap, shp_rotate(cap, 90, origin=(0, 0))])
    ridge_m = extrude(ridges, P['rachis_h'])
    ridge_m.apply_translation([0, 0, P['blade_h']])

    hub = cyl(P['hub_r'], 0, P['hub_h'])

    # hub-top decoration: ring + diagonal X (sits between the feather arms)
    ring2d = Point(0, 0).buffer(9.3).difference(Point(0, 0).buffer(7.2))
    xbar = LineString([(-7.8, 0), (7.8, 0)]).buffer(1.1)
    deco2d = unary_union([ring2d,
                          shp_rotate(xbar, 45, origin=(0, 0)),
                          shp_rotate(xbar, -45, origin=(0, 0))])
    deco = extrude(deco2d, P['ring_h'])
    deco.apply_translation([0, 0, P['hub_h']])

    stem = cyl(P['stem_r'], P['hub_h'], P['stem_top'], sections=6)
    flange = cyl(P['flange_r'], P['stem_top'], P['stem_top'] + P['flange_h'],
                 sections=12)

    solid = union([blade, ridge_m, hub, deco, stem, flange])

    # engrave barb grooves into the blade top
    gr = extrude(groove_polygons(), P['groove_depth'] + 0.4)
    gr.apply_translation([0, 0, P['blade_h'] - P['groove_depth']])
    solid = difference(solid, gr)

    # centering recess for the tip boss
    if recess:
        solid = difference(solid, cyl(P['recess_r'], -0.2, P['recess_h']))
    return solid


def build_tip(with_boss=True):
    """Piece B: centering boss + cone + ball point (z=0 is the hub underside)."""
    parts = []
    if with_boss:
        parts.append(cyl(P['boss_r'], 0, P['boss_h']))
    cone = trimesh.creation.cone(radius=P['tip_cone_r'], height=P['tip_cone_h'],
                                 sections=96)
    cone.apply_transform(trimesh.transformations.rotation_matrix(np.pi, [1, 0, 0]))
    # cone now spans z 0..-tip_cone_h with the base at z=0
    parts.append(cone)
    ball = trimesh.creation.icosphere(subdivisions=3, radius=P['tip_ball_r'])
    ball.apply_translation([0, 0, -(P['tip_cone_h'] - 1.3)])
    parts.append(ball)
    return union(parts)


# ========================================================== previews ======
def render_previews(mesh):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt

    m = mesh.copy()
    views = [('top', 90, -90), ('iso', 28, -55), ('side', 4, -90)]
    for name, elev, azim in views:
        fig = plt.figure(figsize=(7, 7), dpi=110)
        ax = fig.add_subplot(111, projection='3d')
        ax.plot_trisurf(m.vertices[:, 0], m.vertices[:, 1], m.faces,
                        m.vertices[:, 2], color='#33e0ff', edgecolor='none',
                        shade=True, alpha=1.0)
        ax.view_init(elev=elev, azim=azim)
        r = 34
        ax.set_xlim(-r, r); ax.set_ylim(-r, r); ax.set_zlim(-r + 20, r + 20)
        ax.set_box_aspect((1, 1, 1))
        ax.set_axis_off()
        fig.patch.set_facecolor('#0b1020')
        fig.tight_layout(pad=0)
        fig.savefig(OUT / f'preview_{name}.png', facecolor='#0b1020')
        plt.close(fig)


# ========================================================== blueprint =====
def make_blueprint(blade_poly):
    """Dimensioned cyanotype-style blueprint sheet as SVG."""
    L = P['feather_len']
    W, H = 1040, 740
    ink, dim = '#cfe4ff', '#8fb4e8'

    def path_of(poly, scale, cx, cy):
        pts = np.array(poly.exterior.coords)
        d = f'M {cx + pts[0][0]*scale:.1f} {cy - pts[0][1]*scale:.1f} '
        d += ' '.join(f'L {cx + x*scale:.1f} {cy - y*scale:.1f}' for x, y in pts[1:])
        return d + ' Z'

    s = 5.2                       # top view scale (px per mm)
    cx, cy = 300, 300             # top view center
    sv_s = 5.2                    # side view scale
    svx, svy = 790, 268           # side view: x center, z=0 line

    cross = unary_union([blade_poly, shp_rotate(blade_poly, 90, origin=(0, 0))])
    if cross.geom_type == 'MultiPolygon':
        cross = max(cross.geoms, key=lambda g: g.area)

    def dim_h(x1, x2, y, label):
        return (f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" class="d"/>'
                f'<line x1="{x1}" y1="{y-5}" x2="{x1}" y2="{y+5}" class="d"/>'
                f'<line x1="{x2}" y1="{y-5}" x2="{x2}" y2="{y+5}" class="d"/>'
                f'<text x="{(x1+x2)/2}" y="{y-7}" class="dt">{label}</text>')

    def dim_v(x, y1, y2, label):
        return (f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2}" class="d"/>'
                f'<line x1="{x-5}" y1="{y1}" x2="{x+5}" y2="{y1}" class="d"/>'
                f'<line x1="{x-5}" y1="{y2}" x2="{x+5}" y2="{y2}" class="d"/>'
                f'<text x="{x+9}" y="{(y1+y2)/2+4}" class="dt">{label}</text>')

    # ---- side view silhouette (piece A + B assembled), built from params
    def X(x):  # world mm -> svg px
        return svx + x * sv_s

    def Y(z):  # z up in mm -> svg px (z=0 is the hub underside)
        return svy - z * sv_s

    def R(x0, z0, x1, z1):  # rect in side view
        return (f'<rect x="{X(x0):.1f}" y="{Y(z1):.1f}" '
                f'width="{(x1-x0)*sv_s:.1f}" height="{(z1-z0)*sv_s:.1f}" class="s"/>')

    ball_z = -(P['tip_cone_h'] - 1.3)          # ball center
    side = [
        R(-L/2, 0, L/2, P['blade_h']),                              # blade slab
        R(-P['hub_r'], P['blade_h'], P['hub_r'], P['hub_h']),       # hub above blade
        R(-9.3, P['hub_h'], 9.3, P['hub_h'] + P['ring_h']),         # deco ring
        R(-P['stem_r'], P['hub_h'] + P['ring_h'], P['stem_r'], P['stem_top']),
        R(-P['flange_r'], P['stem_top'], P['flange_r'],
          P['stem_top'] + P['flange_h']),
        # tip cone (trapezoid down to the ball) + ball point
        (f'<polygon class="s" points="'
         f'{X(-P["tip_cone_r"]):.1f},{Y(0):.1f} '
         f'{X(P["tip_cone_r"]):.1f},{Y(0):.1f} '
         f'{X(1.6):.1f},{Y(ball_z):.1f} '
         f'{X(-1.6):.1f},{Y(ball_z):.1f}"/>'),
        f'<circle class="s" cx="{svx}" cy="{Y(ball_z):.1f}" r="{P["tip_ball_r"]*sv_s:.1f}"/>',
    ]

    top_h = P['stem_top'] + P['flange_h']
    tip_low = -ball_z + P['tip_ball_r']

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="Segoe UI, system-ui, sans-serif">
<style>
 .s {{ fill: none; stroke: {ink}; stroke-width: 1.6; }}
 .thin {{ fill: none; stroke: {ink}; stroke-width: 0.8; opacity: 0.65; }}
 .cl {{ stroke: {dim}; stroke-width: 0.7; stroke-dasharray: 14 4 3 4; opacity: 0.8; }}
 .d {{ stroke: {dim}; stroke-width: 0.9; }}
 .dt {{ fill: {ink}; font-size: 13px; text-anchor: middle; font-weight: 600; }}
 .lbl {{ fill: {ink}; font-size: 12px; }}
 .ttl {{ fill: {ink}; font-size: 20px; font-weight: 800; letter-spacing: 2px; }}
 .sub {{ fill: {dim}; font-size: 11px; letter-spacing: 1px; }}
 .grid {{ stroke: #1d4a8f; stroke-width: 0.5; }}
</style>
<rect width="{W}" height="{H}" fill="#0b2a5b"/>
{''.join(f'<line class="grid" x1="{x}" y1="0" x2="{x}" y2="{H}"/>' for x in range(0, W, 40))}
{''.join(f'<line class="grid" x1="0" y1="{y}" x2="{W}" y2="{y}"/>' for y in range(0, H, 40))}
<rect x="14" y="14" width="{W-28}" height="{H-28}" fill="none" stroke="{ink}" stroke-width="2"/>

<text x="34" y="52" class="ttl">CROSS FEATHER</text>
<text x="34" y="72" class="sub">TWIN-FEATHER X BLADE · SPINNING TOP · FAN-MADE, NOT AN OFFICIAL PART</text>

<!-- ============ TOP VIEW ============ -->
<text x="{cx}" y="{cy - 172}" class="dt">TOP VIEW</text>
<path class="s" d="{path_of(cross, s, cx, cy)}"/>
<circle class="thin" cx="{cx}" cy="{cy}" r="{P['hub_r']*s:.0f}"/>
<circle class="thin" cx="{cx}" cy="{cy}" r="{9.3*s:.0f}"/>
<circle class="thin" cx="{cx}" cy="{cy}" r="{P['stem_r']*s:.0f}"/>
<line class="cl" x1="{cx - 165}" y1="{cy}" x2="{cx + 165}" y2="{cy}"/>
<line class="cl" x1="{cx}" y1="{cy - 165}" x2="{cx}" y2="{cy + 165}"/>
{dim_h(cx - L/2*s, cx + L/2*s, cy + L/2*s + 26, f'{L:.0f} mm SPAN')}
{dim_v(cx - L/2*s - 24, cy - P['feather_wid']/2*s, cy + P['feather_wid']/2*s, f'{P["feather_wid"]:.0f}')}
<text x="{cx + 78}" y="{cy - 78}" class="lbl">BARB SERRATIONS</text>
<text x="{cx + 78}" y="{cy - 64}" class="lbl">(SPIN-BALANCED)</text>
<text x="{cx - 150}" y="{cy + 110}" class="lbl">RACHIS RIDGE +{P['rachis_h']}</text>
<text x="{cx + 60}" y="{cy + 96}" class="lbl">HUB Ø{P['hub_r']*2:.0f}</text>

<!-- ============ SIDE VIEW ============ -->
<text x="{svx}" y="{svy - top_h*sv_s - 52}" class="dt">SIDE VIEW (ASSEMBLED)</text>
{''.join(side)}
<line class="cl" x1="{svx}" y1="{svy - top_h*sv_s - 16}" x2="{svx}" y2="{svy + tip_low*sv_s + 16}"/>
{dim_v(svx + L/2*sv_s + 30, svy - top_h*sv_s, svy + tip_low*sv_s, f'{top_h + tip_low:.1f} TOTAL')}
{dim_v(svx - L/2*sv_s - 30, svy, svy + tip_low*sv_s, f'{tip_low:.1f}')}
{dim_h(svx - P['flange_r']*sv_s, svx + P['flange_r']*sv_s, svy - top_h*sv_s - 28, f'Ø{P["flange_r"]*2:.1f}')}
<text x="{svx + 100}" y="{svy + 34}" class="lbl">TIP: 49° CONE +</text>
<text x="{svx + 100}" y="{svy + 48}" class="lbl">Ø{P['tip_ball_r']*2:.1f} BALL POINT</text>
<text x="{svx - 232}" y="{svy - 56}" class="lbl">HEX STEM {P['stem_r']*2:.0f} A/C</text>
<text x="{svx - 232}" y="{svy - 42}" class="lbl">HUB Ø{P['hub_r']*2:.0f}</text>
<text x="{svx - 232}" y="{svy + 22}" class="lbl">BOSS Ø{P['boss_r']*2:.1f} × {P['boss_h']}</text>
<text x="{svx - 232}" y="{svy + 36}" class="lbl">GLUES INTO RECESS</text>
<text x="{svx - 232}" y="{svy + 50}" class="lbl">Ø{P['recess_r']*2:.1f} × {P['recess_h']}</text>

<!-- ============ PRINT SPEC ============ -->
<g transform="translate(34, 520)">
  <text class="dt" x="150" y="0" style="text-anchor:start">PRINT SPECIFICATION</text>
  <text class="lbl" x="0" y="24">MATERIAL &#160;&#160; PLA or PETG (PETG for battle durability)</text>
  <text class="lbl" x="0" y="42">LAYER &#160;&#160;&#160;&#160;&#160;&#160;&#160; 0.12–0.16 mm &#160;·&#160; NOZZLE 0.4 mm</text>
  <text class="lbl" x="0" y="60">INFILL &#160;&#160;&#160;&#160;&#160;&#160;&#160; 100% (spin mass matters)</text>
  <text class="lbl" x="0" y="78">WALLS &#160;&#160;&#160;&#160;&#160;&#160;&#160; 4 perimeters</text>
  <text class="lbl" x="0" y="96">SUPPORTS &#160;&#160; NONE — both pieces print flat</text>
  <text class="lbl" x="0" y="114">PIECE A &#160;&#160;&#160;&#160;&#160; blade unit, blade-face down</text>
  <text class="lbl" x="0" y="132">PIECE B &#160;&#160;&#160;&#160;&#160; tip, boss-face down (cone up)</text>
  <text class="lbl" x="0" y="150">ASSEMBLY &#160;&#160; CA glue in recess, press boss home, true by eye while wet</text>
</g>

<!-- title block -->
<g transform="translate({W-330}, {H-120})">
  <rect width="300" height="90" fill="none" stroke="{ink}" stroke-width="1.4"/>
  <line x1="0" y1="30" x2="300" y2="30" class="d"/>
  <line x1="0" y1="60" x2="300" y2="60" class="d"/>
  <text class="lbl" x="10" y="20">PART: CROSS FEATHER SPINNING TOP</text>
  <text class="lbl" x="10" y="50">UNITS: mm &#160;·&#160; SCALE ~{s:.0f}:1 &#160;·&#160; SHEET 1/1</text>
  <text class="lbl" x="10" y="80">SEB'S FUN STUFF · REV A</text>
</g>
</svg>'''
    (OUT / 'blueprint.svg').write_text(svg)


# ========================================================== main ==========
def main():
    print('building piece A (blade unit)…')
    blade_unit = build_blade_unit()
    print('  watertight:', blade_unit.is_watertight)

    print('building piece B (tip)…')
    tip = build_tip()
    print('  watertight:', tip.is_watertight)

    print('fusing one-piece variant…')
    one = union([build_blade_unit(recess=False), build_tip(with_boss=False)])
    print('  watertight:', one.is_watertight)

    blade_unit.export(OUT / 'cross_feather_blade.stl')
    tip.export(OUT / 'cross_feather_tip.stl')
    one.export(OUT / 'cross_feather_onepiece.stl')

    rho = 1.24 / 1000  # PLA g/mm^3
    print(f'\npiece A volume {blade_unit.volume/1000:.1f} cm³, ~{blade_unit.volume*rho:.1f} g in PLA')
    print(f'piece B volume {tip.volume/1000:.1f} cm³, ~{tip.volume*rho:.1f} g')
    print(f'assembled size: {one.extents[0]:.1f} × {one.extents[1]:.1f} × {one.extents[2]:.1f} mm')

    print('rendering previews…')
    render_previews(one)
    print('drawing blueprint…')
    make_blueprint(feather_polygon())
    print('done — files in', OUT)


if __name__ == '__main__':
    main()
