## Dependencies & Scripts

- All deps use `latest` tag in package.json — no pinned versions during development
- `bun clean` — removes node_modules, lockfile, dist, .cache, .next, .turbo — like a fresh clone
- `bun install` after clean always resolves latest upstream
- `q` wrapper for all scripts — silent on success, verbose on failure
- Git pre-commit hook runs `bun clean && bun i && bun fix` — fresh install from latest upstream + full lint on every commit. Commit is rejected if any step fails. Never use `--no-verify`.

---

## Code Style

- Only `bun` — yarn/npm/npx/pnpm forbidden
- `bun fix` must always pass before committing
- Only arrow functions — no `function` declarations
- All exports at end of file
- `.tsx` with single component → `export default`; utilities → named exports
- `for` loops instead of `reduce()` or `forEach()`
- Exhaustive `switch` with `default: never`
- `catch (error)` enforced by oxlint — name state vars descriptively to avoid shadow (`chatError`, `formError`)
- Short map callback names: `t`, `m`, `i`
- Max 3 positional args — use destructured object for 4+
- Co-locate components with their page; only move to shared when reused
- Explicit imports from exact file paths — no barrel `index.ts` files (exception: npm package entry point)
- Prefer existing libraries over new dependencies
- Scripts: silent on success, verbose on failure. Prefer `q ...` for noisy commands.

### Must NOT do

- NEVER write comments (lint ignores allowed)
- NEVER use `!` (non-null assertion), `any`, `as any`, `@ts-ignore`, `@ts-expect-error`
- NEVER duplicate types — single source of truth
- NEVER disable lint rules globally/per-directory — fix the code
- NEVER ignore written source code from linters — only auto-generated code (`_generated/`, `generated/`)
- NEVER reduce lintmax strictness — if upstream removes rules, find replacements
- NEVER use `git clean` — it deletes `.env` and uncommitted files. Use explicit `rm -rf`.

---

## Type Safety & Single Source of Truth

Every piece of data flows through exactly one definition:

- **Shared constants** → define once, import everywhere. If a value appears in 2+ files, extract it.

When adding new features, check existing utilities FIRST before writing inline logic.

---

## React 19 + Next.js 16

- **Server components by default** — layout.tsx, loading.tsx, error.tsx are server components
- **`'use client'` only when needed** — components with hooks must be client components
- **Per-page metadata** — each route has a `layout.tsx` server component that exports `Metadata`

---

## shadcn — Native Look, No Overrides

Use shadcn components as-is. No custom color overrides, no inline style hacks.

### Colors

Use semantic Tailwind classes ONLY. Never hardcode hex colors in className or style.

- `text-foreground` / `text-muted-foreground` / `text-destructive` — NEVER `text-red-500`, `text-green-500`
- `bg-primary` / `bg-muted` / `bg-destructive` — NEVER `bg-blue-500`, `bg-red-500`
- `text-primary` for interactive links — NEVER `text-blue-500`

### Conditional classNames

ALWAYS use `cn()` for conditional classes:

```tsx
className={cn('base-classes', condition && 'conditional-class')}
className={cn('base-classes', variant === 'a' ? 'class-a' : 'class-b')}
```

NEVER use template literals for conditional classNames.

---

## Code Consolidation Checklist

Before writing any new code, verify:

1. **Does this function already exist?** Check existing utilities first
2. **Is this constant defined elsewhere?** Check shared files
3. **Am I adding a wrapper div?** Check if parent `gap-*`, `space-*` can handle it
4. **Am I adding inline styles?** Only allowed for truly dynamic values. NEVER for colors or static properties.
5. **Am I copy-pasting from another file?** Extract to a shared utility/component

---

## Minimal DOM (React + Tailwind)

Same UI, fewest DOM nodes. Every element must earn its place. If you can delete it and nothing breaks → it shouldn't exist.

**A node is allowed only if it provides:**

- **Semantics/a11y** — correct elements (`ul/li`, `button`, `label`, `form`, `nav`), ARIA patterns, focus behavior
- **Layout constraint** — needs its own containing block / positioning / clipping / scroll / stacking context
- **Behavior** — measurement refs, observers, portals, event boundary
- **Component API** — can't pass props/classes to the real root

**Before adding wrappers:**

- Spacing → parent `gap-*` (flex/grid) or `space-x/y-*`
- Separators → parent `divide-y / divide-x`
- Alignment → `flex`/`grid` on existing parent
- Visual (padding/bg/border/shadow/radius) → on the element that owns the box
- JSX grouping → `<>...</>` (Fragment), not `<div>`

**No IIFEs in JSX** — extract to a named component instead.

**Review checklist:** Can I delete this node? → delete. Can `gap/space/divide` replace it? → do it. Can I pass `className`? → do it. Can `[&>...]:` remove repetition? → do it.

---

## Commit style

- Commit and push incrementally — small frequent commits
- No AI tooling in commits
