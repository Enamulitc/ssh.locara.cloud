import { Link } from "react-router-dom";
import {
  Activity,
  Boxes,
  Database,
  FileCode2,
  ShieldCheck,
  Terminal as TerminalIcon,
  Users,
  Zap,
} from "lucide-react";
import dashboardPreview from "../assets/dashboard-preview.png";

const HUB = { x: 400, y: 300 };

interface DiagramNodeData {
  key: string;
  x: number;
  y: number;
  labelY: number;
  icon: typeof TerminalIcon;
  title: string;
  description: string;
}

const DIAGRAM_NODES: DiagramNodeData[] = [
  {
    key: "ssh",
    x: 400,
    y: 110,
    labelY: 5,
    icon: TerminalIcon,
    title: "SSH Servers",
    description: "Full terminals to any server, saved credentials, split panes.",
  },
  {
    key: "kube",
    x: 565,
    y: 205,
    labelY: 100,
    icon: Boxes,
    title: "Kubernetes",
    description: "Browse namespaces and pods, shell into any container.",
  },
  {
    key: "db",
    x: 565,
    y: 395,
    labelY: 410,
    icon: Database,
    title: "Databases",
    description: "Query MySQL & Postgres, tunnel through an SSH host.",
  },
  {
    key: "editor",
    x: 400,
    y: 490,
    labelY: 505,
    icon: FileCode2,
    title: "Code Editor",
    description: "Edit remote files like you're in your own IDE.",
  },
  {
    key: "security",
    x: 235,
    y: 395,
    labelY: 410,
    icon: ShieldCheck,
    title: "Security Tools",
    description: "Port scans, DNS lookups, propagation checks, WHOIS.",
  },
  {
    key: "monitor",
    x: 235,
    y: 205,
    labelY: 100,
    icon: Activity,
    title: "Live Monitoring",
    description: "CPU, RAM, disk, and network at a glance.",
  },
];

function DiagramNode({ node }: { node: DiagramNodeData }) {
  const Icon = node.icon;
  return (
    <g>
      <line
        x1={HUB.x}
        y1={HUB.y}
        x2={node.x}
        y2={node.y}
        className="diagram-line stroke-brand-500/50"
        strokeWidth={2}
        fill="none"
      />
      <circle cx={node.x} cy={node.y} r={5} className="diagram-pulse fill-brand-400" />
      <foreignObject x={node.x - 100} y={node.labelY} width={200} height={95}>
        <div className="text-center">
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-500/10 border border-brand-500/20 text-brand-400 mb-1">
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
          <div className="text-sm font-semibold text-white">{node.title}</div>
          <div className="mt-0.5 text-xs text-slate-400 leading-snug">{node.description}</div>
        </div>
      </foreignObject>
    </g>
  );
}

function FeatureDiagram() {
  return (
    <svg viewBox="0 0 800 615" className="w-full h-auto max-w-3xl mx-auto block">
      {DIAGRAM_NODES.map((node) => (
        <DiagramNode key={node.key} node={node} />
      ))}
      <circle cx={HUB.x} cy={HUB.y} r={48} className="fill-none stroke-brand-500/40" strokeWidth={2} />
      <foreignObject x={HUB.x - 44} y={HUB.y - 44} width={88} height={88}>
        <Link
          to="/login"
          className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-sm font-semibold shadow-lg shadow-brand-900/50 hover:brightness-110 transition-all"
        >
          Log in
        </Link>
      </foreignObject>
    </svg>
  );
}

const TRUST_BADGES = [
  { icon: ShieldCheck, text: "Credentials vaulted server-side, never sent to the browser" },
  { icon: Users, text: "Share hosts & clusters with a team, role-based access" },
  { icon: Zap, text: "No SSH config, kubectl, or VPN client — just a browser tab" },
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

        <main className="relative mx-auto max-w-6xl px-4 pt-12 pb-24">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded-full px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Built for platform, DevOps, and cloud engineers
            </div>
            <h1 className="mt-4 text-lg font-semibold text-white tracking-tight">
              Every server, cluster, and file — one browser tab away.
            </h1>
            <p className="mt-3 text-lg text-slate-400 max-w-xl mx-auto">
              Locara SSH connects you to SSH servers, Kubernetes clusters, and databases with a real
              terminal, lets you edit remote files like your own IDE, and gives you the network
              diagnostics to investigate when something's wrong.
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 py-4">
            <FeatureDiagram />
          </div>
        </main>
      </div>

      <section className="border-t border-slate-800/60 bg-slate-900/20">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl font-semibold text-white">No mockups — this is the real thing</h2>
            <p className="mt-2 text-slate-400">What you see after you log in, with your own hosts and credentials.</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#020617] shadow-2xl shadow-black/40 overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800 bg-slate-900/60">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-xs text-slate-500 font-mono">ssh.locara.cloud</span>
            </div>
            <img src={dashboardPreview} alt="Locara SSH dashboard showing a list of connected hosts" className="w-full h-auto block" />
          </div>

          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            {TRUST_BADGES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                <Icon className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
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
