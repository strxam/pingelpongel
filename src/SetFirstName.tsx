import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'

export default function SetFirstName({
  userId,
  onSet,
}: {
  userId: string
  onSet: (firstName: string) => void
}) {
  const [firstName, setFirstName] = useState('')
  const [loading, setLoading] = useState(false)
  const [exists, setExists] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Allow: digits, ASCII letters, Latin-1 supplement and Latin Extended-A (covers åäö and other western diacritics), and space
  const NAME_REGEX = /^[0-9A-Za-z\u00C0-\u017F ]+$/u

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', userId)
        .single()
      if (data?.first_name) setExists(true)
    }
    fetchProfile()
  }, [userId])

  const handleSave = async () => {
    const trimmed = firstName.trim()
    // Basic client-side validation
    if (!trimmed) {
      setError('Please enter your first name')
      return
    }
    if (!NAME_REGEX.test(trimmed)) {
      setError('Name contains invalid characters. Allowed: letters, digits and space')
      return
    }

    setLoading(true)
    setError(null)

    // Get current session to verify auth
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user?.id !== userId) {
      setError('Authentication mismatch. Please sign out and sign in again.')
      setLoading(false)
      return
    }

    try {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          first_name: trimmed,
        }, {
          onConflict: 'id'
        })

      if (upsertError) {
        // Surface backend errors to the user (RLS/constraint failures will be visible here)
        console.error('Error details:', upsertError)
        setError(upsertError.message || 'Failed to save name')
        setLoading(false)
        return
      }

      onSet(trimmed)
    } finally {
      setLoading(false)
    }
  }

  if (exists) return null

  return (
    <div className="m-4 flex gap-2 flex-col items-center retro-font">
      <div className="flex flex-row gap 2">
        <input
          className="border p-2 w-full"
          value={firstName}
          onChange={e => {
            const v = e.target.value
            setFirstName(v)
            // live-clear error when user fixes input
            if (error) {
              const trimmed = v.trim()
              if (trimmed && NAME_REGEX.test(trimmed)) setError(null)
            }
          }}
          placeholder="Enter your first name"
        />
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Save
        </button>
      </div>
      {/* validation / backend error message */}
      {error && (
        <div className="w-full text-sm text-red-600 mt-2">{error}</div>
      )}
    </div>
  )
}
