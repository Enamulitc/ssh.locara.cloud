import { create } from "zustand";

export interface OpenSession {
  id: string;
  hostId: string;
  hostName: string;
  hostColor: string | null;
  showFiles: boolean;
}

interface SessionState {
  sessions: OpenSession[];
  order: string[];
  focusedId: string | null;
  layout: "tabs" | "split";
  splitIds: string[];
  openSession: (host: { id: string; name: string; color: string | null }) => string;
  closeSession: (id: string) => void;
  focusSession: (id: string) => void;
  setLayout: (layout: "tabs" | "split") => void;
  toggleSplit: (id: string) => void;
  toggleFiles: (id: string) => void;
}

function genId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  order: [],
  focusedId: null,
  layout: "tabs",
  splitIds: [],

  openSession(host) {
    const id = genId();
    const session: OpenSession = {
      id,
      hostId: host.id,
      hostName: host.name,
      hostColor: host.color,
      showFiles: false,
    };
    set((state) => ({
      sessions: [...state.sessions, session],
      order: [...state.order, id],
      focusedId: id,
      splitIds: state.layout === "split" ? [...state.splitIds, id].slice(-4) : state.splitIds,
    }));
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
      return { sessions, order, splitIds, focusedId };
    });
  },

  focusSession(id) {
    set((state) => {
      if (state.layout === "tabs") {
        return { focusedId: id };
      }
      const alreadyIn = state.splitIds.includes(id);
      const splitIds = alreadyIn
        ? state.splitIds.filter((sid) => sid !== id)
        : [...state.splitIds, id].slice(-4);
      return { focusedId: id, splitIds };
    });
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
