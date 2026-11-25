import { useAuth } from '../auth/AuthProvider.jsx';

export default function UserMenu() {
  const { profile, user, signOut } = useAuth();
  return (
    <div className="fixed bottom-3 left-3 z-50 flex items-center gap-2 rounded-full border border-slate-600 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200">
      <span>{profile?.display_name || user?.email}</span>
      <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-sky-300">{profile?.role ?? '…'}</span>
      <button onClick={signOut} className="text-slate-400 hover:text-white">Log out</button>
    </div>
  );
}