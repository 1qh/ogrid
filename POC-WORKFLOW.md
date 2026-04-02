# POC Build Workflow

This file tracks the build of the ogrid POC across 4 sessions (1 per phase). A fresh Claude session reads this file to know exactly what to do next.

**Rules for every session:**
- Read `POC.md` thoroughly before starting
- Commit and push incrementally (small frequent commits)
- No AI tooling in commits
- Never use `--no-verify`
- Never ignore `no-unsafe-*` lint rules
- Don't use `any` — find a way
- Only code when everything is clear, ask if unsure

---

## Status Tracker

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Project scaffold | not started |
| A | Go/no-go tests (constrainSize, scroll, ResizeObserver, collision mode) | not started |
| B | All remaining tests with chosen collision mode | not started |
| C | Scale test at 25 items | not started |

---

## Phase 0 — Project scaffold

**What:** Set up the Next.js app with react-grid-layout@2.2.3 pinned, Tailwind v4, and placeholder widgets.

**Build:**
- Next.js app at `ogrid/apps/poc/` (App Router)
- Install and pin `react-grid-layout@2.2.3`
- Tailwind v4 setup
- Create placeholder widgets: `kpi-card.tsx`, `chart.tsx`, `data-table.tsx`, `tall-widget.tsx`, `text-widget.tsx`
- Each widget renders simple static content (no measurement logic yet)
- Basic `page.tsx` that renders a raw `<GridLayout>` with 3-4 hardcoded items
- Verify: page loads, items render in a grid, no errors

**User verifies:** The page loads at `localhost:3000` with items visible in a grid layout.

**Continuation prompt:**
```
Read /home/huylq42/vb/ogrid/POC-WORKFLOW.md and /home/huylq42/vb/ogrid/POC.md.

Build Phase 0 (project scaffold). Follow the POC structure in POC.md:
- Next.js app at ogrid/apps/poc/ (App Router)
- Pin react-grid-layout@2.2.3
- Tailwind v4
- Placeholder widgets (kpi-card, chart, data-table, tall-widget, text-widget) with simple static content
- page.tsx with a raw <GridLayout> showing 3-4 hardcoded items
- No measurement logic yet, just prove RGL renders

After completing, update the status tracker in POC-WORKFLOW.md to "done" for Phase 0.
Commit and push incrementally.
```

---

## Phase A — Go/no-go tests

**What:** Four tests that determine whether the approach is viable. All in one session, built incrementally on the Phase 0 scaffold.

**Tests:**

1. **constrainSize runtime behavior** — Add a grid-level `constrainSize` that clamps `h` to a hardcoded minimum (e.g., 3 rows). Resize the data-table — it must stop at 3 rows, no snap-back. A chart without the constraint shrinks freely. Console.log every constrainSize call. Also test per-item constraint. If constrainSize doesn't work, fall back to `minW`/`minH`.

2. **Scroll inside cell** — One widget has more content than fits (overflow: auto on inner div). Use `draggableHandle` for a grip icon. Scrolling inside the widget must NOT trigger drag. Dragging from grip works. Buttons/links inside remain clickable. If scroll conflicts with drag, we need an alternative drag trigger.

3. **ResizeObserver measurement → re-render** — Single ResizeObserver on all items. Measure content height, convert to grid `h`: `Math.ceil((contentHeight + 1 + marginY) / (rowHeight + marginY))`. Batch via RAF into single setState. Must stabilize within 3 callbacks per item. No infinite loops, no flicker.

4. **Collision mode decision** — Toggle between `preventCollision` true/false with `compactType: null`. Test drag-onto-occupied and resize-into-neighbor under both modes. Document which mode works better.

**User verifies (in browser):**
- Resize data-table — stops at minimum, no snap-back
- Resize chart — shrinks freely
- Scroll inside a widget — no drag triggered
- Drag from grip icon — works
- Click buttons inside widget — works
- Items have correct auto-measured heights
- No console errors, no infinite loops
- Drag-onto-occupied under both collision modes — user picks the mode

**Continuation prompt:**
```
Read /home/huylq42/vb/ogrid/POC-WORKFLOW.md and /home/huylq42/vb/ogrid/POC.md.

Build Phase A (go/no-go tests). The Phase 0 scaffold is complete. Build all 4 tests incrementally, committing after each one:

1. constrainSize: grid-level constraint clamping h to min 3 rows for data-table. Per-item constraint on one widget. Console.log all constrainSize calls. Chart shrinks freely (no constraint).

2. Scroll inside cell: one widget with overflow:auto content. draggableHandle on grip icon. Verify scroll doesn't trigger drag, buttons remain clickable.

3. ResizeObserver measurement: single observer on all items. h = Math.ceil((contentHeight + 1 + marginY) / (rowHeight + marginY)). RAF-batched setState. Log callback counts. Must stabilize, no infinite loops.

4. Collision mode: toggle button for preventCollision true/false. compactType: null. Test drag-onto-occupied and resize-into-neighbor under both modes. Document recommendation.

Key context from POC.md pre-POC investigation:
- constrainSize context has layout:[] (EMPTY) — cannot access neighbors
- constrainSize fires during RESIZE only, not drag
- RGL does NOT set overflow on item wrappers (overflow:visible by default)
- RGL uses CSS transforms (translate3d) for positioning

After completing, update the status tracker in POC-WORKFLOW.md to "done" for Phase A.
Commit and push incrementally.
```

---

## Phase B — All remaining tests

**What:** All POC.md validation points not covered by Phase A, using the collision mode chosen in Phase A. One session, built incrementally.

**Tests (from POC.md):**
- Content-driven auto-sizing on first render (opacity:0 → measure → opacity:1)
- Row spanning (tall chart next to stacked KPI cards)
- Freeform placement with gaps (compactType: null, gaps persist)
- Drag to empty cell
- Drag handle + interactive content
- Smooth transitions (CSS transitions on position changes)
- Responsive behavior (768px breakpoint, freeform ↔ compact)
- Cell className + content centering
- Dynamic minH after width resize
- Auto-placement (computeLayout for items without explicit x/y)
- Column count change + reflow (computeLayout runs BEFORE RGL)
- New item into existing freeform layout
- Overlap prevention (all scenarios: drag, resize, column change)
- Ring on outer div follows resize
- Grid unit conversion accuracy
- Minimal DOM (2 divs per item max)
- Dense grid + constraint deadlock
- ResizeObserver stabilization (no oscillation)
- Tailwind v4 + RGL CSS compatibility
- Stale layout (userResized flag)
- Dynamic content after mount (measurement window closes, content scrolls)
- onLayoutChange reliability
- Async data loading auto-sizing (1.5s delay widget)
- Margin interaction with content sizing
- Responsive boundary transition (rapid 768px crossing)
- First-render measurement sequence (2-phase computeLayout)
- SSR and hydration
- Click handler without drag interference

**User verifies:** Each test is verifiable in the browser. Claude will describe what to check after each commit.

**Continuation prompt:** Will be written after Phase A is complete and collision mode is decided.

---

## Phase C — Scale test (25 items)

**What:** 25 widgets. Measure performance.

**Build:**
- 25 widgets (mix of types: KPI cards, charts, tables, text)
- One widget with 1.5s simulated async data load (async-table.tsx)
- One widget with non-monotonic height (layout-switch.tsx)
- Measure and log:
  - Perceived loading time (opacity:0 → opacity:1)
  - Drag fps (performance.now() around RAF)
  - Measurement-phase setState call count
  - React component re-render count
  - computeLayout execution time

**User verifies:**
- All 25 items render correctly
- Drag feels smooth (target 60fps, acceptable ≥45fps, showstopper <30fps)
- Measurement phase doesn't feel sluggish
- Console metrics look reasonable

**Continuation prompt:** Will be written after Phase B is complete.

---

## How to use this file

1. Check the **Status Tracker** for the next `not started` phase
2. Copy the **Continuation prompt** for that phase
3. Paste into a fresh Claude session
4. After the session completes, verify results in your browser
5. If something fails, discuss in the same session to diagnose/fix
6. Move to the next phase
