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
- **Fill by default** — the inner cell div is `h-full w-full` so it fills the RGL positioning div. The component inside renders at natural flow — it is NOT given `h-full`. During measurement, the inner div has `height: auto` (not `h-full`) so content renders at natural height for measurement. After the measurement window closes, the inner div switches to `h-full` so it fills the cell. Components that want to stretch vertically (charts) use `h-full` on themselves. Components with fixed content (tables, text) render at natural height and get centered or top-aligned inside the cell via `className`. Small content that wants centering opts in via `className: 'flex items-center justify-center'` on the layout entry
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

- Must use react-grid-layout as the layout engine (proven drag/resize/collision)
- Must support React 19+ and Next.js 16+
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
- **No pixel-level width control** — width is column spans, not pixels. A 4-column grid on a 1200px viewport gives 300px columns. You get 300, 600, 900, 1200 — not 437px.
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

**Why this must be proven:** react-grid-layout's resize callbacks are read-only (`void` return). You can't cancel a resize mid-drag from callbacks. The constraint API (`constrainSize`) runs before layout updates and can enforce minimums. But we've never used it — need to prove it actually prevents undersized resize in practice.

**How to verify:** Resize a table widget smaller — it should stop at the table's natural width/height. Resize a chart widget smaller — it should shrink freely (chart adapts via ResponsiveContainer). Classification: the grid always measures content at height:auto to get the natural minimum. Charts with ResponsiveContainer render at minimal height when unconstrained (because they fill available space via percentage height — with no explicit height, they collapse). Fixed content like tables render at their full height. No explicit declaration needed — the measurement technique naturally distinguishes them. Note: this technique works when chart components collapse without explicit height (like recharts' ResponsiveContainer). Chart libraries with intrinsic height that DON'T collapse will be treated as fixed content and won't shrink below their intrinsic height. Consumers using such libraries can set an explicit minH override in the layout config if they want free shrinking.

### Row spanning

**What:** A tall chart occupies 2 rows while two KPI cards stack beside it in the same 2 rows.

**Why this must be proven:** This is THE reason we abandoned flexbox. It's table stakes for any dashboard grid. react-grid-layout supports this via `h` spanning multiple rows. But we need to see it working with our auto-sizing and content-aware constraints — not just with hardcoded dimensions.

**How to verify:** Place a chart with `rowSpan: 2` next to two KPI cards each with `rowSpan: 1`. All three should render correctly with the chart spanning both rows.

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

**Note:** `constrainSize` does NOT fire during drag — it only fires during resize. Collision protection during drag relies on `minW`/`minH` set on each layout item. The grid must set `minW`/`minH` on every layout item based on content measurements so that collision resolution cannot shrink items below their content minimum.

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

**How to verify:** Render the grid at 1920px width. Narrow the window to 800px. Items should reflow sensibly. Strategy: freeform (`compactType: null`) above 1200px, vertical compaction below. `compactType={width < 1200 ? 'vertical' : null}`. Verify the transition is smooth and items don't overlap at the breakpoint. State management: one layout array (freeformLayout). Above 1200px, use it directly. Below 1200px, derive compacted layout from it on every render. No separate compacted state.

**Mode switch behavior:** Freeform layout is canonical. Compact layout is DERIVED on every render from freeformLayout using vertical compaction (react-grid-layout's built-in compact function) — no separate compactedLayout state variable. Switching back above 1200px restores freeformLayout as-is. Drag and resize are DISABLED in compact mode (`isDraggable={false}` `isResizable={false}`) — this is a read-only responsive view. Users see the compacted layout but cannot edit it. This avoids the confusion of edits "disappearing" when switching back to freeform. If users need to edit layout on mobile, that's a future feature (separate mobile layout config), not a POC concern.

**Compact mode column count:** Stays at the developer-configured column count. Items with `w` larger than available space are capped to `cols`. The vertical compaction algorithm handles repositioning — items keep their `w` but get new `x`/`y` to eliminate gaps and resolve overlaps. The column count does NOT change at the breakpoint — only the compaction mode changes.

**Item addition/removal:** When items are added or removed, freeformLayout is updated. New items get auto-placed via `computeLayout`. Removed items are filtered out. CompactedLayout is always re-derived from freeformLayout — no sync needed.

**RGL component:** The POC uses `<GridLayout>` (not `<ResponsiveGridLayout>`), with manual width detection via ResizeObserver on the grid container. This gives full control over the compactType toggle without fighting RGL's breakpoint system.

### Cell className

**What:** A layout entry can have an optional `className` (e.g., `'bg-muted rounded-lg'`) applied to the cell container. Content is centered inside.

**Why this must be proven:** react-grid-layout's item wrapper has absolute positioning and explicit dimensions. Adding an inner div with className + centering must not break the positioning or resize behavior. The className must be visually correct — background fills the cell, rounded corners follow the cell boundary.

**How to verify:** Give one item `className: 'bg-muted rounded-lg'`. It should have a muted background with rounded corners filling the entire cell. Content should be centered inside.

### Content centered in cell

**What:** By default, content fills the cell (`h-full w-full`). Charts, tables, and most dashboard content should fill their cells. Small content that wants centering can opt in via `className: 'flex items-center justify-center'` on the layout entry.

**Why this must be proven:** The default must work for the most common case (charts filling cells) without extra config. Centering is opt-in, not default.

**How to verify:** Place a chart and a table — both should fill their cells without any className. Place a small KPI card with `className: 'flex items-center justify-center'` — it should center.

### Dynamic minH after width resize

**What:** Resize an item wider. Content reflows (text unwraps, table columns spread). The minimum height changes. The item can now be made shorter because the content is shorter at the wider width.

**Why this must be proven:** If `minH` is calculated once and never updated, widening an item doesn't allow shrinking height even though the content now fits in less vertical space. The constraint must recalculate when column span changes.

**How to verify:** Place a widget with wrapping text. Resize it from 1 column to 2 columns — text unwraps, content gets shorter. Then resize it shorter (height). It should allow shrinking to the new, shorter content height. Recalculation happens on span change (discrete events), not every frame — zero wasted work. The grid measures the component's rendered height as-is (including any internal padding the component has). Cell styling from `className` is for the cell container only (bg, rounded, border) — not padding. Interior spacing is the component's responsibility. Timing: when column span changes, the grid updates w in the layout. React re-renders the item at the new width. ResizeObserver fires (content reflowed at new width). The observer updates the measurement ref. The NEXT constrainSize call reads the fresh ref. This is a multi-frame sequence: frame 1 (width change + re-render), frame 2 (browser reflow + observer fires + ref updated), frame 3+ (constraint reads fresh data). The one-frame lag is safe for MOST content: when width increases, content typically gets shorter (text unwraps), so the OLD minH is larger than the new minH — stale data over-constrains, never under-constrains. When width decreases, content gets taller, but the user is narrowing — the next constrainSize call gets the fresh (larger) minH.

**Edge case — non-monotonic height:** Components with CSS breakpoints or layout switches (e.g., switching from single-column to two-column at a width threshold) could get TALLER when wider. For one frame, the stale minH would be too small. Mitigation: `constrainSize` uses `Math.max(currentMinH, previousMinH)` during the transition frame — always pick the larger of the two. `previousMinH` is a one-frame guard: it is set when width changes, and cleared when the next ResizeObserver measurement commits (fresh data replaces the guard). This prevents items from getting permanently stuck at a larger-than-necessary minH. Also test diagonal resize (both width and height simultaneously). Confirm content is never visibly clipped, even with non-monotonic height components.

### Constraint API works for content clamping

**What:** react-grid-layout v2's `constrainSize` function runs before layout updates and can enforce minimum sizes based on content measurement.

**Why this must be proven:** This is the foundation of content-aware resize. The constraint API is documented but we've never used it. Need to confirm it actually fires during resize, receives the correct context (item, proposed size, container dimensions), and successfully prevents undersized cells. Measurement data flow: ResizeObserver updates a ref (not state) with the latest content dimensions. The constrainSize function reads from this ref synchronously. This avoids async gaps where stale measurements would allow undersized cells.

**Important:** `constrainSize` fires during RESIZE only, not during drag. During drag, content minimum protection comes from `minW`/`minH` set on each layout item. The grid must keep `minW`/`minH` in sync with content measurements at all times. Two protection mechanisms for two interaction types: `constrainSize` for resize (real-time clamping), `minW`/`minH` for drag collision (prevents collision resolution from shrinking items below content minimum).

**minW/minH sync mechanism:** When ResizeObserver fires (content changed), the observer callback updates both the `measurementsRef` (for constrainSize) AND triggers a batched state update that sets `minW`/`minH` on the corresponding layout items. This keeps `minW`/`minH` in sync with actual content. The state update is batched via `requestAnimationFrame` — at most one re-render per frame, regardless of how many items changed.

**How to verify:** Add a constraint that logs every call. Resize an item — confirm the constraint fires and prevents shrinking below content. Then drag an item onto another — confirm `minW`/`minH` prevents the displaced item from being shrunk below its content minimum by collision resolution.

### Auto-placement with compactType: null

**What:** When items have no explicit `x, y` position, they auto-place in a sensible grid pattern (row by row, left to right) even with `compactType: null`.

**Why this must be proven:** This is potentially contradictory. `compactType: null` means "don't move items." But items with no position need to be placed somewhere. react-grid-layout might pile them all at `(0,0)` and overlap. We might need our own auto-placement algorithm that runs once on first render, then freeform after.

**computeLayout algorithm:** Simple row-by-row scan with a 2D occupancy grid. For each unpositioned item (in config order): scan cells left-to-right, top-to-bottom, find the first position where the item fits (w×h block is unoccupied), place it there. If no position fits in existing rows, extend the grid downward. This handles variable-height items correctly — a tall item occupies multiple rows in the occupancy grid, and subsequent items flow around it. Same algorithm used in the monitor repo.

**How to verify:** Render 6 uniform items in a 3-column grid with no explicit positions. They should arrange in a 3×2 pattern, not overlap. Also test with mixed sizes: one `w:2, h:2` item and four `w:1, h:1` items in a 3-column grid. Confirm the auto-placement handles non-uniform sizes without overlap or dead space.

### Overlap prevention with compactType: null

**What:** No two items ever visually overlap, regardless of drag behavior or window resize.

**Why this must be proven:** With no compaction, collision resolution is different. Items can't be pushed "down" by a compactor. The chosen collision mode (preventCollision true or false, determined by the drag collision test above) must guarantee no overlap in all scenarios: drag, resize, responsive reflow, column count change.

**How to verify:** After every interaction (drag, resize, column change, responsive switch), inspect the layout array. No two items should have overlapping `(x, y, w, h)` rectangles. Visually confirm no overlap.

### Ring on outer div follows resize

**What:** The hover outline (ring) is on react-grid-layout's item wrapper div. When the user resizes, the ring follows the resize in real-time because react-grid-layout updates that same div's dimensions.

**Why this must be proven:** In flexity, the ring was on a different div than the one being resized (inner wrapper vs outer), causing the ring to not follow. With react-grid-layout, if we put the ring on the outer div (which react-grid-layout controls), it should follow. But need to confirm react-grid-layout updates dimensions continuously during drag, not just on stop.

**How to verify:** Hover an item (ring appears). Drag the resize handle. The ring should grow/shrink in real-time with the resize.

### Dynamic column count

**What:** Changing the column count (e.g., 4 → 3) reflows the entire grid. Items at positions that no longer exist (e.g., `x: 3` in a 3-column grid) are handled gracefully.

**Why this must be proven:** The toolbar will let developers change column count. If items go off-grid or overlap after a column change, the feature is broken.

**How to verify:** Render a 4-column grid with an item at `x: 3`. Change to 3 columns. RGL's `correctBounds` should clamp `x` to fit. Verify the clamped item doesn't overlap others. If `correctBounds` with `compactType: null` causes overlaps, we need a custom reflow that runs `computeLayout` on all out-of-bounds items. Test with multiple items at the boundary to confirm no overlaps.

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

**How to verify:** Add 25+ items to the POC page. Drag and resize several items. Use Chrome DevTools Performance panel to measure: frame rate (should stay above 30fps minimum, target 60fps), longest task duration during interaction, and number of layout recalculations per drag/resize frame. If RGL's layout algorithm is O(n²), 25 items may cause visible jank — document the threshold where performance degrades.

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

### Content measurement inside absolute-positioned container

**What:** The height:auto measurement technique must produce correct results inside react-grid-layout's absolutely-positioned item wrappers.

**Why:** flexity measured content in flexbox containers. react-grid-layout uses `position: absolute` with explicit width/height. Setting height:auto on a child inside an absolutely-positioned, explicitly-sized container might not produce the natural content height.

**Measurement target:** The `height: auto` technique is applied to the INNER div (our cell styling div), NOT the outer absolutely-positioned div (react-grid-layout's wrapper). The outer div has `position: absolute` with explicit width/height from RGL — we never modify those. The inner div is a normal-flow child inside the absolute container. Setting `height: auto` on it lets it shrink to its content's natural height. `getBoundingClientRect()` on the inner div gives the content's natural height. ResizeObserver also observes the inner div's content box.

**How to verify:** Measure a table's natural height using the height:auto technique on the inner div inside an RGL wrapper. Compare against the table's known height. They must match. Also verify that modifying the inner div's height does not affect RGL's positioning of the outer div.

### ResizeObserver stabilization (no infinite loops)

**What:** Auto-sizing via ResizeObserver must stabilize and not cause infinite re-render loops.

**Why:** The same class of bug that burned us in flexity. Flow: observer fires → update layout w/h → RGL re-renders → content reflows slightly differently → observer fires again → loop.

**Strategy:** Measurements are snapped to grid units. The loop stops when the grid-unit size doesn't change, even if pixel size shifted slightly within the same unit. Grid units act as a natural quantization boundary.

**Edge case — boundary oscillation:** Content at exactly a grid-unit boundary (e.g., 90.0px with rowHeight=30) could oscillate between 3 and 4 rows if sub-pixel rendering shifts it between 89.9px and 90.1px. Mitigation: add a 1px tolerance buffer — `Math.ceil((contentHeight + 1 + marginY) / (rowHeight + marginY))`. This ensures content right at the boundary rounds up consistently. The 1px buffer is cheaper than the alternative (infinite loop).

**Safety net:** Hard cap of 3 re-measurements per item. If an item's grid-unit size is still changing after 3 measurements, lock it at the last computed size and log a warning. This prevents infinite loops even if quantization fails to converge for edge-case content.

**How to verify:** Place a text widget that reflows at different widths. Log ResizeObserver callback count. Must stabilize within 3 callbacks. No infinite re-renders. Also test with content height exactly at a row boundary (e.g., exactly 90px with rowHeight=30) — must not oscillate.

### Tailwind v4 and react-grid-layout CSS compatibility

**What:** react-grid-layout's built-in CSS (resize handles, drag placeholder, transition animations) renders correctly with Tailwind v4's preflight reset enabled.

**Why:** Tailwind's preflight resets margins, padding, borders. RGL's CSS uses specific class names for handles and placeholders. CSS specificity conflicts could break the visual interaction layer.

**How to verify:** Import RGL's CSS alongside Tailwind v4. Confirm resize handles are visible, drag placeholder appears correctly, and transition animations work.

### Stale layout on load (user-sized vs auto-sized)

**What:** The grid tracks two flags per item: `userPositioned` (user dragged it) and `userResized` (user resized it). On load: items with `userResized: true` retain their saved size — if content doesn't fit, it scrolls internally. Items with `userPositioned: true` but NOT `userResized` retain their position but get auto-sized height. Items with neither flag get both auto-placed and auto-sized.

**Why:** The monitor repo uses `userResized` (Set). We extend with `userPositioned` to track position intent separately from size intent. A user who only drags an item hasn't expressed intent about its size — height should still auto-size on reload. This respects user intent — a user who made an item small intentionally shouldn't have the grid expand it on every load.

**How to verify:** Auto-size an item, save layout, change content to be taller, reload — item should grow. Then manually resize that item smaller, save, change content again, reload — item should stay at user's size and content scrolls.

### Dynamic content after mount

**What:** Auto-sizing happens during the INITIAL MEASUREMENT WINDOW only — not just the first synchronous render. The measurement window stays open until content stabilizes (ResizeObserver stops firing for 200ms) or a maximum timeout (2 seconds) elapses, whichever comes first. After the window closes, the layout is locked. If content grows later, it scrolls inside the cell. The cell does NOT auto-grow.

**Why:** Real widgets load data asynchronously (API calls, lazy imports). A strict "first render only" rule would measure empty loading states and produce wrong sizes. The measurement window allows async content to load and stabilize before locking the layout. The timeout prevents indefinitely-loading widgets from blocking the grid.

**How to verify:**
1. Render a widget that fetches data after 200ms. Confirm the grid waits and sizes correctly after data loads.
2. Render a widget that fetches data after 200ms. After data loads AND the measurement window closes, add 10 more rows. Confirm the cell does NOT grow — extra rows are scrollable inside the cell.
3. Render a widget that takes 5 seconds to load. Confirm the grid locks at the 2-second timeout and doesn't wait forever. The slow widget gets the size measured at timeout.

**Edge case — userSized items:** If a user has already manually resized an item (userResized: true), the measurement window does NOT apply. The user's explicit size is always respected, even on reload with new content.

**Edge case — user interaction during measurement window:** If the user drags or resizes an item while the measurement window is still open, that item is immediately marked `userResized: true` and excluded from further auto-sizing. The measurement window continues for other items. This prevents the auto-sizer from overwriting the user's explicit action.

### onLayoutChange reliability

**What:** After every drag/resize, onLayoutChange provides accurate layout data matching what's visually rendered.

**Why:** Copy/paste, localStorage, controlled mode all depend on getting correct layout data. With compactType:null and collision resolution, positions might be unexpected.

**How to verify:** After every interaction, log the layout from onLayoutChange. Confirm every item's x/y/w/h matches the visual grid.

### Async data loading auto-sizing

**What:** A widget that loads data asynchronously (simulated API call with setTimeout) renders correctly at its data-loaded size, not its empty/loading size.

**Why this must be proven:** Real dashboard widgets fetch data from APIs. A strict "first synchronous render only" measurement would capture the loading spinner or empty state, producing wrong sizes. The measurement window (500ms idle / 2s max) must handle this.

**How to verify:** Create a widget that shows "Loading..." for 200ms, then renders a table with 5 rows. The grid should wait for the data, measure the table at its loaded size, and display the correctly-sized cell. No flicker of wrong-sized content.

### Margin interaction with content sizing

**What:** Grid margins (spacing between items) don't cause content clipping.

**Why:** Margins reduce available space per cell. Content-aware sizing must account for margins — minH calculated without margins would be too small.

**How to verify:** Set margin to [16, 16]. Confirm items don't clip content at their minimum sizes.

### Responsive boundary transition

**What:** Rapidly resize viewport across the 1200px breakpoint. Layout switches between freeform and compacted modes without items overlapping, disappearing, or the experience feeling broken.

**Why:** Users resize browser windows. The transition between layout modes must be smooth, not jarring.

**How to verify:** Resize viewport across 1200px boundary 5 times rapidly. Confirm stable behavior.

### First-render measurement sequence

**What:** On first render with no config, items must appear at their correct content-driven sizes without visible layout shift or flash of wrong-sized content.

**Why this must be proven:** Chicken-and-egg problem — react-grid-layout needs `w`/`h` to position items, but we need the DOM to exist to measure content. The first render must handle this gracefully.

**Strategy — single-pass measurement:**

Render all items with `opacity: 0`, auto-placed via `computeLayout` at each item's configured `w` (falling back to `cols` if unspecified), `h: 1`. Items with explicit `w` render at that width so height measurement is accurate for the final width. ResizeObserver measures each item's content height. Height is converted to grid units: `h = Math.ceil((contentHeight + 1 + marginY) / (rowHeight + marginY))` (the +1 is the stabilization buffer). Then `computeLayout` runs again with final `w`/`h` to assign `x`/`y` positions.

**Width is NOT auto-sized.** Width defaults to `w: cols` (full grid width). Developers set explicit `w` in the layout config for narrower items. This is intentionally simple — width auto-sizing requires content-dependent heuristics that are fragile and add an extra render pass. Height auto-sizing is the hard problem worth solving. Width is a developer choice.

**Measurement window:** stays open until content stabilizes (ResizeObserver stops firing for 200ms) or 2s max. When the window closes, the inner div switches from `height: auto` to `h-full`, `overflow: auto` is applied (enabling scroll for oversized content), `opacity` is set to 1. Disable CSS transitions during measurement to prevent animation from placeholder to final sizes. Re-enable after. This is a single render pass (not two) — no width changes means no re-measurement needed. The 200ms idle timer resets on every ResizeObserver callback (NOT on RAF batched updates — the timer tracks content changes, not rendering).

Monitor CLS — if grid container height changes dramatically between measurement and reveal, set a min-height on the container. Performance budget: time from navigation to visible grid must be under 200ms for 5 items with synchronous content (no async data). For items with async data, the grid becomes visible after data loads + 200ms idle stabilization (the idle timeout). The 500ms idle timeout from the measurement window is the MAX idle wait — the grid reveals as soon as ResizeObserver is idle for 200ms, not 500ms. The 2s hard cap is the absolute maximum. If the opacity:0 phase feels too long, show a skeleton placeholder instead of blank space (see SSR sequence).

**How to verify:** Load the POC page with no layout config. Items should appear at full width with correct heights. No visible flicker or layout shift.

### SSR and hydration

**What:** The grid is a client-only component. Server renders a loading skeleton or empty container. The real layout computes on the client after mount.

**Why this must be proven:** react-grid-layout requires DOM measurements (container width) that don't exist on the server. Pretending SSR works would produce wrong layouts. Being explicit about client-only rendering is honest and avoids hydration mismatches.

**Full SSR sequence:**
1. Server renders a skeleton placeholder (or empty container with min-height matching expected grid height).
2. Client hydrates. The skeleton remains visible (no blank flash).
3. Measurement pass begins — the component renders a wrapper with `position: relative; width: 100%`. Inside: the skeleton (normal flow, visible, establishes the wrapper's height) and the grid (`position: absolute; inset: 0; opacity: 0` — overlaid but invisible, takes full width from the wrapper). The grid measures content behind the visible skeleton.
4. Measurement window completes. Grid sets `opacity: 1`, skeleton conditionally rendered away (`{!ready && <Skeleton />}`). Single visual transition from skeleton to final grid.

**How to verify:** Server-rendered HTML shows a placeholder. Client hydration adds the grid without mismatch warnings. The skeleton remains visible until the grid is fully measured and ready. No blank flash between skeleton and grid.

### Click handler on item without interfering with drag

**What:** A click handler (e.g., for a future "css" settings button) can be attached to an item without react-grid-layout's drag system swallowing the click event.

**Why this must be proven:** The dev-tool layer from flexity (css button, floating panel) requires click handlers on items. If react-grid-layout captures all pointer events on its positioning divs, our click handlers won't fire. The drag handle (`draggableHandle`) should scope drag to a specific element, leaving the rest clickable.

**How to verify:** Add a button inside a grid item. Click it — the button's onClick should fire. Drag from the grip icon — the item should drag. These must not interfere with each other.

### Pre-POC investigation (completed)

**constrainSize API — VERIFIED:** react-grid-layout v2.2.3 (stable). `constrainSize` fires on every resize event (start, during, stop), receives item + proposed w/h in grid units + resize handle + full context (cols, containerWidth, rowHeight, margin, layout), returns constrained `{ w, h }`. Constraints compose: grid-level first, then per-item. The built-in `aspectRatio` constraint demonstrates the exact pattern we'll use for content minimum clamping.

**Auto-placement with compactType:null — APPROACH RESOLVED, NEEDS POC VALIDATION:** Items do NOT pile at (0,0). The monitor repo uses a `computeLayout` function that assigns positions row-by-row (left-to-right, wrap at column boundary) BEFORE passing to react-grid-layout. `noCompactor` is a no-op that preserves these positions. Note: `compactType={null}` and `compactor={noCompactor}` are equivalent — react-grid-layout v2 internally uses noCompactor when compactType is null. The POC uses `compactType={null}` (the public API). We need our own equivalent `computeLayout` — straightforward cursor-based placement. The POC must validate this approach works end-to-end (auto-placement → user drag → persist → reload).

**react-grid-layout version — CONFIRMED:** v2.2.3, the official `latest` on npm (published 2026-03-24). Not a fork — the original STRML/react-grid-layout repo. Actively maintained. All APIs we need (`constrainSize`, `noCompactor`, `preventCollision`, per-item constraints) exist and are documented.

The POC pins react-grid-layout@2.2.3 exactly. If constrainSize has bugs in this release, fallback: implement constraint behavior via onResize callback + setState to reject undersized layouts. This is less clean but achievable.

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

These are all proven in flexity. The POC only proves the layout engine integration.

## Success criteria

All points verified. If any point fails, we document why and decide whether to:
1. Work around it (acceptable tradeoff)
2. Choose a different approach (CSS Grid, different library)
3. Accept the limitation and document it

No point should be a surprise after the POC. If we proceed to full implementation, we proceed with confidence.
