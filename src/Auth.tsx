import { useState } from 'react'
import { supabase } from './lib/supabaseClient'

export default function Auth({ onAuth }: { onAuth: (user: any) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSignUp = async () => {
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return setError(error.message)
    setSuccess("Sign-up successful! Please check your email to confirm your account.");
  }

  const handleLogin = async () => {
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return setError(error.message)
    onAuth(data.user)
  }

  return (
    <div className="w-full md:w-80 p-4 border rounded mt-4 retro-font">
      <input
        className="border p-2 mb-2 mx-1 w-full"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
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
          onClick={handleLogin}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Login
        </button>
        <button
          onClick={handleSignUp}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Sign Up
        </button>
      </div>
    </div>
  )
}
