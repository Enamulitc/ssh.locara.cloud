import { api, type SftpEntry } from "./api";

export interface FsEntry {
  name: string;
  type: "file" | "directory";
  size?: number;
}

export interface FileSystemAdapter {
  list(path: string): Promise<FsEntry[]>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
}

function dirname(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx <= 0 ? "/" : path.slice(0, idx);
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

async function readText(url: string): Promise<string> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = typeof body.error === "string" ? body.error : message;
    } catch {
      // no json body
    }
    throw new Error(message);
  }
  return res.text();
}

export function sshAdapter(hostId: string): FileSystemAdapter {
  return {
    async list(path) {
      const entries = await api.get<SftpEntry[]>(`/api/hosts/${hostId}/sftp/list?path=${encodeURIComponent(path)}`);
      return entries.map((e) => ({
        name: e.name,
        type: e.type === "directory" ? "directory" : "file",
        size: e.type === "file" ? e.size : undefined,
      }));
    },
    read(path) {
      return readText(`/api/hosts/${hostId}/sftp/download?path=${encodeURIComponent(path)}`);
    },
    async write(path, content) {
      const form = new FormData();
      form.append("path", dirname(path));
      form.append("file", new File([content], basename(path)));
      await api.postForm(`/api/hosts/${hostId}/sftp/upload`, form);
    },
  };
}

export function kubeAdapter(clusterId: string, namespace: string, pod: string, container: string): FileSystemAdapter {
  const query = (path: string) => new URLSearchParams({ namespace, pod, container, path }).toString();
  return {
    async list(path) {
      return api.get<FsEntry[]>(`/api/kube-clusters/${clusterId}/dir?${query(path)}`);
    },
    read(path) {
      return readText(`/api/kube-clusters/${clusterId}/file?${query(path)}`);
    },
    async write(path, content) {
      await api.put(`/api/kube-clusters/${clusterId}/file?${query(path)}`, { content });
    },
  };
}
