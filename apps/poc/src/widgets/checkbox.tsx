'use client'
import { Checkbox } from '@a/ui/checkbox'
import { Label } from '@a/ui/label'
const tasks = [
    { done: true, id: 'design', label: 'Design system review' },
    { done: true, id: 'api', label: 'API integration' },
    { done: false, id: 'tests', label: 'Write unit tests' },
    { done: false, id: 'docs', label: 'Update documentation' },
    { done: false, id: 'deploy', label: 'Deploy to production' }
  ],
  CheckboxWidget = () => (
    <>
      <span className='text-sm font-medium'>Tasks</span>
      <div className='flex flex-col gap-3'>
        {tasks.map(t => (
          <div className='flex items-center gap-2' key={t.id}>
            <Checkbox defaultChecked={t.done} id={t.id} />
            <Label className='text-sm' htmlFor={t.id}>
              {t.label}
            </Label>
          </div>
        ))}
      </div>
    </>
  )
export default CheckboxWidget
