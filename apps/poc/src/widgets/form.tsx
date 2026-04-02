/** biome-ignore-all lint/correctness/useUniqueElementIds: demo static IDs */
'use client'
import { Button } from '@a/ui/button'
import { Input } from '@a/ui/input'
import { Label } from '@a/ui/label'
import { Switch } from '@a/ui/switch'
const FormWidget = () => (
  <>
    <span className='text-sm font-medium'>Settings</span>
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='name'>Display Name</Label>
        <Input id='name' placeholder='Enter your name' />
      </div>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='email'>Email</Label>
        <Input id='email' placeholder='you@example.com' type='email' />
      </div>
      <div className='flex items-center justify-between'>
        <Label htmlFor='notifications'>Notifications</Label>
        <Switch id='notifications' />
      </div>
      <div className='flex items-center justify-between'>
        <Label htmlFor='darkMode'>Dark Mode</Label>
        <Switch id='darkMode' />
      </div>
      <Button className='self-end'>Save</Button>
    </div>
  </>
)
export default FormWidget
