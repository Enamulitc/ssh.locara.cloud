import { create } from "zustand";

interface BaseSession {
  id: string;
  displayName: string;
  color: string | null;
  showFiles: boolean;
  filesSplit: number;
}

export interface SshOpenSession extends BaseSession {
  kind: "ssh";
  hostId: string;
}

export interface KubeOpenSession extends BaseSession {
  kind: "kube";
  clusterId: string;
  namespace: string;
  pod: string;
  container: string;
}

export interface DbOpenSession extends BaseSession {
  kind: "db";
  connectionId: string;
}

export type OpenSession = SshOpenSession | KubeOpenSession | DbOpenSession;

interface SessionState {
  sessions: OpenSession[];
  order: string[];
  focusedId: string | null;
  activePaneId: string | null;
  layout: "tabs" | "split";
  splitIds: string[];
  openSshSession: (host: { id: string; name: string; color: string | null }) => string;
  openKubeSession: (target: {
    clusterId: string;
    clusterName: string;
    clusterColor: string | null;
    namespace: string;
    pod: string;
    container: string;
  }) => string;
  openDbSession: (connection: { id: string; name: string; color: string | null }) => string;
  closeSession: (id: string) => void;
  focusSession: (id: string) => void;
  setLayout: (layout: "tabs" | "split") => void;
  toggleSplit: (id: string) => void;
  toggleFiles: (id: string) => void;
  setActivePane: (id: string) => void;
  setFilesSplit: (id: string, pct: number) => void;
}

function genId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function addSession(
  set: (fn: (state: SessionState) => Partial<SessionState>) => void,
  session: OpenSession
) {
  set((state) => ({
    sessions: [...state.sessions, session],
    order: [...state.order, session.id],
    focusedId: session.id,
    activePaneId: session.id,
    splitIds: state.layout === "split" ? [...state.splitIds, session.id].slice(-4) : state.splitIds,
  }));
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  order: [],
  focusedId: null,
  activePaneId: null,
  layout: "tabs",
  splitIds: [],

  openSshSession(host) {
    const id = genId();
    addSession(set, {
      id,
      kind: "ssh",
      hostId: host.id,
      displayName: host.name,
      color: host.color,
      showFiles: false,
      filesSplit: 65,
    });
    return id;
  },

  openKubeSession(target) {
    const id = genId();
    addSession(set, {
      id,
      kind: "kube",
      clusterId: target.clusterId,
      namespace: target.namespace,
      pod: target.pod,
      container: target.container,
      displayName: `${target.clusterName} / ${target.pod}`,
      color: target.clusterColor,
      showFiles: false,
      filesSplit: 65,
    });
    return id;
  },

  openDbSession(connection) {
    const id = genId();
    addSession(set, {
      id,
      kind: "db",
      connectionId: connection.id,
      displayName: connection.name,
      color: connection.color,
      showFiles: false,
      filesSplit: 65,
    });
    return id;
  },

  closeSession(id) {
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id);
      const order = state.order.filter((sid) => sid !== id);
      const splitIds = state.splitIds.filter((sid) => sid !== id);
      let focusedId = state.focusedId;
      if (focusedId === id) {
        const idx = state.order.indexOf(id);
        focusedId = order[idx] ?? order[idx - 1] ?? order[0] ?? null;
      }
      const activePaneId = state.activePaneId === id ? focusedId : state.activePaneId;
      return { sessions, order, splitIds, focusedId, activePaneId };
    });
  },

  focusSession(id) {
    set((state) => {
      if (state.layout === "tabs") {
        return { focusedId: id, activePaneId: id };
      }
      const alreadyIn = state.splitIds.includes(id);
      const splitIds = alreadyIn
        ? state.splitIds.filter((sid) => sid !== id)
        : [...state.splitIds, id].slice(-4);
      return { focusedId: id, activePaneId: id, splitIds };
    });
  },

  setActivePane(id) {
    set({ activePaneId: id });
  },

  setFilesSplit(id, pct) {
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, filesSplit: pct } : s)),
    }));
  },

  setLayout(layout) {
    set((state) => {
      if (layout === "split" && state.splitIds.length === 0 && state.focusedId) {
        return { layout, splitIds: [state.focusedId] };
      }
      return { layout };
    });
  },

  toggleSplit(id) {
    get().focusSession(id);
  },

  toggleFiles(id) {
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, showFiles: !s.showFiles } : s)),
    }));
  },
}));
