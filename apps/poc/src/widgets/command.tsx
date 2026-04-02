'use client'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@a/ui/command'
import { useState } from 'react'
const frameworks = [
    { label: 'Next.js', value: 'next' },
    { label: 'Remix', value: 'remix' },
    { label: 'Astro', value: 'astro' },
    { label: 'Nuxt', value: 'nuxt' },
    { label: 'SvelteKit', value: 'svelte' },
    { label: 'Gatsby', value: 'gatsby' },
    { label: 'Vite', value: 'vite' }
  ],
  CommandWidget = () => {
    const [selected, setSelected] = useState('')
    return (
      <>
        <span className='text-sm font-medium'>Command Palette</span>
        <Command className='rounded-lg border'>
          <CommandInput placeholder='Search framework...' />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading='Frameworks'>
              {frameworks.map(f => (
                <CommandItem key={f.value} onSelect={() => setSelected(f.value)} value={f.value}>
                  <span>{f.label}</span>
                  {selected === f.value && <span className='ml-auto text-xs text-primary'>selected</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </>
    )
  }
export default CommandWidget
