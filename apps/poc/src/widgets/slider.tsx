'use client'
import { Label } from '@a/ui/label'
import { Slider } from '@a/ui/slider'
const VOLUME_DEFAULT = [50] as const,
  BRIGHTNESS_DEFAULT = [75] as const,
  CONTRAST_DEFAULT = [30] as const,
  SliderWidget = () => (
    <>
      <span className='text-sm font-medium'>Controls</span>
      <div className='flex flex-col gap-6'>
        <div className='flex flex-col gap-3'>
          <Label>Volume</Label>
          <Slider defaultValue={VOLUME_DEFAULT} max={100} step={1} />
        </div>
        <div className='flex flex-col gap-3'>
          <Label>Brightness</Label>
          <Slider defaultValue={BRIGHTNESS_DEFAULT} max={100} step={1} />
        </div>
        <div className='flex flex-col gap-3'>
          <Label>Contrast</Label>
          <Slider defaultValue={CONTRAST_DEFAULT} max={100} step={1} />
        </div>
      </div>
    </>
  )
export default SliderWidget
