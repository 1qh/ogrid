# POC Build Workflow

This file tracks the step-by-step build of the ogrid POC. Each step is a self-contained session. A fresh Claude session reads this file to know exactly what to do next.

**Rules for every session:**
- Read `POC.md` thoroughly before starting any step
- Commit and push incrementally (small frequent commits)
- No AI tooling in commits
- Never use `--no-verify`
- Never ignore `no-unsafe-*` lint rules
- Don't use `any` — find a way
- Only code when everything is clear, ask if unsure

---

## Status Tracker

| Step | Description | Status |
|------|-------------|--------|
| 0 | Project scaffold | not started |
| 1 | constrainSize runtime behavior | not started |
| 2 | Scroll inside cell (drag vs scroll) | not started |
| 3 | ResizeObserver measurement → re-render | not started |
| 4 | Collision mode decision | not started |
| 5 | Content-driven auto-sizing (first render) | not started |
| 6 | Row spanning | not started |
| 7 | Freeform placement with gaps | not started |
| 8 | Drag to empty cell | not started |
| 9 | Drag handle + interactive content | not started |
| 10 | Smooth transitions | not started |
| 11 | Responsive behavior (768px breakpoint) | not started |
| 12 | Cell className + content centering | not started |
| 13 | Dynamic minH after width resize | not started |
| 14 | Auto-placement (computeLayout) | not started |
| 15 | Column count change + reflow | not started |
| 16 | New item into existing layout | not started |
| 17 | Overlap prevention (all scenarios) | not started |
| 18 | Ring on outer div follows resize | not started |
| 19 | Grid unit conversion accuracy | not started |
| 20 | Minimal DOM (2 divs per item) | not started |
| 21 | Dense grid + constraint deadlock | not started |
| 22 | ResizeObserver stabilization | not started |
| 23 | Tailwind v4 + RGL CSS compatibility | not started |
| 24 | Stale layout (userResized flag) | not started |
| 25 | Dynamic content after mount | not started |
| 26 | onLayoutChange reliability | not started |
| 27 | Async data loading auto-sizing | not started |
| 28 | Margin interaction with content sizing | not started |
| 29 | Responsive boundary transition | not started |
| 30 | First-render measurement sequence | not started |
| 31 | SSR and hydration | not started |
| 32 | Click handler without drag interference | not started |
| 33 | Scale test (25 items) | not started |

---

## Step 0 — Project scaffold

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

Build Step 0 (project scaffold). Follow the POC structure in POC.md:
- Next.js app at ogrid/apps/poc/ (App Router)
- Pin react-grid-layout@2.2.3
- Tailwind v4
- Placeholder widgets (kpi-card, chart, data-table, tall-widget, text-widget) with simple static content
- page.tsx with a raw <GridLayout> showing 3-4 hardcoded items
- No measurement logic yet, just prove RGL renders

After completing, update the status tracker in POC-WORKFLOW.md to "done" for Step 0.
Commit and push incrementally.
```

---

## Step 1 — constrainSize runtime behavior (Phase A, go/no-go)

**What:** Prove `constrainSize` actually prevents undersized resize at runtime. This is a go/no-go test.

**Depends on:** Step 0

**Build:**
- Add a grid-level `constrainSize` that clamps `h` to a hardcoded minimum (e.g., `minH: 3`)
- Add a data-table widget with enough content to be ~3 rows tall
- Resize the table smaller — it must STOP at 3 rows, no snap-back, no flicker
- Also test per-item constraint (on one specific widget)
- Console log every `constrainSize` call: item id, proposed w/h, returned w/h

**User verifies:**
1. Resize the data table — it stops at 3 rows (no visual snap-back)
2. Resize a chart widget — it shrinks freely (no constraint on charts)
3. Console shows `constrainSize` firing on every resize frame

**Go/no-go:** If `constrainSize` doesn't prevent undersized resize (snap-back or ignored), we fall back to `minW`/`minH` on layout items. Document which approach works.

**Continuation prompt:**
```
Read /home/huylq42/vb/ogrid/POC-WORKFLOW.md and /home/huylq42/vb/ogrid/POC.md.

Build Step 1 (constrainSize runtime behavior). This is a Phase A go/no-go test.

The scaffold from Step 0 is complete. Now:
- Add a grid-level constrainSize that clamps h to a hardcoded minimum (e.g., 3 rows) for one widget
- The data-table widget should have enough content to be ~3 rows tall
- Resize the table — must stop at 3 rows with NO snap-back
- Also test per-item constrainSize on one widget
- Console.log every constrainSize call (item id, proposed w/h, returned w/h)
- Test that a "chart" widget WITHOUT the constraint shrinks freely

Key context from POC.md pre-POC investigation:
- constrainSize context has layout:[] (EMPTY) — cannot access neighbors
- constrainSize fires during RESIZE only, not drag
- The built-in aspectRatio constraint demonstrates the pattern

After completing, update the status tracker in POC-WORKFLOW.md.
Commit and push incrementally.
```

---

## Step 2 — Scroll inside cell (Phase A, go/no-go)

**What:** Prove that a cell with `overflow: auto` can scroll its content without triggering a drag. This is a potential showstopper — if scroll gestures conflict with drag, the entire UX breaks.

**Depends on:** Step 0

**Build:**
- Add a widget with more content than fits in its cell (overflowing text or a long table)
- Cell inner div has `overflow: auto`
- Use `draggableHandle` to restrict drag to a grip icon
- Test: scroll inside the widget content area
- Test: drag from the grip icon

**User verifies:**
1. Scrolling inside the widget works (mousewheel and touch-drag in content area)
2. Dragging from the grip icon works
3. Clicking buttons/links inside the widget works
4. No conflict between scroll and drag gestures

**Go/no-go:** If scroll inside cells doesn't work with `draggableHandle`, we need an alternative drag trigger (e.g., drag only from a header bar).

**Continuation prompt:**
```
Read /home/huylq42/vb/ogrid/POC-WORKFLOW.md and /home/huylq42/vb/ogrid/POC.md.

Build Step 2 (scroll inside cell). This is a Phase A go/no-go test.

The scaffold from Step 0 is complete. Now:
- One widget must have MORE content than fits in its cell (e.g., a long text or many table rows)
- The inner cell div uses overflow: auto
- Use draggableHandle (CSS selector for a grip icon) to restrict drag initiation
- Verify: scrolling inside widget content does NOT trigger drag
- Verify: dragging from grip icon works normally
- Verify: buttons/links inside widgets remain clickable

Key context from POC.md:
- draggableHandle is a CSS selector, RGL supports it natively
- This tests the drag vs scroll conflict that could be a showstopper

After completing, update the status tracker in POC-WORKFLOW.md.
Commit and push incrementally.
```

---

## Step 3 — ResizeObserver measurement triggers re-render (Phase A, go/no-go)

**What:** Prove that ResizeObserver can measure content height, convert to grid units, and update the layout via setState — without infinite loops or flicker.

**Depends on:** Step 0

**Build:**
- Single ResizeObserver instance observing all item inner divs
- On callback: read content height, convert to grid `h` units: `h = Math.ceil((contentHeight + 1 + marginY) / (rowHeight + marginY))`
- Batch updates via RAF: collect all changed measurements in one RAF, single setState
- Update the layout with measured `h` values
- Console log: observer callback count per item, total setState calls
- Test with 3-4 items of varying content heights

**User verifies:**
1. Items render with heights matching their content (not all the same height)
2. Console shows observer stabilizes within 3 callbacks per item
3. No infinite re-render loop (check React DevTools or console)
4. No visible flicker (items don't jump around)

**Go/no-go:** If ResizeObserver → setState causes infinite loops, we need a different measurement approach (e.g., one-shot measurement on mount only).

**Continuation prompt:**
```
Read /home/huylq42/vb/ogrid/POC-WORKFLOW.md and /home/huylq42/vb/ogrid/POC.md.

Build Step 3 (ResizeObserver measurement). This is a Phase A go/no-go test.

The scaffold from Step 0 is complete. Now:
- Create a single ResizeObserver that observes all item inner divs
- On callback: measure content height, convert to grid h units using:
  h = Math.ceil((contentHeight + 1 + marginY) / (rowHeight + marginY))
  The +1 is a stabilization buffer (see POC.md)
- Batch via RAF: collect all changed items in one requestAnimationFrame, single setState
- Update layout with measured h values
- Console.log: callback count per item, total setState calls
- Test with 3-4 items of different content heights

Key context from POC.md:
- measurementsRef (Map of itemId → {width, height}) updated synchronously
- RAF batches all changes into one setState per frame
- Must stabilize within 3 callbacks per item
- The +1 buffer prevents oscillation at row boundaries

After completing, update the status tracker in POC-WORKFLOW.md.
Commit and push incrementally.
```

---

## Step 4 — Collision mode decision (Phase A, go/no-go)

**What:** Test both `preventCollision: true` and `preventCollision: false` with `compactType: null`. Pick the default.

**Depends on:** Step 0

**Build:**
- A toggle button switching between `preventCollision` true/false
- 3-4 items in a grid with `compactType: null`
- Test drag-onto-occupied with each mode
- Test resize-into-neighbor with each mode
- Console log collision events

**User verifies:**
1. `preventCollision: false` — drag item A onto B. Does B push predictably? Does it go off-grid?
2. `preventCollision: true` — drag item A onto B. A snaps back.
3. Resize into neighbor under both modes
4. User decides which mode feels better for dashboards

**Go/no-go:** One mode must produce acceptable UX. If neither works, fallback is `preventCollision: true` with visual indicator (red placeholder for rejected drops).

**Continuation prompt:**
```
Read /home/huylq42/vb/ogrid/POC-WORKFLOW.md and /home/huylq42/vb/ogrid/POC.md.

Build Step 4 (collision mode decision). This is a Phase A go/no-go test.

The scaffold from Step 0 is complete. Now:
- Add a toggle button for preventCollision true/false
- Use compactType: null (freeform)
- 3-4 items in the grid
- Test drag-onto-occupied under both modes
- Test resize-into-neighbor under both modes
- Log collision/overlap events to console

Key context from POC.md:
- preventCollision:false (default) allows push but with compactType:null push direction may be unpredictable
- preventCollision:true rejects the drop (Android home screen behavior)
- constrainSize does NOT fire during drag — only minW/minH protects during drag collision
- If preventCollision:false causes overlap in dense layouts AND preventCollision:true rejects too many drops, fallback is preventCollision:true + visual red placeholder

After completing, update the status tracker in POC-WORKFLOW.md.
Document which mode you recommend and why.
Commit and push incrementally.
```

---

## Steps 5–32 — Phase B (all remaining tests)

Each step tests one section from POC.md. After Phase A passes, the user will give a "proceed to Step N" prompt. Each step follows the same pattern:

1. Read POC-WORKFLOW.md and POC.md
2. Build the specific test
3. User verifies visually
4. Update status tracker
5. Commit and push

Steps 5–32 are listed in the status tracker above. Detailed continuation prompts will be written after Phase A is complete, since the collision mode decision (Step 4) affects how many later steps are implemented.

---

## Step 33 — Scale test (25 items) — Phase C

**What:** The final test. 25 items, measure everything.

**Depends on:** All Phase B steps complete

**Build:**
- 25 widgets (mix of types)
- One widget with 1.5s simulated async data load
- Measure and log:
  - Perceived loading time (opacity:0 → opacity:1)
  - Drag fps (using performance.now() around RAF)
  - Measurement-phase setState call count
  - React component re-render count (React DevTools Profiler or manual counter)
  - computeLayout execution time

**User verifies:**
1. All 25 items render correctly
2. Drag is smooth (target 60fps, acceptable ≥45fps)
3. Measurement phase doesn't feel slow
4. Console metrics are within acceptable ranges

**Continuation prompt:** Will be written after Phase B is complete.

---

## How to use this file

1. Check the **Status Tracker** to find the next `not started` step
2. Copy the **Continuation prompt** for that step
3. Paste it into a fresh Claude session
4. After the session completes, verify the results yourself in the browser
5. If it passes, move to the next step
6. If it fails, discuss with Claude in the same session to diagnose and fix
