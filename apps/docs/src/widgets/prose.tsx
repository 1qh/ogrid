'use client'
const Prose = () => (
  <>
    <span className='text-sm font-medium'>About flexity</span>
    <div className='flex flex-col gap-3 text-sm text-muted-foreground'>
      <p>
        flexity is a pixel-level resizable dashboard grid for React. It provides zero-config defaults that work out of the
        box, with every single thing overridable when you need control.
      </p>
      <p>
        The library enforces minimal DOM rules, blocks banned Tailwind classes at compile time, and validates widget
        structure at runtime. One source of truth for all styling.
      </p>
      <p>
        Built with flexbox for native flow layout, @dnd-kit for drag reorder, re-resizable for width handles, and
        tailwind-merge for class merging. Tailwind v4 required.
      </p>
    </div>
  </>
)
export default Prose
