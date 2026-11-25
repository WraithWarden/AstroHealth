import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';

const DEMO = {
  crew: { email: 'crew.demo@astrohealth.app', password: 'AstroDemo#2026' },
  ground: { email: 'ground.demo@astrohealth.app', password: 'AstroDemo#2026' },
};

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action) {
    setError('');
    setNotice('');
    setBusy(true);
    const { data, error: err } = await action();
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    // Sign-up with email confirmation ON returns a user but no session
    if (data?.user && !data?.session) {
      setNotice('Account created. Check your email to confirm it, then log in.');
    }
  }

  function submit(e) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (mode === 'login') run(() => signIn(email.trim(), password));
    else run(() => signUp(email.trim(), password, name.trim() || undefined));
  }

  const input =
    'w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-sky-400';

  return (
    <div className="min-h-screen grid place-items-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
        <h1 className="text-xl font-semibold text-slate-100">AstroHealth Monitor</h1>
        <p className="mt-1 text-sm text-slate-400">
          {mode === 'login' ? 'Log in to continue' : 'Create a crew account'}
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === 'signup' && (
            <input className={input} placeholder="Display name" value={name}
              onChange={(e) => setName(e.target.value)} />
          )}
          <input className={input} type="email" placeholder="Email" required value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <input className={input} type="password" placeholder="Password (min 8 characters)" required
            value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
          {notice && <p className="text-sm text-emerald-400">{notice}</p>}
          <button disabled={busy} type="submit"
            className="w-full rounded-lg bg-sky-500 py-2 font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60">
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <button type="button" className="mt-3 text-sm text-sky-400 hover:underline"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setNotice(''); }}>
          {mode === 'login' ? 'No account? Sign up' : 'Have an account? Log in'}
        </button>

        <div className="mt-5 border-t border-slate-700 pt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Quick demo</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy}
              onClick={() => run(() => signIn(DEMO.crew.email, DEMO.crew.password))}
              className="rounded-lg border border-slate-600 py-2 text-sm text-slate-200 hover:bg-slate-800">
              Try as Crew
            </button>
            <button type="button" disabled={busy}
              onClick={() => run(() => signIn(DEMO.ground.email, DEMO.ground.password))}
              className="rounded-lg border border-slate-600 py-2 text-sm text-slate-200 hover:bg-slate-800">
              Try as Ground Control
            </button>
          </div>
        </div>

        <p className="mt-5 text-xs text-slate-500">
          Decision support, not a medical device. Demo data is simulated.
        </p>
      </div>
    </div>
  );
}