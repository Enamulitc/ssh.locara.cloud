import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ExportFile, type Host, type Team } from "./api";

export function useHosts() {
  return useQuery({ queryKey: ["hosts"], queryFn: () => api.get<Host[]>("/api/hosts") });
}

export function useHost(hostId: string | undefined) {
  return useQuery({
    queryKey: ["hosts", hostId],
    queryFn: () => api.get<Host>(`/api/hosts/${hostId}`),
    enabled: !!hostId,
  });
}

export interface HostInput {
  name: string;
  hostname: string;
  port: number;
  username: string;
  authType: "PASSWORD" | "PRIVATE_KEY" | "AGENT";
  tags: string[];
  folder: string | null;
  color: string | null;
  teamId: string | null;
}

export function useCreateHost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: HostInput) => api.post<Host>("/api/hosts", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hosts"] }),
  });
}

export function useUpdateHost(hostId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<HostInput>) => api.patch<Host>(`/api/hosts/${hostId}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hosts"] });
      qc.invalidateQueries({ queryKey: ["hosts", hostId] });
    },
  });
}

export function useDeleteHost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hostId: string) => api.delete(`/api/hosts/${hostId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hosts"] }),
  });
}

export function useSetCredential() {
  return useMutation({
    mutationFn: (input: {
      hostId: string;
      type: "PASSWORD" | "PRIVATE_KEY" | "PASSPHRASE";
      secret: string;
    }) => api.put(`/api/hosts/${input.hostId}/credentials`, { type: input.type, secret: input.secret }),
  });
}

export function useTeams() {
  return useQuery({ queryKey: ["teams"], queryFn: () => api.get<Team[]>("/api/teams") });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<Team>("/api/teams", { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });
}

export function useInviteMember(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => api.post(`/api/teams/${teamId}/members`, { email }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });
}

export function useRemoveMember(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/api/teams/${teamId}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });
}

export function useExportHosts() {
  return useMutation({
    mutationFn: (passphrase: string) => api.post<ExportFile>("/api/export", { passphrase }),
  });
}

export function useImportHosts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ passphrase, file }: { passphrase: string; file: ExportFile["file"] }) =>
      api.post<{ imported: number }>("/api/import", { passphrase, file }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hosts"] }),
  });
}
