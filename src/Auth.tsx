import { useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { showToast } from './toast'

export default function Auth({ onAuth }: { onAuth: (user: any) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async () => {
    setError('')
    if (!email.trim() || !password) return setError('Please enter both email and password')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) return setError(error.message)
      setSuccess("Sign-up successful! Please check your email to confirm your account.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setError('')
    if (!email.trim() || !password) return setError('Please enter both email and password')
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return setError(error.message)
      onAuth(data.user)
      showToast('Signed in successfully', 'success')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleLogin()
  }

  return (
    <form onSubmit={handleSubmit} className="w-full md:w-80 p-4 border rounded mt-4 retro-font">
      <input
        name="email"
        autoComplete="email"
        className="border p-2 mb-2 mx-1 w-full"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        name="password"
        autoComplete="current-password"
        className="border p-2  mb-2 mx-1 w-full"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}
      <div className="flex gap-2 mt-2 justify-center">
        <button
          type="submit"
          disabled={loading || !email.trim() || !password}
          className={`bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
        >
          {loading && (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          )}
          <span>Login</span>
        </button>
        <button
          type="button"
          onClick={handleSignUp}
          disabled={loading || !email.trim() || !password}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Sign Up
        </button>
      </div>
    </form>
  )
}
