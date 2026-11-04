import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useSessionStore } from "../lib/sessionStore";
import { Workspace } from "../pages/Workspace";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold text-lg text-white">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold">
        L
      </span>
      Locara SSH
    </Link>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
    isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/60",
  ].join(" ");
}

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const sessionCount = useSessionStore((s) => s.order.length);
  const onSessionsRoute = location.pathname === "/sessions";

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="flex items-center gap-1">
              <NavLink to="/" className={navClass} end>
                Hosts
              </NavLink>
              <NavLink to="/teams" className={navClass}>
                Teams
              </NavLink>
              {sessionCount > 0 && (
                <NavLink to="/sessions" className={navClass}>
                  Sessions
                  <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-brand-600 text-white text-[11px]">
                    {sessionCount}
                  </span>
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{user?.name}</span>
            <button
              onClick={() => void logout()}
              className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800/60 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-6">
        {/* Workspace stays mounted at all times (just hidden off-route) so open SSH/SFTP
            sessions keep running in the background while you navigate elsewhere. */}
        <div className={onSessionsRoute ? "" : "hidden"}>
          <Workspace />
        </div>
        <div className={onSessionsRoute ? "hidden" : ""}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
