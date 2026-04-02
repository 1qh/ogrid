# ogrid — Proof of Concept

## Why this exists

We built a dashboard grid library called flexity. It took 30+ hours. It had great developer experience — zero config, type safety, visual dev tools, copy/paste workflow, content-aware resize clamping. Then we realized the layout engine (flexbox) couldn't do the one thing every dashboard needs: a tall chart sitting next to two stacked KPI cards. Row spanning. Flexbox can't do it.

This POC validates the next attempt before we invest another 30+ hours.

**Note:** The flexity repo contains an older IDEA.md that describes a flexbox-based architecture with pixel-level `w`/`h`, no `x`/`y` positioning, and a wrap compactor. That spec is abandoned. This POC.md is the new spec. The architecture is fundamentally different: CSS Grid positioning via react-grid-layout, column/row spans instead of pixels, freeform `x`/`y` placement instead of flow order. Every design decision from flexity's IDEA.md should be considered superseded unless explicitly carried forward here.

## Motivation

Every dashboard needs a grid where developers drop in widgets and visually tune the layout in the browser. Resize, drag, style, copy the config, paste into code. Done.

The problem: no existing solution combines all of these:

- **Zero config** — items auto-size from content, no explicit dimensions needed
- **Freeform 2D placement** — items placed anywhere on the grid, gaps allowed, no auto-compaction
- **Row/column spanning** — tall items next to stacked short items
- **Content-aware resize** — the grid cell can never be resized smaller than its content
- **Visual dev tools** — hover to see boundaries, click to configure, copy to commit
- **One source of truth** — the layout config is the single place all sizing/placement lives

react-grid-layout solves layout + drag + resize. But it requires explicit dimensions for every item, has no content-aware resize clamping, and has no dev tooling layer. Developers must guess sizes and manually set minimums.

ogrid wraps react-grid-layout with the missing pieces: auto-sizing, content-aware constraints, and a developer experience layer.

## Philosophy

- **Zero config works** — drop items in, they arrange themselves sensibly
- **Content is sacred** — the grid respects content boundaries, never clips or crushes
- **Fill by default** — the inner cell div fills the RGL positioning div. Components render at natural flow inside it. Centering is opt-in via `className`. See "Content centered in cell" and "First-render measurement sequence" for details
- **Android home screen UX** — items snap to grid cells, freeform placement, configurable columns
- **One source of truth** — layout config is the single place all placement/sizing lives
- **Fail fast** — wrong config caught immediately
- **Opinionated** — the library makes decisions so developers don't have to
- **No nested grids** — Grid inside Grid throws in development (`console.error` + visual error boundary). Detected via React context on mount. In production, the inner Grid renders its children as a plain `div` without grid behavior (no RGL, no positioning, no resize handles) — it degrades gracefully rather than crashing. Dashboards are flat — nesting grids is always a mistake, caught during development.
- **Minimal DOM** — every wrapper div must earn its place. react-grid-layout adds one positioning div per item (necessary for absolute placement). We add one inner div per item (for cell styling + content centering). That's 2 divs per item — the minimum required. No extra wrappers, no gratuitous nesting. If a div can be eliminated, it must be.
- **Don't fight the layout engine** — use react-grid-layout's proven interaction code, add value on top

**Future features (proven in flexity):**
- **No wasteful wrappers** — runtime DOM validation warns when items have unnecessary root wrappers (bare div wrapping children, single-child wrapper, bare text wrapper). Consumers use fragments or pass components directly. Proven in flexity — carries over unchanged.

## Lessons learned from flexity

### Flexbox can't do row spanning

The entire flexity library was built on `flex-wrap: wrap`. It works for simple left-to-right flow. But a tall chart next to two stacked KPI cards — the most basic dashboard layout — is impossible with flexbox. A tall flex item pushes the entire row height up. Items below wrap to a new row, they don't stack beside the tall item.

### Don't build what's already solved

We built custom resize from scratch (pointer events, content measurement, ring following). It took days to get right. re-resizable was dropped because it created an inner wrapper div that misaligned with styling. The custom solution worked but required the height:auto measurement technique to clamp resize to content minimum.

react-grid-layout has solved drag, resize, collision detection, placeholder indicators, keyboard accessibility, and smooth animations over years of production use. Building these from scratch is months of work with hundreds of edge cases.

### The height:auto measurement technique

The hardest problem in flexity: preventing the resize ring from shrinking below content. Multiple approaches failed:

1. **CSS `min-height: min-content`** — doesn't work because inline `style.height` set during drag overrides `min-height`
2. **`contentRef.scrollHeight`** — flex children stretch to fill container, so scrollHeight = container height, not content's natural height. Once enlarged, can never shrink back.
3. **Zero-size measurement** (`width:0; height:0` + `scrollWidth/scrollHeight`) — ResponsiveContainer reports current rendered size, not minimum
4. **CSS `min-height: fit-content`** — prevents height capping entirely
5. **JS `Math.max(snap, ...)` clamp** — minimum of 8px, way too small

**The solution:** At resize start, temporarily set `el.style.height = 'auto'`, read `getBoundingClientRect().height`, restore original height. This gives the element's natural auto-sized height. For non-chart items, this is the full content height (can't shrink below). For chart items with `flex-1 min-h-0`, the chart container collapses to 0, giving minH ≈ title height only (allows free shrinking).

This technique may not be needed in react-grid-layout — the constraint API runs before layout updates and can enforce minimums in grid units. But the principle remains: content determines its own minimum, the grid respects it.

### The inner wrapper problem

re-resizable and react-grid-layout both create wrapper divs for positioning. When styling (className, ring, outline) is on a different div than the one being resized, the ring doesn't follow resize. This caused days of debugging in flexity.

The solution with react-grid-layout: put the hover ring on the OUTER div (react-grid-layout's item wrapper) via className. react-grid-layout resizes this div directly. Ring follows automatically. The inner div is only for centering content and optional cell styling.

### isDev() doesn't work in pre-built libraries

`process.env.NODE_ENV` is not available in the browser when the library is pre-built by tsdown. The consumer's bundler (webpack, Next.js) replaces it in their code but not in the pre-built library. All dev features should always be available — the consumer controls what's active by rendering `<Panel />` or not.

### ResponsiveContainer and SSR

recharts v3's `ResponsiveContainer` warns about width(-1)/height(-1) during SSR because there's no DOM to measure. `console.warn` suppression in a `<script>` tag in `<head>` is the pragmatic fix. The custom `useSize` hook alternative caused infinite render loops due to ResizeObserver → setState → re-render → ResizeObserver cycle.

## Desired UX (for users viewing dashboards)

- Dashboard looks polished — items properly sized, spaced, aligned
- Responsive — items reflow sensibly on different screen sizes
- Smooth transitions — items animate when the layout changes
- No jank — drag, resize, and reflow are smooth

## Desired DX (for developers building dashboards)

- **Zero config start** — `<Grid items={{ kpi: <KpiCard />, chart: <Chart /> }} />` just works
- **Visual tuning** — hover to see cell boundaries, drag to reposition, drag edges to resize
- **One copy-paste** — click copy, paste config into code, TypeScript validates
- **Cell styling** — optional `className` on layout entries for cell background/border/rounded
- **Fill by default** — inner cell div fills the cell. Components render at natural flow. Charts opt into stretch via their own `h-full`. Centering is opt-in via className
- **Android home screen UX** — configurable column count, freeform placement, snap to cells
- **Dev toolbar** — gap, column count, debug toggles, reset, copy
- **Per-item settings** — click a button on each item to configure its placement/styling

## Constraints

- Must use react-grid-layout as the layout engine (proven drag/resize/collision). This is the primary approach — if the POC reveals RGL cannot support content-aware sizing, the success criteria allow reconsidering the engine choice
- Must support React 19+ and Next.js 15+
- Must work with Tailwind v4
- Must be a single npm package — consumers install one thing
- Must support TypeScript with full type inference
- The grid cell can never be resized smaller than its content

## Inspirations

- **Android home screen** — freeform grid placement, snap to cells, configurable columns, items stay where you put them
- **react-grid-layout** — proven layout engine with drag, resize, collision detection
- **flexity** — developer experience layer (dev panel, css button, copy/paste, type safety, validation)
- **Monitor repo's dashboard-grid.tsx** — production implementation of react-grid-layout with auto-sizing, per-item dev panel, localStorage persistence

## Limitations

- **Steppy resize** — items snap to grid units (column/row boundaries), not pixel-continuous. Accepted tradeoff for 2D grid layout.
- **Cell slack** — grid cells are always whole grid units. Content smaller than the cell has empty space around it (content centered). Accepted — this is the Android UX model.
- **rowHeight granularity** — all rows have the same base height. A 91px content in a 30px rowHeight grid gets 4 rows (120px). 29px of centering space. Finer rowHeight reduces slack but increases row count.
- **No pixel-level width control** — width is column spans, not pixels. A 4-column grid on a 768px viewport gives 300px columns. You get 300, 600, 900, 1200 — not 437px.
- **No keyboard drag** — react-grid-layout does not support keyboard-driven drag/reposition. Mouse and touch only. Keyboard resize may be added as a custom feature later.
- **Touch interactions** — react-grid-layout supports touch drag/resize, but with draggableHandle and compactType:null, the mobile UX is not validated in this POC. Touch is out of scope.
- **No auto-growth after measurement window** — cells auto-size during the initial measurement window (200ms idle or 2s max, allowing async data to load). After the window closes, the layout is locked. Dynamic content growth scrolls, doesn't expand the cell. This prevents overlap in freeform layouts.

## Why no one has solved this

- **react-grid-layout** — great layout engine, but no content-aware sizing, no dev tooling, requires explicit dimensions
- **react-rnd** — freeform canvas, not grid-based. No snapping, no columns, no auto-placement
- **CSS Grid alone** — layout is solved, but drag/resize/collision needs hundreds of JS edge cases
- **Flexbox libraries** — can't do row spanning (learned the hard way)
- **Existing dashboard builders** — either too opinionated (fixed widget set) or too low-level (just a layout engine)

The gap: no library combines a proven grid layout engine with content-aware auto-sizing, content-minimum resize constraints, and a visual developer experience layer. That's what ogrid fills.

## POC — What we need to prove

The POC is a single page with ~5 widgets. No dev tools, no toolbar, no copy/paste. Just the layout engine + content-aware behavior. Each point below is a potential showstopper — if any fails, we rethink before investing further.

### Content-driven auto-sizing on first render

**What:** Items auto-size their HEIGHT from content on mount. Width defaults to full grid width (`w: cols`) unless the developer specifies `w` in the config.

**Why this must be proven:** react-grid-layout requires explicit `w`/`h` in grid units for every layout item. Our wrapper must auto-measure content height via ResizeObserver, convert pixels to grid units, and set `h` dynamically. If this doesn't work — if items render with wrong heights or flicker during measurement — the zero-config promise breaks.

**How to verify:** Render a table, a chart, and a KPI card with no layout config. They should appear at full width with correct heights matching their content. No visible flicker.

### Content minimum resize clamping

**What:** Dragging a resize handle, the cell stops shrinking at the content's natural size. A table can't be crushed. A chart can shrink (it adapts).

**Why this must be proven:** react-grid-layout's resize callbacks are read-only (`void` return). You can't cancel a resize synchronously from callbacks — but you can revert asynchronously via setState (with snap-back UX, not ideal). The constraint API (`constrainSize`) runs before layout updates and can enforce minimums without snap-back. But we've never used it — need to prove it actually prevents undersized resize in practice.

**How to verify:** Resize a table widget smaller — it should stop at the table's natural width/height. Resize a chart widget smaller — it should shrink freely.

**Classification:** By default, all items are "fixed" — their content minimum is measured and enforced. Items that should shrink freely (charts, visualizations) must opt in via `minH: 1` (or any explicit `minH`) in the layout config. This is a deliberate design choice: zero-config means "content is protected." Free shrinking requires an explicit developer decision. This works regardless of chart library — recharts, ECharts, Chart.js, or any other. No implicit classification based on library-specific collapse behavior.

**Precedence rule:** If a developer specifies an explicit `minH` (or `minW`) in the layout config, the measurement system NEVER overwrites it. The measurement system only sets `minW`/`minH` for items WITHOUT developer-specified values. This is tracked via a `configMinH` / `configMinW` field derived from the initial layout config. The dynamic measurement system writes to `computedMinH` / `computedMinW`. The effective minimum used by `constrainSize` and RGL is: `configMinH ?? computedMinH`. Developer intent always wins.

**Near-zero measurement detection:** If an item's measured natural height is below 1 grid row (e.g., a chart with `flex-1 min-h-0` that collapses under `height: auto`), the grid emits a development-mode warning: "item 'X' measured at Npx natural height (less than 1 row). Set `minH: 1` in the layout config to mark this as a flexible component." The item gets `computedMinH: 1` (minimum possible).

**Chart widget configuration:** Charts require `minH: 1` in the layout config (to allow free shrinking) AND `h-full` in the component CSS (to stretch and fill the cell). What happens with partial config:
- `minH: 1` but no `h-full`: chart can shrink but doesn't fill the cell (sits at natural height with empty space below). Functional but looks wrong.
- `h-full` but no `minH: 1`: chart fills the cell but cannot be shrunk below its (near-zero) measured height — effectively `computedMinH: 1` anyway due to near-zero detection. Functional but the developer should make the intent explicit.
- Both set: correct behavior. Chart fills cell and can be freely shrunk.

POC test: a table with no config cannot shrink below its content height. A chart with `minH: 1` can shrink to 1 row. A chart with no config that collapses under height:auto gets a dev warning and `computedMinH: 1`.

### Row spanning

**What:** A tall chart occupies 2 rows while two KPI cards stack beside it in the same 2 rows.

**Why this must be proven:** This is THE reason we abandoned flexbox. It's table stakes for any dashboard grid. react-grid-layout supports this via `h` spanning multiple rows. But we need to see it working with our auto-sizing and content-aware constraints — not just with hardcoded dimensions.

**How to verify:** Place a chart with `h: 2` (2 rows) next to two KPI cards each with `h: 1`. All three should render correctly with the chart spanning both rows. The POC uses RGL's native `h` directly. In the full library, `h` serves dual purpose: auto-computed height (from content measurement) and explicit row span (developer-specified). The `userResized` flag disambiguates: if `userResized`, the `h` is the developer/user's explicit choice; if not, it's auto-computed and may change on reload.

### Freeform placement with gaps

**What:** Items stay where you put them. Empty cells between items are preserved. No auto-compaction.

**Why this must be proven:** react-grid-layout's `compactType: null` disables compaction. But we need to confirm items don't overlap, don't auto-pack, and gaps persist across re-renders and page reloads.

**How to verify:** Place items with intentional empty cells between them via layout config (explicit `x`/`y`). Gaps should render correctly. Re-mount the component with the same config — gaps persist. (Full page reload with persistence is out of POC scope.)

### Drag to any empty cell

**What:** Pick up an item, drop it in an empty area of the grid. It stays there.

**Why this must be proven:** With `compactType: null`, dragging to an empty area should work. But collision detection with no compaction might reject drops in unexpected ways. Need to confirm the interaction feels natural.

**How to verify:** Drag a KPI card to an empty area several rows below. It should land there and stay.

### Drag collision behavior

**What:** Drag an item onto another occupied cell. Understand and validate the collision behavior with `compactType: null`.

**Why this must be proven:** With `compactType: null`, collision resolution works differently from compacted mode. `preventCollision: false` (default) allows items to push, but without a compactor to decide direction, items may push in unexpected directions or go off-grid. `preventCollision: true` rejects the drop (item snaps back). We need to test BOTH modes, understand the trade-offs, and pick a default.

**How to verify:** Test with `preventCollision: false` — drag item A onto item B. Observe where B goes. Does it push predictably? Does it go off-grid? Test with `preventCollision: true` — drag item A onto item B. Item A should snap back. Document which mode produces better UX for dashboard use.

**Note:** `constrainSize` does NOT fire during drag — it only fires during resize. Collision protection during drag relies on `minW`/`minH` set on each layout item. The grid must set `minW`/`minH` on every layout item based on content measurements so that collision resolution cannot shrink items below their content minimum. **Invariant:** By the time the user starts dragging, the measurement window has closed and all `minW`/`minH` values are current. Content measurements stabilize before user interaction begins (the grid is invisible during measurement). Post-measurement content changes update `minW`/`minH` via RAF batching — a one-frame lag that is acceptable for the rare case of content changing while the user is actively dragging.

### Drag handle

**What:** Dragging only works from a grip icon, not from content. Buttons, inputs, and links inside widgets remain interactive.

**Why this must be proven:** react-grid-layout supports `draggableHandle` (CSS selector). But we need to confirm interactive content (buttons, inputs, links) inside widgets still works — click events don't get swallowed by the drag system.

**How to verify:** Place a widget with a button inside. Click the button — it should fire. Drag from the grip icon — it should drag.

### Smooth transitions

**What:** When one item is dragged or resized, other items animate smoothly to their new positions.

**Why this must be proven:** react-grid-layout has built-in CSS transitions. But with `compactType: null` and our content-aware constraints, the transitions might break or look janky.

**How to verify:** Resize an item. Watch neighboring items — they should slide smoothly, not teleport.

### Responsive behavior

**What:** When the browser window gets narrower, items reflow sensibly. Items with `w` larger than available columns are capped (`w = Math.min(w, cols)`), which triggers content reflow and `minH` recalculation.

**Why this must be proven:** With `compactType: null` and freeform placement, narrowing the window might cause items to overflow the container or overlap. react-grid-layout might not handle responsive behavior well without compaction.

**How to verify:** Render the grid at 1920px width. Narrow the window to 800px. Items should reflow sensibly. Strategy: freeform (`compactType: null`) above 768px, vertical compaction below. `compactType={width < 768 ? 'vertical' : null}`. The 768px breakpoint ensures freeform mode (with drag/resize) is available on most laptops (13" at 100% zoom = ~1280px content width, well above 768px). Only tablets in portrait and phones get compact mode. Verify the transition is smooth and items don't overlap at the breakpoint. State management: one layout array (freeformLayout). Above 768px, use it directly. Below 768px, derive compacted layout from it on every render. No separate compacted state.

**Mode switch behavior:** Freeform layout is canonical, stored in a ref (`freeformLayoutRef`) that is ONLY updated when `compactType === null`. Compact layout is DERIVED on every render — pass a deep copy of `freeformLayoutRef` as the `layout` prop with `compactType={'vertical'}`. RGL handles compaction internally. The deep copy prevents RGL from mutating `freeformLayoutRef` (some RGL versions mutate the input layout array). No need to call any internal utility — just change the `compactType` prop and pass a copy. No separate state variable. `onLayoutChange` is guarded: it reads `compactType` from a ref (not state) so the guard always sees the latest value regardless of closure staleness. **Critical ordering:** the ref is updated BEFORE the setState call in the width-change handler (i.e., `compactTypeRef.current = newCompactType` first, then `setCompactType(newCompactType)`). This ensures the `onLayoutChange` callback always sees the correct compactType, even during the render triggered by setState. If `compactTypeRef.current !== null`, the callback does NOT update `freeformLayoutRef`. Switching back above 768px restores freeformLayoutRef as-is. Drag and resize are DISABLED in compact mode (`isDraggable={false}` `isResizable={false}`) — this is a read-only responsive view. POC test: switch to compact mode, switch back, verify freeform positions are preserved exactly.

If users need to edit layout on mobile, that's a future feature (separate mobile layout config), not a POC concern.

**Initial load below 768px:** If the viewport is below 768px on first load, the measurement window still runs (measuring content at the current viewport width). Heights are auto-sized and stored in `freeformLayoutRef`. The grid renders with `compactType='vertical'` from the start.

**Narrow→wide transition re-measurement:** When switching from compact to freeform mode for the first time (viewport crosses above 768px), the grid triggers a re-measurement of non-`resizedIds` items. The re-measurement happens LIVE (no opacity:0 — the grid stays visible at its current layout while heights adjust). Items may visibly shift as heights change — this is acceptable because the user just resized their browser and expects layout adjustment. ResizeObserver fires, `computedMinH` updates, and `h` is recalculated. After re-measurement completes (200ms idle / 2s cap), `computeLayout` re-runs to verify no overlaps and reposition if needed. CSS transitions are ENABLED during this re-measurement so shifts are smooth, not jarring.

**Compact mode column count:** Stays at the developer-configured column count. Items with `w` larger than available space are capped to `cols`. The vertical compaction algorithm handles repositioning — items keep their `w` but get new `x`/`y` to eliminate gaps and resolve overlaps. The column count does NOT change at the breakpoint — only the compaction mode changes. Minimum supported viewport width for compact mode: 480px. Below 480px (small phones), layouts may be too cramped — a separate mobile layout strategy (e.g., single column) is a future feature, not a POC concern.

**Item addition/removal:** When items are added or removed, freeformLayout is updated. New items get auto-placed via `computeLayout`. Removed items are filtered out. CompactedLayout is always re-derived from freeformLayout — no sync needed.

**RGL component:** The POC uses `<GridLayout>` (not `<ResponsiveGridLayout>`), with manual width detection via ResizeObserver on the grid container. `GridLayout` requires a numeric `width` prop. The grid wrapper measures its own width via `useLayoutEffect` + `getBoundingClientRect()` on mount (synchronous, before paint), then passes it as `width` to `<GridLayout>`. ResizeObserver updates the width on subsequent viewport changes. During the SSR measurement phase (grid is `position: absolute; inset: 0`), the grid inherits width from the wrapper — `useLayoutEffect` reads the correct width before the first paint. This avoids a frame of `width=0`.

### Cell className

**What:** A layout entry can have an optional `className` (e.g., `'bg-muted rounded-lg'`) applied to the cell container. Content is centered inside.

**Why this must be proven:** react-grid-layout's item wrapper has absolute positioning and explicit dimensions. Adding an inner div with className + centering must not break the positioning or resize behavior. The className must be visually correct — background fills the cell, rounded corners follow the cell boundary.

**How to verify:** Give one item `className: 'bg-muted rounded-lg'`. It should have a muted background with rounded corners filling the entire cell. Content should be centered inside.

### Content centered in cell

**What:** The inner div behavior has two phases:
- **During measurement:** `height: auto`, `overflow: visible`. Content renders at natural height for measurement (overflows the outer div if taller).
- **After measurement window closes:** `h-full w-full`, `overflow: auto`, block layout (not flex). Content sits inside a full-height container. Block children do NOT stretch to fill parent height by default, so fixed-content items (tables, text) sit at the top with empty space below. Charts that want to stretch use `h-full` on themselves. Centering is opt-in via `className: 'flex items-center justify-center'` on the layout entry (changes inner div to flex layout).

**Note on centering:** Centering only has visual effect when cell slack exists (cell is taller than content). For auto-sized items, the cell is typically near content height — centering is irrelevant unless the user manually enlarges the cell or rowHeight granularity creates slack.

**Why this must be proven:** The default (block layout, no stretch) must work for the most common case without extra config. Centering and stretching are opt-in.

**How to verify:** Place a chart and a table — both should fill their cells without any className. Place a small KPI card with `className: 'flex items-center justify-center'` — it should center.

### Dynamic minH after width resize

**What:** Resize an item wider. Content reflows (text unwraps, table columns spread). The minimum height changes. The item can now be made shorter because the content is shorter at the wider width.

**Why this must be proven:** If `minH` is calculated once and never updated, widening an item doesn't allow shrinking height even though the content now fits in less vertical space. The constraint must recalculate when column span changes.

**How to verify:** Place a widget with wrapping text. Resize it from 1 column to 2 columns — text unwraps, content gets shorter. Then resize it shorter (height). It should allow shrinking to the new, shorter content height. Recalculation happens on span change (discrete events), not every frame — zero wasted work. The grid measures the component's rendered height as-is (including any internal padding the component has). Cell styling from `className` is for the cell container only (bg, rounded, border) — not padding. Interior spacing is the component's responsibility. Timing: when column span changes, the grid updates w in the layout. React re-renders the item at the new width. ResizeObserver fires (content reflowed at new width). The observer updates the measurement ref. The NEXT constrainSize call reads the fresh ref. This is a multi-frame sequence: frame 1 (width change + re-render), frame 2 (browser reflow + observer fires + ref updated), frame 3+ (constraint reads fresh data). The one-frame lag is safe for MOST content: when width increases, content typically gets shorter (text unwraps), so the OLD minH is larger than the new minH — stale data over-constrains, never under-constrains. When width decreases, content gets taller, but the user is narrowing — the next constrainSize call gets the fresh (larger) minH.

**Edge case — non-monotonic height:** Components with CSS breakpoints or layout switches (e.g., switching from single-column to two-column at a width threshold) could get TALLER when wider. For one frame, the stale minH would be too small. Mitigation: `constrainSize` uses `Math.max(currentMinH, previousMinH)` during the transition frame — always pick the larger of the two. `previousMinH` lifecycle: set on the first `constrainSize` call where `w` differs from `lastKnownW` (both in grid units — no pixel conversion needed since constrainSize receives `w` in grid units). Subsequent `constrainSize` calls during the same drag read `Math.max(currentMinH, previousMinH)`. Cleared when ResizeObserver fires for that item after the `w` change AND the item's `w` in the layout matches the `w` from the last `constrainSize` call. During continuous diagonal resize where `w` changes every frame, the observer may never match — so the guard has a hard timeout of 10 frames (~167ms at 60fps). After 10 frames, the guard clears unconditionally and uses `currentMinH` only. This prevents permanent over-constraining during extended diagonal drags. The 10-frame window is long enough for the observer pipeline to complete under normal conditions, and short enough that the brief over-constraining is imperceptible. During rapid diagonal resize at 60fps, multiple `constrainSize` calls occur between observer commits — the guard holds (over-constrains), which is safe. Over-constraining for a few frames is acceptable — worst case the user can't shrink quite as far as allowed for ~2-3 frames.

**POC test — non-monotonic height widget:** Add a widget that switches from 1-column to 2-column internal layout at a width threshold (e.g., >400px). This widget gets TALLER when wider (2-column layout has more vertical content). Resize it wider — confirm content is never visibly clipped during the transition frame. Also test diagonal resize (both width and height simultaneously).

### Constraint API works for content clamping

**What:** react-grid-layout v2's `constrainSize` function runs before layout updates and can enforce minimum sizes based on content measurement.

**Why this must be proven:** This is the foundation of content-aware resize. The constraint API is documented but we've never used it. Need to confirm it actually fires during resize, receives the correct context (item, proposed size, container dimensions), and successfully prevents undersized cells. Measurement data flow: ResizeObserver updates a ref (not state) with the latest content dimensions. The constrainSize function reads from this ref synchronously. This avoids async gaps where stale measurements would allow undersized cells.

**Important:** `constrainSize` fires during RESIZE only, not during drag. During drag, content minimum protection comes from `minW`/`minH` set on each layout item. The grid must keep `minW`/`minH` in sync with content measurements at all times. Two protection mechanisms for two interaction types: `constrainSize` for resize (real-time clamping), `minW`/`minH` for drag collision (prevents collision resolution from shrinking items below content minimum).

**minW/minH sync mechanism:** When ResizeObserver fires (content changed), the observer callback updates both the `measurementsRef` (for constrainSize) AND queues a `computedMinH`/`computedMinW` update. All queued updates are flushed in a single `requestAnimationFrame` callback as ONE `setState` call — updating all changed items in the layout array at once. This produces at most one React re-render per RAF frame, regardless of how many items changed. Worst case during measurement window: if all items' observers fire in one RAF, 1 setState per round × 3 rounds (cap) = 3 re-renders. If observers fire across different RAFs, more re-renders occur. Theoretical range: 3 (best) to ~75 (worst, all items on different RAF frames × 3 updates each). POC must log actual `setState` call count and React component re-render count during measurement at 25 items. No fixed pass/fail threshold — the POC measures the actual number and evaluates whether the perceived loading time is acceptable. After the measurement window closes, `computedMinH`/`computedMinW` updates are the ONLY state changes from observer callbacks — no `w`/`h` changes, so RGL repositioning is not triggered.

**Viewport resize re-measurement:** When viewport width changes in freeform mode, RGL re-renders items at new pixel widths (same grid units, different pixels). Content reflows. ResizeObserver fires on affected items. The measurement system updates `computedMinH`/`computedMinW` automatically — no special handling needed. The same observer-based pipeline that handles initial measurement also handles viewport-triggered reflow.

**How to verify:** Add a constraint that logs every call. Resize an item — confirm the constraint fires and prevents shrinking below content. Then drag an item onto another — confirm `minW`/`minH` prevents the displaced item from being shrunk below its content minimum by collision resolution.

**Resize-overlap prevention:** Test: resize item A to be larger such that it would overlap item B. `constrainSize` only handles content minimums (it cannot access neighbor positions — `layout` in context is empty, see pre-POC investigation). RGL must handle resize-overlap via its own collision detection. Verify in the POC that RGL prevents resize-caused overlaps. If RGL does NOT prevent this, the fallback is to use `onResize` to detect overlap and revert via `setState`.

### Auto-placement with compactType: null

**What:** When items have no explicit `x, y` position, they auto-place in a sensible grid pattern (row by row, left to right) even with `compactType: null`.

**Why this must be proven:** This is potentially contradictory. `compactType: null` means "don't move items." But items with no position need to be placed somewhere. react-grid-layout might pile them all at `(0,0)` and overlap. We might need our own auto-placement algorithm that runs once on first render, then freeform after.

**computeLayout integration with RGL:** `computeLayout` is called BEFORE passing the layout to RGL's `layout` prop. It is NOT a custom compactor. The data flow: config → `computeLayout` assigns `x`/`y` to unpositioned items and resolves overlaps → output passed as RGL's `layout` prop → RGL renders with `compactType={null}` (noCompactor preserves positions). `computeLayout` runs at specific moments only: mount, column count change, item add/remove, and after measurement window closes (Phase 2). It does NOT run on every render.

**computeLayout algorithm:** Simple row-by-row scan with a 2D occupancy grid. An item is "positioned" when BOTH `x` and `y` are defined. Items with partial positions (e.g., `x: 2` but no `y`) emit a development-mode warning ("item 'chart' has x but not y — both x and y must be specified for explicit positioning, auto-placing instead") and are treated as unpositioned. This follows the "fail fast" philosophy — partial positions are a likely developer error. Items with both `x` and `y` defined are placed at their explicit positions first (they occupy space in the occupancy grid). If explicitly-positioned items overlap after height auto-sizing (e.g., developer assumed `h: 2` but content measured at `h: 4`), `computeLayout` detects the overlap and resolves it by pushing the lower item down (same as RGL's collision resolution). A development-mode warning is emitted so the developer knows their explicit positions conflicted with auto-sized heights and can fix the config. The grid guarantees no overlap — even for explicitly-positioned items. Then, for each unpositioned item (in config order): scan cells left-to-right, top-to-bottom, find the first position where the item fits (w×h block is unoccupied), place it there. If no position fits in existing rows, extend the grid downward. This handles variable-height items correctly — a tall item occupies multiple rows in the occupancy grid, and subsequent items flow around it. Same algorithm used in the monitor repo.

**How to verify:** Render 6 uniform items in a 3-column grid with no explicit positions. They should arrange in a 3×2 pattern, not overlap. Also test with mixed sizes: one `w:2, h:2` item and four `w:1, h:1` items in a 3-column grid. Confirm the auto-placement handles non-uniform sizes without overlap or dead space.

### Overlap prevention with compactType: null

**What:** No two items ever overlap in grid-unit terms (`x`/`y`/`w`/`h` rectangles don't intersect), regardless of drag behavior or window resize. Content overflow within a cell is handled by `overflow: auto` (scroll) — visual pixel overflow is not the same as grid-unit overlap.

**Why this must be proven:** With no compaction, collision resolution is different. Items can't be pushed "down" by a compactor. The chosen collision mode (preventCollision true or false, determined by the drag collision test above) must guarantee no overlap in all scenarios: drag, resize, responsive reflow, column count change.

**How to verify:** After every interaction (drag, resize, column change, responsive switch), inspect the layout array. No two items should have overlapping `(x, y, w, h)` rectangles. Visually confirm no overlap.

### Ring on outer div follows resize

**What:** The hover outline (ring) is on react-grid-layout's item wrapper div. When the user resizes, the ring follows the resize in real-time because react-grid-layout updates that same div's dimensions.

**Why this must be proven:** In flexity, the ring was on a different div than the one being resized (inner wrapper vs outer), causing the ring to not follow. With react-grid-layout, if we put the ring on the outer div (which react-grid-layout controls), it should follow. But need to confirm react-grid-layout updates dimensions continuously during drag, not just on stop.

**How to verify:** Hover an item (ring appears). Drag the resize handle. The ring should grow/shrink in real-time with the resize.

### Dynamic column count

**What:** Changing the column count (e.g., 4 → 3) reflows the entire grid. Items at positions that no longer exist (e.g., `x: 3` in a 3-column grid) are handled gracefully.

**Why this must be proven:** The toolbar will let developers change column count. If items go off-grid or overlap after a column change, the feature is broken.

**How to verify:** Render a 4-column grid with an item at `x: 3`. Change to 3 columns. **Sequence:** `computeLayout` runs BEFORE passing the updated layout to RGL (not after RGL's `correctBounds`). `computeLayout` applies the same `x` clamping (`x = Math.min(x, cols - w)`) and then resolves any resulting overlaps by pushing items down. The corrected layout is passed to RGL as the `layout` prop. RGL's `correctBounds` runs on the already-corrected layout — no double-clamping or timing gap. A dev warning is emitted for repositioned items. Test with multiple items at the boundary to confirm no overlaps.

### New item auto-placement in existing freeform layout

**What:** A dashboard has 5 items arranged by the user. A 6th widget is added dynamically. It auto-places in the first available empty cell without disrupting existing items.

**Why this must be proven:** Freeform layout means existing items have explicit positions. A new item with no position needs to find an empty cell. This requires scanning the grid for the first available space.

**How to verify:** Arrange 5 items with gaps. Add a 6th item with no position. It should appear in an empty cell, not overlap existing items. Also test in a dense grid with no gaps — the new item should be placed in a new row below the existing items (the grid extends downward, never overlaps).

### Transition from auto-placed to user-edited

**What:** First render uses auto-placement (no positions in config). User drags an item. Now positions are "user-edited." On page reload, the user-edited positions persist (via localStorage or config), not the auto-placed defaults.

**Why this must be proven:** Two states coexist: "auto-placed from config" and "user-edited via interaction." The transition between them must be seamless. Once the user touches the layout, the auto-placed state is replaced by the explicit state.

**How to verify:** Render with auto-placement. Drag one item. The grid's `onLayoutChange` should emit the updated layout with the new position. Re-mount the component with the emitted layout as the initial config — the dragged item should be at its new position, not the auto-placed position. (Full page reload with localStorage persistence is out of POC scope — the POC verifies the state transition, not the persistence mechanism.)

### Grid unit conversion accuracy

**What:** Content is measured in pixels. react-grid-layout uses grid units. The conversion must account for margins AND the 1px stabilization buffer (from ResizeObserver stabilization section). The canonical formula used everywhere: `minH = Math.ceil((contentPixelHeight + 1 + marginY) / (rowHeight + marginY))`. The `+1` prevents boundary oscillation. Rounding direction: always round UP to prevent clipping. react-grid-layout's actual pixel height for `h` rows is: `h * rowHeight + (h - 1) * marginY`.

**Why this must be proven:** With the canonical formula (including +1 buffer): if rowHeight=30, marginY=16, and content is 90px: `Math.ceil((90 + 1 + 16) / (30 + 16)) = Math.ceil(107 / 46) = 3` → 3 * 30 + 2 * 16 = 122px ≥ 90px ✓. Without accounting for margins, `Math.ceil(90 / 30) = 3` → seems right by coincidence, but at different values margins cause off-by-one errors that clip content.

**How to verify:** Place items with content heights near row boundaries (e.g., 89px, 90px, 91px with rowHeight=30 and marginY=16). Verify no clipping and reasonable slack. Also verify with marginY=0 to confirm the formula degrades correctly to `Math.ceil(contentPixelHeight / rowHeight)`.

### Minimal DOM — 2 divs per item maximum

**What:** Each grid item has exactly 2 divs: react-grid-layout's positioning div (outer) and our cell styling div (inner). No extra wrappers. The component renders directly inside the inner div.

**Why this must be proven:** In flexity, re-resizable added an extra wrapper that caused ring/styling misalignment. We must confirm that react-grid-layout's DOM structure plus our inner div is sufficient — no hidden wrappers from the library, no extra divs needed for resize handles or drag behavior.

**How to verify:** Inspect the DOM of a rendered grid item. It should be: `div[position:absolute]` (react-grid-layout) → `div[className]` (our cell styling) → component content. Plus react-grid-layout's resize handle elements (small spans at edges) which are part of the interaction surface, not wrapper divs. Resize handles and drag handles should be part of the existing structure, not additional wrapper divs.

### Performance at scale

**What:** The POC must work smoothly with 25+ items, not just 5. ResizeObserver on 25 items, layout recalculation on resize/drag, state updates from measurements — all must stay performant.

**Why this must be proven:** 5 items is trivial. Real dashboards have 20-50 widgets. ResizeObserver callbacks fire in bursts, each triggering setState, each causing react-grid-layout to re-layout the entire grid. If this cascades, the dashboard becomes unusable.

**How to verify:** Add 25+ items to the POC page. Drag and resize several items. Use Chrome DevTools Performance panel to measure frame rate, longest task duration, and render count per interaction.

**Pass/fail criteria:** Target 60fps, acceptable ≥45fps, showstopper <30fps — all measured during drag interaction with 25 items on a mid-range laptop (e.g., M1 MacBook Air). If below 45fps: identify bottleneck (RGL layout computation, React reconciliation, or DOM measurement). Mitigation options: debounce ResizeObserver callbacks during drag, virtualize off-screen items, or reduce item count recommendation. Log render count during a single drag with 25 items.

**Data flow architecture:** A single ResizeObserver instance observes all items. On callback:
1. Update a `measurementsRef` (Map of itemId → {width, height} in pixels). This is synchronous — `constrainSize` reads from this ref immediately.
2. Convert pixel measurements to grid units. If any item's grid-unit size changed, batch into a single `setState` via `requestAnimationFrame` to update `minW`/`minH` on layout items and (during measurement window only) update `w`/`h`.
3. After the measurement window closes, observer callbacks ONLY update the ref (step 1) and `minW`/`minH` (step 2). They do NOT update `w`/`h` — the layout is locked.

This means: refs for real-time constraint enforcement (no re-render needed), state for layout changes (batched, rare after measurement window).

### Dense grid collision

**What:** Drag an item in a nearly full grid where there's minimal empty space.

**Why:** With 20+ widgets, dashboards are dense. Collision resolution must handle the case where the displaced item has nowhere obvious to go.

**How to verify:** Fill a 4-column grid with 12 items (3 rows, no gaps). Drag one item onto another. Confirm the drop is rejected gracefully or items push predictably without going off-grid.

### Constraint + collision deadlock

**What:** Drag item A onto item B where B is at its content minimum size and surrounded by other items. The constraint prevents B from shrinking, and compactType:null means B has nowhere to be pushed.

**Why:** The content-minimum constraint and freeform placement can deadlock in dense layouts. If collision resolution needs to shrink or move B, but constraints prevent shrinking and no-compaction prevents pushing, the system must fail gracefully.

**How to verify:** Create a fully packed grid. Drag one item onto a content-minimum-constrained item. Test under BOTH collision modes:
- With `preventCollision: true`: the drop is rejected (item snaps back). This is the expected safe behavior.
- With `preventCollision: false`: items attempt to push. Confirm either (a) the push chain resolves without overlap, or (b) react-grid-layout rejects the move when push is impossible. Document which behavior occurs — this informs the collision mode decision.

In either case: no overlap, no freeze, no content clipping.

**Fallback if neither mode works:** If `preventCollision: false` causes overlap in dense layouts AND `preventCollision: true` rejects too many drops making the grid feel unresponsive, the fallback is `preventCollision: true` with a visual indicator (e.g., red placeholder) showing the user that the drop target is occupied. This is the Android home screen behavior — you can't drop an icon on top of another. The drop is rejected but the feedback is clear.

**Resize overlap:** The same collision mode applies to resize. With `preventCollision: true`, resize into a neighbor is rejected (item snaps back to pre-resize size). With `preventCollision: false`, neighbors are pushed. The POC must test BOTH resize-into-neighbor scenarios under both modes. If resize-push causes content-minimum violations, `minW`/`minH` on the pushed items prevents shrinking below content — the resize is effectively capped when the push chain hits a wall.

### Content measurement inside absolute-positioned container

**What:** The height:auto measurement technique must produce correct results inside react-grid-layout's absolutely-positioned item wrappers.

**Why:** flexity measured content in flexbox containers. react-grid-layout uses `position: absolute` with explicit width/height. Setting height:auto on a child inside an absolutely-positioned, explicitly-sized container might not produce the natural content height.

**Measurement target:** The `height: auto` technique is applied to the INNER div (our cell styling div), NOT the outer absolutely-positioned div (react-grid-layout's wrapper). The outer div has `position: absolute` with explicit width/height from RGL — we never modify those. The outer div has `overflow: visible` (default) so the inner div can overflow during measurement without clipping. The inner div is a normal-flow child inside the absolute container. Setting `height: auto` on it lets it expand to its content's natural height, overflowing the outer div vertically. `getBoundingClientRect()` on the inner div gives the content's natural height regardless of the outer div's fixed height. ResizeObserver also observes the inner div's content box.

**How to verify:** RGL does not set overflow on item wrappers (verified — see pre-POC investigation). Render an RGL item with outer div at `h: 1` (30px). Place a table with natural height 200px inside. Inner div with `height: auto` should report 200px via `getBoundingClientRect()`, NOT 30px. Verify that the overflow does not affect RGL's collision detection or layout calculations (RGL uses its own grid-unit math, not DOM measurements for collision). Also verify that modifying the inner div's height does not affect RGL's positioning of the outer div.

### ResizeObserver stabilization (no infinite loops)

**What:** Auto-sizing via ResizeObserver must stabilize and not cause infinite re-render loops.

**Why:** The same class of bug that burned us in flexity. Flow: observer fires → update layout w/h → RGL re-renders → content reflows slightly differently → observer fires again → loop.

**Strategy:** Measurements are snapped to grid units. The loop stops when the grid-unit size doesn't change, even if pixel size shifted slightly within the same unit. Grid units act as a natural quantization boundary.

**Edge case — boundary oscillation:** Content at exactly a grid-unit boundary (e.g., 90.0px with rowHeight=30) could oscillate between 3 and 4 rows if sub-pixel rendering shifts it between 89.9px and 90.1px. Mitigation: add a 1px tolerance buffer — `Math.ceil((contentHeight + 1 + marginY) / (rowHeight + marginY))`. This ensures content right at the boundary rounds up consistently. The 1px buffer is cheaper than the alternative (infinite loop).

**Safety net:** Hard cap of 3 grid-unit-size-changing state updates per item per measurement window. The counter tracks state changes (not observer callbacks) — multiple observer fires that resolve to the same grid-unit size don't increment the counter. The counter resets each time the measurement window opens (e.g., on mount). During active resize (constrainSize path), the cap does NOT apply — constrainSize reads refs directly without triggering re-measurements. If an item's grid-unit size is still changing after 3 updates during auto-sizing, lock it at the last computed size and log a warning.

**How to verify:** Place a text widget that reflows at different widths. Log ResizeObserver callback count. Must stabilize within 3 callbacks. No infinite re-renders. Also test with content height exactly at a row boundary (e.g., exactly 90px with rowHeight=30) — must not oscillate.

### Tailwind v4 and react-grid-layout CSS compatibility

**What:** react-grid-layout's built-in CSS (resize handles, drag placeholder, transition animations) renders correctly with Tailwind v4's preflight reset enabled.

**Why:** Tailwind's preflight resets margins, padding, borders. RGL's CSS uses specific class names for handles and placeholders. CSS specificity conflicts could break the visual interaction layer.

**How to verify:** Import RGL's CSS alongside Tailwind v4. Confirm resize handles are visible, drag placeholder appears correctly, and transition animations work.

### Stale layout on load (user-sized vs auto-sized)

**What:** The grid tracks two flags per item: `userPositioned` (user dragged it) and `userResized` (user resized it). On load: items with `userResized: true` retain their saved size — if content doesn't fit, it scrolls internally. Items with `userPositioned: true` but NOT `userResized` retain their position but get auto-sized height. Items with neither flag get both auto-placed and auto-sized.

**Why:** The monitor repo uses `userResized` (Set). We extend with `userPositioned` to track position intent separately from size intent. A user who only drags an item hasn't expressed intent about its size — height should still auto-size on reload. This respects user intent — a user who made an item small intentionally shouldn't have the grid expand it on every load.

**How to verify:** (Via re-mounting, not page reload — POC excludes localStorage.) Auto-size an item. Re-mount with the emitted layout + taller content — non-userResized item should auto-size to the new content height. Then resize that item smaller manually (marks userResized). Re-mount with the same layout + even taller content — userResized item should retain its saved size and content scrolls inside the cell.

**Flag persistence:** The grid maintains two internal Sets: `positionedIds` (items the user dragged, detected via `onDragStop`) and `resizedIds` (items the user resized, detected via `onResizeStop`). The grid exposes TWO callbacks:
- `onLayoutChange(layout)` — fires on every layout change (including auto-sizing). For real-time dev tools display only, NOT for persistence.
- `onUserEdit(layout, positionedIds, resizedIds)` — fires ONLY after user drag/resize. `positionedIds` and `resizedIds` are string arrays (not Sets) for JSON serialization compatibility. Consumers persist all three.

On re-mount, the consumer passes `initialLayout`, `positionedIds`, and `resizedIds`. Behavior per item:
- In `resizedIds`: retains persisted `w`/`h` (user's explicit size). Content scrolls if it doesn't fit.
- In `positionedIds` but NOT `resizedIds`: retains persisted `x`/`y` (user's explicit position), but `h` is auto-sized from content (user never expressed size intent).
- In neither: auto-placed and auto-sized from content. Persisted values for this item are ignored.

This cleanly separates position intent from size intent — no derivation from layout shape needed.

**Scroll-inside-cell interaction:** When content scrolls inside a user-resized cell (`overflow: auto`), verify that scrolling does NOT accidentally trigger RGL's drag behavior. The `draggableHandle` scopes drag to the grip icon — scrolling the content area must work independently. This is a potential showstopper if scroll and drag conflict. POC must test: place a scrollable table inside a cell, scroll it, confirm no drag is initiated.

### Dynamic content after mount

**What:** Auto-sizing happens during the INITIAL MEASUREMENT WINDOW only — not just the first synchronous render. The measurement window stays open until content stabilizes (ResizeObserver stops firing for 200ms) or a maximum timeout (2 seconds) elapses, whichever comes first. After the window closes, the layout is locked. If content grows later, it scrolls inside the cell. The cell does NOT auto-grow.

**Why:** Real widgets load data asynchronously (API calls, lazy imports). A strict "first render only" rule would measure empty loading states and produce wrong sizes. The measurement window allows async content to load and stabilize before locking the layout. The timeout prevents indefinitely-loading widgets from blocking the grid.

**How to verify:**
1. Render a widget that fetches data after 200ms. Confirm the grid waits and sizes correctly after data loads.
2. Render a widget that fetches data after 200ms. After data loads AND the measurement window closes, add 10 more rows. Confirm the cell does NOT grow — extra rows are scrollable inside the cell.
3. Render a widget that takes 5 seconds to load. Confirm the grid locks at the 2-second timeout and doesn't wait forever. The 2s hard cap is absolute — if content changes at 1.9s, the observer fires and updates the measurement ref, but the window closes at 2.0s regardless of the idle timer. The item gets whatever height was last measured before the cap.

**Edge case — userSized items:** If a user has already manually resized an item (userResized: true), the measurement window does NOT apply. The user's explicit size is always respected, even on reload with new content.

**Edge case — user interaction during measurement window:** If the user drags or resizes an item while the measurement window is still open, that item is immediately marked `userResized: true` and excluded from further auto-sizing. The measurement window continues for other items. This prevents the auto-sizer from overwriting the user's explicit action.

**Edge case — multi-stage async loading:** The 200ms idle timeout is a heuristic. Widgets that load data in multiple stages (e.g., header at 100ms, rows at 300ms) may have the window close between stages. For these widgets, the layout config supports an optional `measureUntilReady: true` flag. When set, the grid keeps the measurement window open for that item until the widget calls a `reportReady()` callback (provided via React context). `reportReady()` is a no-op if the context is not present (widget rendered outside ogrid), so widgets remain reusable. The 2s hard cap still applies. If a `measureUntilReady` item hits the 2s cap without calling `reportReady()`, a development-mode warning is emitted. This is an opt-in escape hatch that creates a dependency on ogrid's API — the 200ms idle heuristic is the zero-config default.

### onLayoutChange reliability

**What:** After every drag/resize, onLayoutChange provides accurate layout data matching what's visually rendered.

**Why:** Copy/paste, localStorage, controlled mode all depend on getting correct layout data. With compactType:null and collision resolution, positions might be unexpected.

**How to verify:** After every interaction, log the layout from onLayoutChange. Confirm every item's x/y/w/h matches the visual grid.

### Async data loading auto-sizing

Covered by "Dynamic content after mount" — verification step 1. The measurement window (200ms idle / 2s max) handles async data loading. POC test: widget shows "Loading..." for 200ms, then renders a table with 5 rows. Grid waits, measures at loaded size, displays correctly-sized cell.

### Margin interaction with content sizing

**What:** Grid margins (spacing between items) don't cause content clipping.

**Why:** Margins reduce available space per cell. Content-aware sizing must account for margins — minH calculated without margins would be too small.

**How to verify:** Set margin to [16, 16]. Confirm items don't clip content at their minimum sizes.

### Responsive boundary transition

**What:** Rapidly resize viewport across the 768px breakpoint. Layout switches between freeform and compacted modes without items overlapping, disappearing, or the experience feeling broken.

**Why:** Users resize browser windows. The transition between layout modes must be smooth, not jarring.

**How to verify:** Resize viewport across 768px boundary 5 times rapidly. Confirm stable behavior. Also test: create a freeform layout where two items at different `x` positions would occupy the same column after width clamping at a narrower viewport. Switch to compact mode. Verify RGL's vertical compactor resolves all overlaps. Switch back to freeform — verify freeform positions are preserved exactly.

### First-render measurement sequence

**What:** On first render with no config, items must appear at their correct content-driven sizes without visible layout shift or flash of wrong-sized content.

**Why this must be proven:** Chicken-and-egg problem — react-grid-layout needs `w`/`h` to position items, but we need the DOM to exist to measure content. The first render must handle this gracefully.

**Strategy — measure-then-place:**

Phase 1 (measure): Render all items with `opacity: 0`, auto-placed via `computeLayout` at each item's configured `w` (falling back to `cols` if unspecified), `h: 1`. CSS transitions disabled. Items with explicit `w` render at that width so height measurement is accurate for the final width. ResizeObserver measures each item's content height. Height is converted to grid units: `h = Math.ceil((contentHeight + 1 + marginY) / (rowHeight + marginY))` (the +1 is the stabilization buffer).

Phase 2 (place): `computeLayout` runs again with final `w`/`h` to assign `x`/`y` positions. This produces different positions than Phase 1 because items now have real heights. RGL updates positions with transitions still disabled — no animation between placeholder and final layout. Then `opacity: 1`, transitions re-enabled.

This is two `computeLayout` calls but a single measurement. No width changes occur between phases, so no re-measurement is needed.

**Width is NOT auto-sized.** Width defaults to `w: cols` (full grid width). Developers set explicit `w` in the layout config for narrower items. This is intentionally simple — width auto-sizing requires content-dependent heuristics that are fragile and add an extra render pass. Height auto-sizing is the hard problem worth solving. Width is a developer choice.

**Measurement window:** GLOBAL window — one timer for all items. Stays open until ResizeObserver stops firing for 200ms across ALL items, or 2s max. The 200ms idle timer effectively waits for the LAST widget to finish loading + 200ms (staggered loading adds up). One slow-loading widget blocks the reveal of all items. This is accepted: `computeLayout` needs all heights to compute non-overlapping positions, so partial reveals would cause position shifts. The skeleton placeholder is visible during this time (see SSR sequence). The 200ms idle timer resets on every ResizeObserver callback (NOT on RAF batched updates — the timer tracks content changes, not rendering).

**Future optimization (not in POC):** Items with explicit `x`/`y`/`w`/`h` in the config (fully positioned, no auto-sizing needed) could be revealed immediately. Only auto-placed/auto-sized items need the global window. This is a production optimization, not a POC concern.

When the window closes: inner divs switch from `height: auto` to `h-full`, `overflow: auto` is applied (enabling scroll for oversized content), `opacity` is set to 1. CSS transitions disabled during measurement, re-enabled after. Width doesn't change between phases, so no re-measurement is needed.

Monitor CLS — if grid container height changes dramatically between measurement and reveal, set a min-height on the container. CLS between skeleton and final grid is unavoidable unless the skeleton height is approximately correct — document actual CLS in the POC. Consider smooth height transition via CSS when swapping from skeleton to grid.

**Performance budget:** The idle timeout is 200ms everywhere (the single source of truth is the measurement window definition above). POC must measure and log actual measurement duration at 5 and 25 items — the POC measurement is the source of truth, not estimates. If the opacity:0 phase feels too long, show a skeleton placeholder (see SSR sequence).

**Fallback sizing at 2s cap:** When the 2s hard cap fires, any item that hasn't been measured yet (still at `h: 1`) gets a fallback height of `h: 4` (a reasonable default for most dashboard widgets). Items that HAVE been measured but are still oscillating get locked at their last computed height. A development-mode warning is logged for each item that hit the cap. After fallback assignment, `computeLayout` re-runs one final time to reposition items with their fallback heights (Phase 1 placed them at `h: 1`, which is now wrong). Then `opacity: 1` is set. This prevents 25+ item dashboards from having items stuck at `h: 1` or overlapping.

**How to verify:** Load the POC page with no layout config. Items should appear at full width with correct heights. No visible flicker or layout shift. The POC includes a simple skeleton placeholder (gray rectangles at approximate positions) shown during the measurement phase — this tests the actual perceived loading experience, not just measurement correctness.

### SSR and hydration

**What:** The grid is a client-only component. Server renders a loading skeleton or empty container. The real layout computes on the client after mount.

**Why this must be proven:** react-grid-layout requires DOM measurements (container width) that don't exist on the server. Pretending SSR works would produce wrong layouts. Being explicit about client-only rendering is honest and avoids hydration mismatches.

**Full SSR sequence:**
1. Server renders a skeleton placeholder (or empty container with min-height matching expected grid height).
2. Client hydrates. The skeleton remains visible (no blank flash).
3. Measurement pass begins — the component renders a wrapper with `position: relative; width: 100%`. Inside: the skeleton (normal flow, visible, establishes the wrapper's height) and the grid (`position: absolute; inset: 0; opacity: 0` — overlaid but invisible, takes full width from the wrapper). The grid measures content behind the visible skeleton.
4. Measurement window completes. In a single React commit: set `min-height` on the wrapper to the grid's measured height, switch the grid from `position: absolute` to `position: relative` (enters normal flow), set `opacity: 1`, remove the skeleton. The `min-height` prevents wrapper collapse during the transition. Single visual transition from skeleton to final grid.

**How to verify:** Server-rendered HTML shows a placeholder. Client hydration adds the grid without mismatch warnings. The skeleton remains visible until the grid is fully measured and ready. No blank flash between skeleton and grid.

### Click handler on item without interfering with drag

**What:** A click handler (e.g., for a future "css" settings button) can be attached to an item without react-grid-layout's drag system swallowing the click event.

**Why this must be proven:** The dev-tool layer from flexity (css button, floating panel) requires click handlers on items. If react-grid-layout captures all pointer events on its positioning divs, our click handlers won't fire. The drag handle (`draggableHandle`) should scope drag to a specific element, leaving the rest clickable.

**How to verify:** Add a button inside a grid item. Click it — the button's onClick should fire. Drag from the grip icon — the item should drag. These must not interfere with each other.

### Pre-POC investigation (completed)

**constrainSize API — API EXISTS, CONTEXT VERIFIED:** react-grid-layout v2.2.3 (stable). `constrainSize` fires on every resize event (start, during, stop), receives item + proposed w/h in grid units + resize handle + context. The context contains `cols`, `maxRows`, `containerWidth`, `rowHeight`, `margin`. **Important: `layout` in the context is an EMPTY ARRAY** (RGL memoizes context and uses an empty array to avoid callback recreation on layout changes). This means `constrainSize` CANNOT access neighbor positions via context. Resize-overlap prevention must rely on RGL's own collision detection, not on custom logic in `constrainSize`. `constrainSize` is limited to content-minimum clamping using our measurement refs. Constraints compose: grid-level first, then per-item. The built-in `aspectRatio` constraint demonstrates the pattern.

**Auto-placement with compactType:null — APPROACH RESOLVED, NEEDS POC VALIDATION:** Items do NOT pile at (0,0). The monitor repo uses a `computeLayout` function that assigns positions row-by-row (left-to-right, wrap at column boundary) BEFORE passing to react-grid-layout. `noCompactor` is a no-op that preserves these positions. Note: `compactType={null}` and `compactor={noCompactor}` are equivalent — react-grid-layout v2 internally uses noCompactor when compactType is null. The POC uses `compactType={null}` (the public API). We need our own equivalent `computeLayout` — straightforward cursor-based placement. The POC must validate this approach works end-to-end (auto-placement → user drag → persist → reload).

**RGL item wrapper overflow — VERIFIED:** Inspected react-grid-layout@2.2.3 dist output (CSS and JS). RGL does NOT set `overflow` on item wrapper divs — neither in CSS nor inline styles. Item wrappers use `position: absolute` with CSS transforms (`translate3d`) for positioning, and `useCSSTransforms={true}` is the default. Default browser overflow is `visible`. The height:auto measurement technique works without any override needed.

**react-grid-layout version — CONFIRMED:** v2.2.3, the official `latest` on npm (published 2026-03-24). Not a fork — the original STRML/react-grid-layout repo. Actively maintained. All APIs we need (`constrainSize`, `noCompactor`, `preventCollision`, per-item constraints) exist and are documented.

The POC pins react-grid-layout@2.2.3 exactly. If constrainSize has bugs in this release, fallback: use `onResize` callback to detect undersized resize, then call `setState` with the previous (valid) layout, reverting the resize. This causes a visual snap-back (item shrinks then snaps back to minimum) which is noticeable UX but functional. To reduce snap-back visibility, combine with `minW`/`minH` on layout items — RGL enforces these natively during resize, giving the same effect as constrainSize for the minimum case. The POC should test both approaches: constrainSize (primary) and minW/minH (fallback). If constrainSize works, use it for smoother UX. If not, minW/minH alone may be sufficient.

## POC structure

```
ogrid/
  POC.md           # this document
  apps/
    poc/            # single-page Next.js app
      src/
        app/
          page.tsx  # the POC page with ~5 widgets
        widgets/
          kpi-card.tsx
          chart.tsx
          data-table.tsx
          tall-widget.tsx
          text-widget.tsx
          async-table.tsx   # simulates API data loading with delay
          layout-switch.tsx # non-monotonic height: 1-col→2-col at width threshold
      package.json
  package.json      # monorepo root
```

## POC does NOT include

- Dev toolbar (gap, snap, columns, copy, reset)
- Per-item css button / floating settings panel
- Copy/paste config workflow
- Type safety / TypeScript generics
- BannedClass validation
- localStorage persistence (state transitions are verified via re-mounting with emitted layout data, not page reload)
- Controlled / uncontrolled mode
- Panel component
- npm package build
- Tests
- Linting

The UX patterns for these features are proven in flexity. The implementations will need to be adapted to the grid-unit model (e.g., copy/paste copies grid-unit positions instead of pixel sizes, type definitions use x/y/w/h instead of just w/h). The POC only proves the layout engine integration.

## Success criteria

All points verified. If any point fails, we document why and decide whether to:
1. Work around it (acceptable tradeoff)
2. Choose a different approach (CSS Grid, different library)
3. Accept the limitation and document it

No point should be a surprise after the POC. If we proceed to full implementation, we proceed with confidence.

## Build workflow

The POC is built in 4 phases across 4 sessions. Each phase is one session. After completing a phase, STOP and ask the user to verify in the browser before proceeding.

**Rules:**
- Read this entire document before starting any phase
- Follow all conventions in CLAUDE.md (auto-loaded by Claude Code)
- Only code when everything is clear, ask if unsure

### Phase tracker

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Project scaffold | not started |
| A | Go/no-go tests | not started |
| B | All remaining tests | not started |
| C | Scale test (25 items) | not started |

### Phase 0 — Project scaffold

**Build:**
- Next.js app at `ogrid/apps/poc/` (App Router)
- Install and pin `react-grid-layout@2.2.3`
- Tailwind v4 setup
- Create placeholder widgets: `kpi-card.tsx`, `chart.tsx`, `data-table.tsx`, `tall-widget.tsx`, `text-widget.tsx` with simple static content
- Basic `page.tsx` that renders a raw `<GridLayout>` with 3-4 hardcoded items
- Verify: page loads, items render in a grid, no errors

**After completing:** Update the phase tracker above to "done". STOP and ask the user to verify: "The page should load at localhost:3000 with items visible in a grid layout. Please verify and tell me to proceed to Phase A."

### Phase A — Go/no-go tests

4 tests that determine whether the approach is viable. Build incrementally on the Phase 0 scaffold, committing after each test.

**Test A1 — constrainSize runtime behavior:**
- Grid-level `constrainSize` clamping `h` to a hardcoded minimum (e.g., 3 rows) for the data-table
- Per-item constraint on one widget
- Console.log every constrainSize call (item id, proposed w/h, returned w/h)
- Chart widget without constraint shrinks freely
- Go/no-go: if constrainSize doesn't prevent undersized resize (snap-back or ignored), fall back to `minW`/`minH` on layout items

**Test A2 — Scroll inside cell:**
- One widget with more content than fits (overflow: auto on inner div)
- `draggableHandle` on a grip icon
- Scrolling inside widget must NOT trigger drag
- Buttons/links inside remain clickable
- Go/no-go: if scroll conflicts with drag, need alternative drag trigger

**Test A3 — ResizeObserver measurement → re-render:**
- Single ResizeObserver on all item inner divs
- `h = Math.ceil((contentHeight + 1 + marginY) / (rowHeight + marginY))`
- RAF-batched into single setState
- Console.log callback count per item, total setState calls
- Must stabilize within 3 callbacks per item, no infinite loops, no flicker
- Go/no-go: if ResizeObserver → setState causes infinite loops, need different measurement approach

**Test A4 — Collision mode decision:**
- Toggle button for `preventCollision` true/false
- `compactType: null` (freeform)
- Test drag-onto-occupied and resize-into-neighbor under both modes
- Document which mode produces better UX

**After completing:** Update the phase tracker above to "done". STOP and ask the user to verify:
- "Resize data-table — does it stop at minimum with no snap-back?"
- "Resize chart — does it shrink freely?"
- "Scroll inside a widget — does it scroll without triggering drag?"
- "Click buttons inside widget — do they work?"
- "Items have correct auto-measured heights? No infinite loops?"
- "Try drag-onto-occupied under both collision modes — which do you prefer?"

### Phase B — All remaining tests

All POC.md validation points not covered by Phase A, using the collision mode chosen in Phase A. One session, built incrementally. Each test corresponds to a section under "POC — What we need to prove" above.

**Tests:**
- Content-driven auto-sizing on first render (opacity:0 → measure → opacity:1 sequence)
- Row spanning (tall chart next to stacked KPI cards)
- Freeform placement with gaps (compactType: null, gaps persist across re-mount)
- Drag to empty cell
- Drag handle + interactive content
- Smooth transitions (CSS transitions on position changes)
- Responsive behavior (768px breakpoint, freeform ↔ compact mode switch)
- Cell className + content centering
- Dynamic minH after width resize
- Auto-placement (computeLayout for items without explicit x/y)
- Column count change + reflow (computeLayout runs BEFORE RGL)
- New item into existing freeform layout
- Overlap prevention (all scenarios: drag, resize, column change, responsive)
- Ring on outer div follows resize
- Grid unit conversion accuracy
- Minimal DOM (2 divs per item max)
- Dense grid + constraint deadlock
- ResizeObserver stabilization (no oscillation at row boundaries)
- Tailwind v4 + RGL CSS compatibility
- Stale layout (userResized flag)
- Dynamic content after mount (measurement window closes, content scrolls)
- onLayoutChange reliability
- Async data loading auto-sizing (async-table.tsx with 1.5s delay)
- Margin interaction with content sizing
- Responsive boundary transition (rapid 768px crossing)
- First-render measurement sequence (2-phase computeLayout)
- SSR and hydration
- Click handler without drag interference

**After completing:** Update the phase tracker above to "done". STOP and ask the user to verify. List every test with what to check in the browser.

### Phase C — Scale test (25 items)

**Build:**
- 25 widgets (mix of KPI cards, charts, tables, text)
- One widget with 1.5s simulated async data load (async-table.tsx)
- One widget with non-monotonic height (layout-switch.tsx)
- Measure and log to console:
  - Perceived loading time (opacity:0 → opacity:1)
  - Drag fps (performance.now() around RAF)
  - Measurement-phase setState call count
  - React component re-render count
  - computeLayout execution time

**After completing:** Update the phase tracker above to "done". STOP and ask the user to verify:
- "All 25 items render correctly?"
- "Drag feels smooth? (target 60fps, acceptable ≥45fps, showstopper <30fps)"
- "Measurement phase feels fast enough?"
- "Check console metrics"

### Continuation prompt (paste into a fresh session)

```
Read POC.md thoroughly. Check the phase tracker to see which phase to build next. Build that phase, following the rules and instructions in the document. After completing, update the phase tracker and STOP to ask me to verify before proceeding.
```
