import { ArrowDown, ArrowUp, Cpu, HardDrive, MemoryStick, Monitor, User } from "lucide-react";

export interface HostStats {
  memTotal: number;
  memUsed: number;
  memFree: number;
  cpuPercent: number;
  cpuCores: number;
  diskTotal: number;
  diskUsed: number;
  diskFree: number;
  netRxBytesPerSec: number;
  netTxBytesPerSec: number;
  os: string;
  user: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

function formatRate(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

function Stat({
  icon: Icon,
  label,
  title,
}: {
  icon: typeof Cpu;
  label: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-slate-400" title={title}>
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}

export function HostStatsBar({ stats }: { stats: HostStats }) {
  return (
    <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 border-b border-slate-800 bg-slate-950/60 text-xs font-mono">
      <Stat
        icon={Cpu}
        label={`${stats.cpuPercent.toFixed(0)}% (${stats.cpuCores} core${stats.cpuCores === 1 ? "" : "s"})`}
        title={`CPU: ${stats.cpuPercent.toFixed(1)}% busy across ${stats.cpuCores} core(s)`}
      />
      <Stat
        icon={MemoryStick}
        label={`${formatBytes(stats.memUsed)} / ${formatBytes(stats.memTotal)}`}
        title={`RAM: ${stats.memUsed} / ${stats.memTotal} bytes used (free: ${stats.memFree} bytes)`}
      />
      <Stat
        icon={HardDrive}
        label={`${formatBytes(stats.diskUsed)} / ${formatBytes(stats.diskTotal)}`}
        title={`Disk (/): ${stats.diskUsed} / ${stats.diskTotal} bytes used (free: ${stats.diskFree} bytes)`}
      />
      <div className="flex items-center gap-2.5 text-slate-400">
        <span className="flex items-center gap-1" title={`Download: ${stats.netRxBytesPerSec.toFixed(0)} B/s`}>
          <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
          {formatRate(stats.netRxBytesPerSec)}
        </span>
        <span className="flex items-center gap-1" title={`Upload: ${stats.netTxBytesPerSec.toFixed(0)} B/s`}>
          <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
          {formatRate(stats.netTxBytesPerSec)}
        </span>
      </div>
      <Stat icon={Monitor} label={stats.os || "Unknown OS"} title={`OS: ${stats.os || "unknown"}`} />
      <Stat icon={User} label={stats.user || "unknown"} title={`Logged in as: ${stats.user || "unknown"}`} />
    </div>
  );
}
