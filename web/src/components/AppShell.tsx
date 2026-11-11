import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Boxes,
  ChevronDown,
  Database,
  FileCode2,
  Fingerprint,
  Globe,
  LogOut,
  Radar,
  Server,
  Shield,
  Terminal as TerminalIcon,
  Users,
  Waypoints,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useSessionStore } from "../lib/sessionStore";
import { Workspace } from "../pages/Workspace";

const SECURITY_TOOL_PATHS = ["/port-scanner", "/dns-lookup", "/dns-propagation", "/ip-checker"];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold text-white px-1">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold shrink-0">
        L
      </span>
      <span className="truncate">Locara SSH</span>
    </Link>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors",
    isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/60",
  ].join(" ");
}

function subNavClass({ isActive }: { isActive: boolean }) {
  return [
    "flex items-center gap-2.5 pl-8 pr-2.5 py-1.5 rounded-md text-sm transition-colors",
    isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/60",
  ].join(" ");
}

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const sessionCount = useSessionStore((s) => s.order.length);
  const onSessionsRoute = location.pathname === "/sessions";
  const [toolsOpen, setToolsOpen] = useState(() => SECURITY_TOOL_PATHS.includes(location.pathname));

  return (
    <div className="flex h-screen bg-slate-950">
      <aside className="w-60 shrink-0 flex flex-col border-r border-slate-800 bg-slate-950/60 py-4 px-3 gap-4 overflow-y-auto">
        <Logo />

        <nav className="flex flex-col gap-0.5">
          <NavLink to="/" className={navClass} end>
            <Server className="h-4 w-4 shrink-0" strokeWidth={2} />
            Hosts
          </NavLink>
          <NavLink to="/kubernetes" className={navClass}>
            <Boxes className="h-4 w-4 shrink-0" strokeWidth={2} />
            Kubernetes
          </NavLink>
          <NavLink to="/databases" className={navClass}>
            <Database className="h-4 w-4 shrink-0" strokeWidth={2} />
            Databases
          </NavLink>
          <NavLink to="/editor" className={navClass}>
            <FileCode2 className="h-4 w-4 shrink-0" strokeWidth={2} />
            Editor
          </NavLink>
          <NavLink to="/teams" className={navClass}>
            <Users className="h-4 w-4 shrink-0" strokeWidth={2} />
            Teams
          </NavLink>
          {sessionCount > 0 && (
            <NavLink to="/sessions" className={navClass}>
              <TerminalIcon className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="flex-1">Sessions</span>
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-brand-600 text-white text-[11px]">
                {sessionCount}
              </span>
            </NavLink>
          )}

          <button
            onClick={() => setToolsOpen((o) => !o)}
            className="flex items-center gap-2.5 px-2.5 py-2 mt-2 rounded-md text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <Shield className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="flex-1 text-left">Security Tools</span>
            <ChevronDown
              className={["h-3.5 w-3.5 shrink-0 transition-transform", toolsOpen ? "" : "-rotate-90"].join(" ")}
              strokeWidth={2}
            />
          </button>
          {toolsOpen && (
            <div className="flex flex-col gap-0.5">
              <NavLink to="/port-scanner" className={subNavClass}>
                <Radar className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                Port Scanner
              </NavLink>
              <NavLink to="/dns-lookup" className={subNavClass}>
                <Globe className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                DNS Lookup
              </NavLink>
              <NavLink to="/dns-propagation" className={subNavClass}>
                <Waypoints className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                DNS Propagation
              </NavLink>
              <NavLink to="/ip-checker" className={subNavClass}>
                <Fingerprint className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                IP Checker
              </NavLink>
            </div>
          )}
        </nav>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
          <span className="text-sm text-slate-400 truncate">{user?.name}</span>
          <button
            onClick={() => void logout()}
            title="Log out"
            className="shrink-0 p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Workspace stays mounted at all times (just hidden off-route) so open SSH/Kubernetes
            sessions survive navigating to other pages; this route only claims the URL. */}
        <div className={["h-full", onSessionsRoute ? "flex flex-col p-6" : "hidden"].join(" ")}>
          <Workspace />
        </div>
        <div className={["h-full overflow-y-auto p-6", onSessionsRoute ? "hidden" : ""].join(" ")}>
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
