import { Link } from "react-router-dom";
import { Terminal as TerminalIcon, Boxes, FileCode2, ShieldCheck, Users, Zap } from "lucide-react";

function MockTerminal() {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#020617] shadow-2xl shadow-black/40 overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800 bg-slate-900/60">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
        <span className="ml-3 text-xs text-slate-500 font-mono">prod-api-01 — ssh</span>
      </div>
      <div className="p-5 font-mono text-[13px] leading-relaxed">
        <div className="overflow-hidden whitespace-nowrap type-line-1">
          <span className="text-emerald-400">root@prod-api-01</span>
          <span className="text-slate-500">:~$ </span>
          <span className="text-slate-200">kubectl get pods -n payments</span>
        </div>
        <div className="mt-1.5 text-slate-400">
          <div>NAME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;READY&nbsp;&nbsp;&nbsp;STATUS&nbsp;&nbsp;&nbsp;&nbsp;RESTARTS</div>
          <div>payments-api-7f9c&nbsp;&nbsp;&nbsp;1/1&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-emerald-400">Running</span>&nbsp;&nbsp;&nbsp;0</div>
          <div>payments-worker-2a1&nbsp;&nbsp;1/1&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-emerald-400">Running</span>&nbsp;&nbsp;&nbsp;0</div>
        </div>
        <div className="mt-3 overflow-hidden whitespace-nowrap type-line-2">
          <span className="text-emerald-400">root@prod-api-01</span>
          <span className="text-slate-500">:~$ </span>
          <span className="text-slate-200">code worker.ts</span>
        </div>
        <div className="mt-1.5 text-slate-500">Opening in editor…</div>
        <div className="mt-3 overflow-hidden whitespace-nowrap type-line-3">
          <span className="text-emerald-400">root@prod-api-01</span>
          <span className="text-slate-500">:~$ </span>
          <span className="text-slate-200">_</span>
          <span className="inline-block w-[7px] h-[14px] -mb-[2px] bg-slate-300 caret-blink" />
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: TerminalIcon,
    title: "Real SSH terminals",
    description: "Full xterm-powered terminals to any server, with saved credentials, tags, and split-pane layouts.",
  },
  {
    icon: Boxes,
    title: "Kubernetes, natively",
    description: "Drop in a kubeconfig, browse namespaces and pods, and exec straight into a container shell.",
  },
  {
    icon: FileCode2,
    title: "Edit files in-browser",
    description: "A VS Code-style editor for any file on a server or pod — syntax highlighting, save straight back.",
  },
  {
    icon: ShieldCheck,
    title: "Credentials stay encrypted",
    description: "Passwords and keys are vaulted server-side, never shipped to the browser in plaintext.",
  },
  {
    icon: Users,
    title: "Built for teams",
    description: "Share hosts and clusters with a team, with role-based access instead of passing around secrets.",
  },
  {
    icon: Zap,
    title: "Zero local setup",
    description: "No SSH config, no kubectl install, no VPN client. Just a browser tab and your credentials.",
  },
];

export function Home() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid bg-radial-fade pointer-events-none" />
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 h-[480px] w-[800px] rounded-full bg-brand-600/20 blur-[120px] pointer-events-none"
          aria-hidden
        />

        <header className="relative border-b border-slate-800/60">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-lg text-white">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold">
                L
              </span>
              Locara SSH
            </div>
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-sm text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800/60 transition-colors">
                Log in
              </Link>
              <Link
                to="/signup"
                className="text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-md transition-colors shadow-lg shadow-brand-900/40"
              >
                Sign up
              </Link>
            </div>
          </div>
        </header>

        <main className="relative mx-auto max-w-6xl px-4 pt-20 pb-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded-full px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Built for infrastructure engineers
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl font-semibold text-white tracking-tight">
              Every server, cluster, and file —<br className="hidden sm:block" /> one browser tab away.
            </h1>
            <p className="mt-5 text-lg text-slate-400 max-w-xl mx-auto">
              Locara SSH connects you to SSH servers and Kubernetes clusters with a real terminal,
              and lets you edit remote files like you're in your own IDE.
            </p>
            <div className="flex items-center justify-center gap-3 pt-7">
              <Link
                to="/signup"
                className="text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-brand-900/40"
              >
                Get started free
              </Link>
              <Link
                to="/login"
                className="text-sm text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white px-5 py-2.5 rounded-lg transition-colors"
              >
                Log in
              </Link>
            </div>
          </div>

          <div className="mt-16 max-w-2xl mx-auto">
            <MockTerminal />
          </div>
        </main>
      </div>

      <section className="border-t border-slate-800/60 bg-slate-900/20">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl font-semibold text-white">Everything you reach for during an incident</h2>
            <p className="mt-2 text-slate-400">No context switching between five different tools and a VPN.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:border-slate-700 hover:bg-slate-900/70 transition-colors"
              >
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
                  <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800/60">
        <div className="mx-auto max-w-6xl px-4 py-8 flex items-center justify-between text-sm text-slate-500">
          <span>© {new Date().getFullYear()} Locara SSH</span>
          <div className="flex items-center gap-2 text-slate-600">
            <TerminalIcon className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">ssh.locara.cloud</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
