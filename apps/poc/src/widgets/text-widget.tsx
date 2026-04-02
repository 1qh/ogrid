'use client'
const TextWidget = () => (
  <>
    <span className='text-sm font-medium'>Wrapping Text</span>
    <p className='text-sm text-muted-foreground'>
      This paragraph demonstrates dynamic minimum height after width resize. When the cell is made wider, the text
      unwraps and the content gets shorter, allowing the cell to be resized shorter. When the cell is narrower, the text
      wraps more and the minimum height increases. The grid recalculates the content minimum on every width change.
    </p>
    <p className='text-sm text-muted-foreground'>
      A second paragraph adds more content to make the height difference more noticeable when toggling between narrow and
      wide cell widths. The constraint API reads the fresh measurement on every resize interaction.
    </p>
  </>
)
export default TextWidget
