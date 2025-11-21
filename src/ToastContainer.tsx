import { useEffect, useState } from 'react'

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' }

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    let nextId = 1
    function onToast(e: Event) {
      const detail = (e as CustomEvent).detail as { message: string; type: Toast['type'] }
      const id = nextId++
      setToasts(prev => [...prev, { id, message: detail.message, type: detail.type }])
      // auto-dismiss
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 3000)
    }
    window.addEventListener('app:toast', onToast as EventListener)
    return () => window.removeEventListener('app:toast', onToast as EventListener)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ marginBottom: 8, minWidth: 200 }}>
          <div className={`px-3 py-2 rounded shadow-md ${t.type === 'success' ? 'bg-green-600 text-white' : t.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`}>
            {t.message}
          </div>
        </div>
      ))}
    </div>
  )
}
