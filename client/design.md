# Design: Movie Rental

**Character:** night sky cinema. Deep navy surfaces lit by a sky blue accent, soft glows instead of hard edges.

**Tokens live in** `src/styles.css` `:root` (colors, `--s-1`…`--s-7` spacing scale, radii, `--glow`, `--ease`). Edit values there, not here.

## Build mandate
- Sky blue (`--accent` #38BDF8, `--accent-strong` #0EA5E9) is for accents, buttons, links, active states. Navy (#0B1B33, #0F2A4D, #071527) is for backgrounds and panels.
- Text on a sky fill is always `--on-accent` (#06243F). White on sky blue fails WCAG AA, never use it.
- Amber (`--warn`) stays reserved for rental time (countdown, rented state, test banner); gold for ratings; red only for errors and destructive actions.
- Interactive surfaces respond with lift plus glow (cards, stat cards) or a sky tint (rows, tabs, chips). Respect `prefers-reduced-motion` and `hover: none`.
- Breakpoints: 1024 / 768 / 480 / 359. Keep mobile first behaviors (hamburger, sticky rent bar, edge to edge player).
