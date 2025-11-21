export type ToastType = 'success' | 'error' | 'info'

export function showToast(message: string, type: ToastType = 'info') {
  try {
    const ev = new CustomEvent('app:toast', { detail: { message, type } })
    window.dispatchEvent(ev)
  } catch (e) {
    // fallback: no-op
  }
}

export type ToastEventDetail = { message: string; type: ToastType }
