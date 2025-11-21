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
  // `exists` is null while we check the backend to avoid flashing the input briefly
  const [exists, setExists] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Allow: digits, ASCII letters, Latin-1 supplement and Latin Extended-A (covers åäö and other western diacritics), and space
  const NAME_REGEX = /^[0-9A-Za-z\u00C0-\u017F ]+$/u

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', userId)
          .single()
        setExists(!!data?.first_name)
      } catch (e) {
        // on error, assume no name so user can set it; avoid leaving component in loading forever
        setExists(false)
      }
    }
    void fetchProfile()
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

  // While we don't know if a name exists, avoid rendering the form to prevent a flash.
  if (exists === null) return null
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
          {loading ? (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          ) : (
            'Save'
          )}
        </button>
      </div>
      {/* validation / backend error message */}
      {error && (
        <div className="w-full text-sm text-red-600 mt-2">{error}</div>
      )}
    </div>
  )
}
