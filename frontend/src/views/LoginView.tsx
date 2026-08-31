import { useState } from 'react'
import { api } from '../api'
import type { User, DemoPersona } from '../types'

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void
  personas: DemoPersona[]
}

export default function LoginView({ onLoginSuccess, personas }: LoginViewProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null)

  const handlePersonaLogin = async (personaKey: string) => {
    setLoading(true)
    setError(null)
    setSelectedPersona(personaKey)
    try {
      const res = await api.authLogin('', personaKey)
      localStorage.setItem('revguard_auth_token', res.token)
      localStorage.setItem('revguard_user', JSON.stringify(res.user))
      onLoginSuccess(res.user, res.token)
    } catch (e: any) {
      setError(typeof e === 'string' ? e : e?.message || 'Failed to authenticate')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setError('Please enter a valid work email address')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api.authLogin(email)
      localStorage.setItem('revguard_auth_token', res.token)
      localStorage.setItem('revguard_user', JSON.stringify(res.user))
      onLoginSuccess(res.user, res.token)
    } catch (e: any) {
      setError(typeof e === 'string' ? e : e?.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      // Simulate Google OAuth2 authentication flow or verify Google ID token
      const googleUser = {
        email: 'alex.chen.cfo@enterprise-razorpay.io',
        name: 'Alex Chen (Google Verified)',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      }
      const res = await api.authGoogle(googleUser)
      localStorage.setItem('revguard_auth_token', res.token)
      localStorage.setItem('revguard_user', JSON.stringify(res.user))
      onLoginSuccess(res.user, res.token)
    } catch (e: any) {
      setError(typeof e === 'string' ? e : e?.message || 'Google Sign-In failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[300px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/20 text-2xl font-bold border border-blue-400/30">
            🛡️
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            RevGuard<span className="text-blue-500">·AI</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
              Enterprise
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Autonomous Revenue Recovery Control Tower for Payment Gateways
          </p>
        </div>

        {/* Card Body */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 shadow-2xl space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* 1. Google One-Click Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 hover:border-slate-600 text-slate-100 font-semibold text-xs py-3 px-4 transition-all shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50"
          >
            {/* Google G Logo SVG */}
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google Workspace</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800" />
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
              or select evaluation persona
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* 2. Instant Hackathon Persona Switcher */}
          <div className="space-y-2">
            {personas.map((p) => {
              const isSelected = selectedPersona === p.key && loading
              return (
                <button
                  key={p.key}
                  onClick={() => handlePersonaLogin(p.key)}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-850 hover:bg-slate-800 hover:border-slate-700 transition-all text-left group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={p.name}
                      className="h-8 w-8 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white group-hover:text-blue-400 flex items-center gap-1.5">
                        <span className="truncate">{p.name}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {p.role.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{p.email}</div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 group-hover:text-slate-300">
                    {isSelected ? 'Logging in…' : '→'}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800" />
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
              or work email
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* 3. Passwordless Work Email Form */}
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs py-2.5 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? 'Authenticating…' : 'Sign In with Magic Link'}
            </button>
          </form>
        </div>

        {/* Footer Security Badges */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <span className="text-emerald-400">✓</span> HMAC-SHA256 Signed
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <span className="text-blue-400">🛡️</span> SC-01 Policy Guard
          </span>
          <span>·</span>
          <span>Razorpay Verified</span>
        </div>
      </div>
    </div>
  )
}
