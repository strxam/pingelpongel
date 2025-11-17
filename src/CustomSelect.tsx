import { useEffect, useRef, useState } from 'react'

type Option = { value: string; label: string }

type Props = {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function CustomSelect({ options, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative w-full text-left">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(s => !s)}
        className="w-full p-2 rounded bg-white/10 text-white flex items-center justify-between border border-white/20"
      >
        <span className="truncate">{selected?.label ?? placeholder ?? 'Select'}</span>
        <svg className={`ml-3 h-4 w-4 transition-transform ${open ? 'transform rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.2 8.27a.75.75 0 01.03-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 mt-2 w-full max-h-60 overflow-auto rounded bg-[rgba(8,20,38,0.95)] border border-white/10 shadow-lg"
        >
          <li
            key="__empty__"
            onClick={() => { onChange(''); setOpen(false) }}
            className="px-3 py-2 cursor-pointer text-sm text-gray-300 hover:bg-white/5"
          >
            {placeholder ?? 'choose loser'}
          </li>
          {options.map(o => (
            <li
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className="px-3 py-2 cursor-pointer text-sm text-white hover:bg-white/5"
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
