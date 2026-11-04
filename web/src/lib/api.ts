export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers:
      options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json", ...options.headers }
        : options.headers,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = typeof body.error === "string" ? body.error : JSON.stringify(body.error ?? message);
    } catch {
      // no json body
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", body: body !== undefined ? JSON.stringify(body) : undefined }),
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
};

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  user?: User;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: TeamMember[];
}

export type AuthType = "PASSWORD" | "PRIVATE_KEY" | "AGENT";

export interface Host {
  id: string;
  name: string;
  hostname: string;
  port: number;
  username: string;
  authType: AuthType;
  tags: string[];
  folder: string | null;
  color: string | null;
  lastConnectedAt: string | null;
  ownerUserId: string | null;
  ownerTeamId: string | null;
}

export interface SftpEntry {
  name: string;
  type: "file" | "directory" | "symlink";
  size: number;
  modifyTime: number;
}

export interface EncryptedBundle {
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface ExportFile {
  version: 1;
  app: "locara-ssh";
  file: EncryptedBundle;
}
