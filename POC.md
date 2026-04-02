# ogrid — Proof of Concept

## Why this exists

We built a dashboard grid library called flexity. It took 30+ hours. It had great developer experience — zero config, type safety, visual dev tools, copy/paste workflow, content-aware resize clamping. Then we realized the layout engine (flexbox) couldn't do the one thing every dashboard needs: a tall chart sitting next to two stacked KPI cards. Row spanning. Flexbox can't do it.

This POC validates the next attempt before we invest another 30+ hours.

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
- **Android home screen UX** — items snap to grid cells, freeform placement, configurable columns
- **One source of truth** — layout config is the single place all placement/sizing lives
- **Fail fast** — wrong config caught immediately
- **Opinionated** — the library makes decisions so developers don't have to
- **Don't fight the layout engine** — use react-grid-layout's proven interaction code, add value on top

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
- **Content centered** — items sit centered in their cell by default
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

## Why no one has solved this

- **react-grid-layout** — great layout engine, but no content-aware sizing, no dev tooling, requires explicit dimensions
- **react-rnd** — freeform canvas, not grid-based. No snapping, no columns, no auto-placement
- **CSS Grid alone** — layout is solved, but drag/resize/collision needs hundreds of JS edge cases
- **Flexbox libraries** — can't do row spanning (learned the hard way)
- **Existing dashboard builders** — either too opinionated (fixed widget set) or too low-level (just a layout engine)

The gap: no library combines a proven grid layout engine with content-aware auto-sizing, content-minimum resize constraints, and a visual developer experience layer. That's what ogrid fills.

## POC — What we need to prove

The POC is a single page with ~5 widgets. No dev tools, no toolbar, no copy/paste. Just the layout engine + content-aware behavior. Each point below is a potential showstopper — if any fails, we rethink before investing further.

### 1. Content-driven auto-sizing on first render

**What:** Items size to their content on mount with no explicit `w`/`h` in the config.

**Why this must be proven:** react-grid-layout requires explicit `w`/`h` in grid units for every layout item. Our wrapper must auto-measure content via ResizeObserver, convert pixel dimensions to grid units, and set `w`/`h` dynamically. If this doesn't work — if items render with wrong sizes or flicker during measurement — the zero-config promise breaks.

**How to verify:** Render a table, a chart, and a KPI card with no layout config. They should appear at their natural content size.

### 2. Content minimum resize clamping

**What:** Dragging a resize handle, the cell stops shrinking at the content's natural size. A table can't be crushed. A chart can shrink (it adapts).

**Why this must be proven:** react-grid-layout's resize callbacks are read-only (`void` return). You can't cancel a resize mid-drag from callbacks. The constraint API (`constrainSize`) runs before layout updates and can enforce minimums. But we've never used it — need to prove it actually prevents undersized resize in practice.

**How to verify:** Resize a table widget smaller — it should stop at the table's natural width/height. Resize a chart widget smaller — it should shrink freely (chart adapts via ResponsiveContainer).

### 3. Row spanning

**What:** A tall chart occupies 2 rows while two KPI cards stack beside it in the same 2 rows.

**Why this must be proven:** This is THE reason we abandoned flexbox. It's table stakes for any dashboard grid. react-grid-layout supports this via `h` spanning multiple rows. But we need to see it working with our auto-sizing and content-aware constraints — not just with hardcoded dimensions.

**How to verify:** Place a chart with `rowSpan: 2` next to two KPI cards each with `rowSpan: 1`. All three should render correctly with the chart spanning both rows.

### 4. Freeform placement with gaps

**What:** Items stay where you put them. Empty cells between items are preserved. No auto-compaction.

**Why this must be proven:** react-grid-layout's `compactType: null` disables compaction. But we need to confirm items don't overlap, don't auto-pack, and gaps persist across re-renders and page reloads.

**How to verify:** Place items with intentional empty cells between them. Reload the page. Gaps should persist.

### 5. Drag to any empty cell

**What:** Pick up an item, drop it in an empty area of the grid. It stays there.

**Why this must be proven:** With `compactType: null`, dragging to an empty area should work. But collision detection with no compaction might reject drops in unexpected ways. Need to confirm the interaction feels natural.

**How to verify:** Drag a KPI card to an empty area several rows below. It should land there and stay.

### 6. Drag reorder

**What:** Drag an item onto another. The other item moves out of the way.

**Why this must be proven:** With `compactType: null`, what happens when items collide during drag? Do they push? Swap? Overlap? The behavior might differ from compacted mode.

**How to verify:** Drag one item directly onto another. The displaced item should move to a sensible position without overlapping.

### 7. Drag handle

**What:** Dragging only works from a grip icon, not from content. Buttons, inputs, and links inside widgets remain interactive.

**Why this must be proven:** react-grid-layout supports `draggableHandle` (CSS selector). But we need to confirm interactive content (buttons, inputs, links) inside widgets still works — click events don't get swallowed by the drag system.

**How to verify:** Place a widget with a button inside. Click the button — it should fire. Drag from the grip icon — it should drag.

### 8. Smooth transitions

**What:** When one item is dragged or resized, other items animate smoothly to their new positions.

**Why this must be proven:** react-grid-layout has built-in CSS transitions. But with `compactType: null` and our content-aware constraints, the transitions might break or look janky.

**How to verify:** Resize an item. Watch neighboring items — they should slide smoothly, not teleport.

### 9. Responsive behavior

**What:** When the browser window gets narrower, items reflow sensibly. Items with `w` larger than available columns are capped.

**Why this must be proven:** With `compactType: null` and freeform placement, narrowing the window might cause items to overflow the container or overlap. react-grid-layout might not handle responsive behavior well without compaction.

**How to verify:** Render the grid at 1920px width. Narrow the window to 800px. Items should reflow or scale without overlapping or overflowing.

### 10. Cell className

**What:** A layout entry can have an optional `className` (e.g., `'bg-muted rounded-lg'`) applied to the cell container. Content is centered inside.

**Why this must be proven:** react-grid-layout's item wrapper has absolute positioning and explicit dimensions. Adding an inner div with className + centering must not break the positioning or resize behavior. The className must be visually correct — background fills the cell, rounded corners follow the cell boundary.

**How to verify:** Give one item `className: 'bg-muted rounded-lg'`. It should have a muted background with rounded corners filling the entire cell. Content should be centered inside.

### 11. Content centered in cell

**What:** By default, a widget's content sits centered (both axes) within its grid cell. No extra config needed.

**Why this must be proven:** The inner wrapper div uses `flex items-center justify-center`. But content that is taller or wider than the cell should not be clipped — it should overflow or the cell should grow. Need to confirm centering works without breaking content that fills the cell (charts, tables).

**How to verify:** Place a small KPI card in a large cell. It should be centered. Place a chart that fills the cell — it should fill, not be constrained by centering.

### 12. Fill vs center — inner wrapper default behavior

**What:** Some content should FILL the cell (charts use ResponsiveContainer at 100% width/height). Some content should CENTER in the cell (a small KPI card in a large cell). The default inner wrapper behavior determines which works out of the box.

**Why this must be proven:** If the default is `flex items-center justify-center`, charts won't fill their cell — they'll render at natural size and center. If the default is `h-full w-full`, small content won't center. We need to find the right default and confirm both patterns work.

**How to verify:** Place a chart that should fill its cell AND a small KPI card in a larger cell. Both should look correct. The developer controls the behavior via `className` on the layout entry — `className: 'flex items-center justify-center'` for centering, no className (or `className: 'h-full w-full'`) for filling.

### 13. Dynamic minH after width resize

**What:** Resize an item wider. Content reflows (text unwraps, table columns spread). The minimum height changes. The item can now be made shorter because the content is shorter at the wider width.

**Why this must be proven:** If `minH` is calculated once and never updated, widening an item doesn't allow shrinking height even though the content now fits in less vertical space. The constraint must recalculate after width changes.

**How to verify:** Place a widget with wrapping text. Resize it wider — text unwraps, content gets shorter. Then resize it shorter (height). It should allow shrinking to the new, shorter content height.

### 14. Constraint API works for content clamping

**What:** react-grid-layout v2's `constrainSize` function runs before layout updates and can enforce minimum sizes based on content measurement.

**Why this must be proven:** This is the foundation of content-aware resize. The constraint API is documented but we've never used it. Need to confirm it actually fires during resize, receives the correct context (item, proposed size, container dimensions), and successfully prevents undersized cells.

**How to verify:** Add a constraint that logs every call. Resize an item. Confirm the constraint fires with correct parameters. Then add content-based minimum logic and confirm it prevents shrinking below content.

### 14. Auto-placement with compactType: null

**What:** When items have no explicit `x, y` position, they auto-place in a sensible grid pattern (row by row, left to right) even with `compactType: null`.

**Why this must be proven:** This is potentially contradictory. `compactType: null` means "don't move items." But items with no position need to be placed somewhere. react-grid-layout might pile them all at `(0,0)` and overlap. We might need our own auto-placement algorithm that runs once on first render, then freeform after.

**How to verify:** Render 6 items in a 3-column grid with no explicit positions. They should arrange in a 3×2 pattern, not overlap.

### 15. Overlap prevention with compactType: null

**What:** When dragging an item onto an occupied cell, the other item moves out of the way. No overlap.

**Why this must be proven:** With no compaction, collision resolution is different. Items can't be pushed "down" by a compactor. They might need to swap, or the drop might be rejected. Need to understand the behavior and confirm it's usable.

**How to verify:** Drag item A directly onto item B. Observe what happens. Both items should be visible with no overlap.

### 16. Ring on outer div follows resize

**What:** The hover outline (ring) is on react-grid-layout's item wrapper div. When the user resizes, the ring follows the resize in real-time because react-grid-layout updates that same div's dimensions.

**Why this must be proven:** In flexity, the ring was on a different div than the one being resized (inner wrapper vs outer), causing the ring to not follow. With react-grid-layout, if we put the ring on the outer div (which react-grid-layout controls), it should follow. But need to confirm react-grid-layout updates dimensions continuously during drag, not just on stop.

**How to verify:** Hover an item (ring appears). Drag the resize handle. The ring should grow/shrink in real-time with the resize.

### 17. Dynamic column count

**What:** Changing the column count (e.g., 4 → 3) reflows the entire grid. Items at positions that no longer exist (e.g., `x: 3` in a 3-column grid) are handled gracefully.

**Why this must be proven:** The toolbar will let developers change column count. If items go off-grid or overlap after a column change, the feature is broken.

**How to verify:** Render a 4-column grid with items. Change to 3 columns. All items should be visible, none off-screen or overlapping.

### 18. New item auto-placement in existing freeform layout

**What:** A dashboard has 5 items arranged by the user. A 6th widget is added dynamically. It auto-places in the first available empty cell without disrupting existing items.

**Why this must be proven:** Freeform layout means existing items have explicit positions. A new item with no position needs to find an empty cell. This requires scanning the grid for the first available space.

**How to verify:** Arrange 5 items with gaps. Add a 6th item with no position. It should appear in an empty cell, not overlap existing items.

### 19. Transition from auto-placed to user-edited

**What:** First render uses auto-placement (no positions in config). User drags an item. Now positions are "user-edited." On page reload, the user-edited positions persist (via localStorage or config), not the auto-placed defaults.

**Why this must be proven:** Two states coexist: "auto-placed from config" and "user-edited via interaction." The transition between them must be seamless. Once the user touches the layout, the auto-placed state is replaced by the explicit state.

**How to verify:** Render with auto-placement. Drag one item. Reload the page. The dragged item should be at its new position, not the auto-placed position.

### 20. Grid unit conversion accuracy

**What:** Content is measured in pixels. react-grid-layout uses grid units. The conversion `minH = Math.ceil(contentPixelHeight / rowHeight)` must be accurate. Rounding errors could make cells one row too small (content clipped) or one row too large (excessive slack).

**Why this must be proven:** If rowHeight=30 and content is 90px, minH should be 3 (exactly 90px). If content is 91px, minH should be 4 (120px). The rounding direction matters — always round UP to prevent clipping. Edge cases near row boundaries could cause visual bugs.

**How to verify:** Place items with content heights near row boundaries (e.g., 89px, 90px, 91px with rowHeight=30). Verify no clipping and reasonable slack.

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
      package.json
  package.json      # monorepo root
```

## POC does NOT include

- Dev toolbar (gap, snap, columns, copy, reset)
- Per-item css button / floating settings panel
- Copy/paste config workflow
- Type safety / TypeScript generics
- BannedClass validation
- localStorage persistence
- Controlled / uncontrolled mode
- Panel component
- npm package build
- Tests
- Linting

These are all proven in flexity. The POC only proves the layout engine integration.

## Success criteria

All 22 points verified. If any point fails, we document why and decide whether to:
1. Work around it (acceptable tradeoff)
2. Choose a different approach (CSS Grid, different library)
3. Accept the limitation and document it

No point should be a surprise after the POC. If we proceed to full implementation, we proceed with confidence.
