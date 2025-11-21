import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Auth from './Auth'
import './App.css'
import SetFirstName from './SetFirstName'
import CustomSelect from './CustomSelect'

type Profile = { id: string; first_name?: string | null }
type StandingRow = { id?: number; created_at?: string; loser_id: string | null; created_by: string }
type UserStats = { id: string; name: string; wins: number; losses: number }
type UserWithTier = UserStats & { tier: string; tierColor: string }

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [standing, setStanding] = useState<StandingRow[]>([])
  const [selectedLoser, setSelectedLoser] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSessionAndProfile = async () => {
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    if (data.session) {
      const userId = data.session.user.id
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('first_name').eq('id', userId).single()
      if (!profileError && profileData?.first_name) setFirstName(profileData.first_name)
    }
  }

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from('profiles').select('id, first_name')
    if (error) return console.error('fetchProfiles', error)
    setProfiles(data ?? [])
  }

  const fetchStanding = async () => {
    const { data, error } = await supabase.from('standing').select('id, created_at, loser_id, created_by').order('created_at', { ascending: false })
    if (error) return console.error('fetchStanding', error)
    setStanding(data ?? [])
  }

  useEffect(() => {
    void fetchSessionAndProfile()
    void fetchProfiles()
    void fetchStanding()

    const standingSub = supabase
      .channel('public:standing')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'standing' }, (payload) => {
        const row = (payload as any).new as StandingRow
        setStanding(prev => [row, ...prev])
      })
      .subscribe()

    const profilesSub = supabase
      .channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        void fetchProfiles()
      })
      .subscribe()

    // subscribe to auth state changes so session is reactive (persists across reloads)
    const { data: { subscription: authSub } = {} as any } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      if (sess?.user) {
        void fetchSessionAndProfile()
        void fetchProfiles()
      } else {
        setFirstName(null)
      }
    })

    return () => {
      void standingSub.unsubscribe()
      void profilesSub.unsubscribe()
      if (authSub) void authSub.unsubscribe()
    }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const userStats: UserWithTier[] = useMemo(() => {
    const map = new Map<string, UserStats>()
    profiles.forEach(p => {
      const name = p.first_name || p.id.slice(0, 6)
      map.set(p.id, { id: p.id, name, wins: 0, losses: 0 })
    })
    standing.forEach(s => {
      const winner = s.created_by
      const loser = s.loser_id
      if (!map.has(winner)) map.set(winner, { id: winner, name: winner.slice(0, 6), wins: 0, losses: 0 })
      map.get(winner)!.wins += 1
      if (loser) {
        if (!map.has(loser)) map.set(loser, { id: loser, name: loser.slice(0, 6), wins: 0, losses: 0 })
        map.get(loser)!.losses += 1
      }
    })
    const base = Array.from(map.values()).sort((a, b) => b.wins - a.wins || a.losses - b.losses)

    // strict rank-based tiers:
    // #1 -> orange, #2 -> purple, #3 -> blue, #4 -> green
    // Ranks >= 5: white only if wins > losses, otherwise gray
    const tierColors: Record<string, string> = {
      orange: '#ff8c00',
      purple: '#a855f7',
      blue: '#3b82f6',
      green: '#22c55e',
      white: '#ffffff',
      gray: '#94a3b8',
    }

    return base.map((u, idx) => {
      // If user has zero wins, always gray regardless of rank
      if (u.wins === 0) return { ...u, tier: 'gray', tierColor: tierColors['gray'] }

      let tier = 'gray'
      if (idx === 0) tier = 'orange'
      else if (idx === 1) tier = 'purple'
      else if (idx === 2) tier = 'blue'
      else if (idx === 3) tier = 'green'
      else {
        // below rank 4: white only if wins > losses
        tier = u.wins > u.losses ? 'white' : 'gray'
      }
      return { ...u, tier, tierColor: tierColors[tier] }
    })
  }, [profiles, standing])

  // compute head-to-head diff (auth wins minus entrant wins) for each opponent
  const headToHeadDiffs: Record<string, number> = useMemo(() => {
    const diffs: Record<string, number> = {}
    const authId = session?.user?.id
    if (!authId) return diffs
    for (const s of standing) {
      if (!s.loser_id) continue
      if (s.created_by === authId) {
        diffs[s.loser_id] = (diffs[s.loser_id] || 0) + 1
      } else if (s.loser_id === authId) {
        // someone beat the auth user
        diffs[s.created_by] = (diffs[s.created_by] || 0) - 1
      }
    }
    return diffs
  }, [standing, session])

  const addWin = async () => {
    setError(null)
    if (!session?.user) return setError('You must be signed in to add wins')
    if (!selectedLoser) return setError('Please select a user to record a loss for')
    if (selectedLoser === session.user.id) return setError('You cannot mark yourself as the loser')

    setLoading(true)
    try {
      const payload = { created_by: session.user.id, loser_id: selectedLoser, created_at: new Date().toISOString() }
      // insert and return the created row so we can update UI immediately
      const { data, error } = await supabase.from('standing').insert([payload]).select().single()
      if (error) {
        setError(error.message)
      } else if (data) {
        // prepend the new standing row to the local state so UI updates immediately
        setStanding(prev => [data as StandingRow, ...prev])
        setSelectedLoser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell flex flex-col items-center justify-start pt-8 pb-12 px-4 md:px-12 gap-6 retro-font">
      {!session && <Auth onAuth={() => void fetchSessionAndProfile()} />}

      {session?.user && !firstName && (
        <SetFirstName userId={session.user.id} onSet={name => setFirstName(name)} />
      )}

      <h2 className="font-bold mb-2 text-center text-white-800 mt-4">Leaderboard</h2>

      <div className="w-full max-w-2xl bg-white/5 rounded p-4 sm:p-6">
        <div className="mb-6">
          <label className="block text-sm mb-2">Select loser</label>
          <CustomSelect
            options={profiles.filter(p => p.id !== session?.user?.id).map(p => ({ value: p.id, label: p.first_name || p.id.slice(0, 6) }))}
            value={selectedLoser ?? ''}
            onChange={(v) => setSelectedLoser(v || null)}
            placeholder="choose loser"
          />
          <div className="mt-3 flex gap-3 flex-col">
            <button
              onClick={addWin}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded w-full"
            >
              {loading ? 'Adding...' : 'Add Win'}
            </button>
            {error && <div className="text-red-400">{error}</div>}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Standings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left table-auto text-sm sm:text-base">
              <thead>
                <tr className="text-sm text-gray-400">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Player</th>
                  <th className="pb-2 text-center">Wins</th>
                  <th className="pb-2 text-center">Losses</th>
                </tr>
              </thead>
              <tbody>
                {userStats.map((u, idx) => (
                  <tr key={u.id} className="border-t border-white/5">
                    <td className="py-2 text-sm">{`${idx + 1}.`}</td>
                    <td className="py-2">
                      <span className="align-middle font-semibold" style={{ color: u.tierColor }}>{u.name}</span>
                      {session?.user && session.user.id !== u.id && (() => {
                        const diff = headToHeadDiffs[u.id] ?? 0
                        const cls = diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-gray-400'
                        return <span className={`ml-2 text-sm ${cls}`}>{`(${diff > 0 ? '+' : ''}${diff})`}</span>
                      })()}
                    </td>
                    <td className="py-2 text-center">{u.wins}</td>
                    <td className="py-2 text-center">{u.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {session?.user && (
        <div className="w-full max-w-2xl flex justify-center">
          <button onClick={logout} className="bg-red-500 text-white px-3 py-2 rounded mt-4">Logout</button>
        </div>
      )}
    </div>
  )
}
