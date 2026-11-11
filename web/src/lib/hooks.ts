import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type DbConnection,
  type DbEngine,
  type DnsLookupResult,
  type DnsRecordType,
  type ExportFile,
  type Host,
  type KubeCluster,
  type KubePod,
  type PortScanSummary,
  type PropagationSummary,
  type Team,
  type WhoisResult,
} from "./api";

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

export function useKubeClusters() {
  return useQuery({ queryKey: ["kubeClusters"], queryFn: () => api.get<KubeCluster[]>("/api/kube-clusters") });
}

export function useKubeCluster(clusterId: string | undefined) {
  return useQuery({
    queryKey: ["kubeClusters", clusterId],
    queryFn: () => api.get<KubeCluster>(`/api/kube-clusters/${clusterId}`),
    enabled: !!clusterId,
  });
}

export interface KubeClusterInput {
  name: string;
  defaultNamespace: string | null;
  tags: string[];
  folder: string | null;
  color: string | null;
  teamId: string | null;
}

export function useCreateKubeCluster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: KubeClusterInput) => api.post<KubeCluster>("/api/kube-clusters", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kubeClusters"] }),
  });
}

export function useUpdateKubeCluster(clusterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<KubeClusterInput>) => api.patch<KubeCluster>(`/api/kube-clusters/${clusterId}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kubeClusters"] });
      qc.invalidateQueries({ queryKey: ["kubeClusters", clusterId] });
    },
  });
}

export function useDeleteKubeCluster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (clusterId: string) => api.delete(`/api/kube-clusters/${clusterId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kubeClusters"] }),
  });
}

export function useSetKubeconfig() {
  return useMutation({
    mutationFn: (input: { clusterId: string; kubeconfig: string }) =>
      api.put(`/api/kube-clusters/${input.clusterId}/kubeconfig`, { kubeconfig: input.kubeconfig }),
  });
}

export function useKubeNamespaces(clusterId: string | undefined) {
  return useQuery({
    queryKey: ["kubeNamespaces", clusterId],
    queryFn: () => api.get<string[]>(`/api/kube-clusters/${clusterId}/namespaces`),
    enabled: !!clusterId,
  });
}

export function useKubePods(clusterId: string | undefined, namespace: string | undefined) {
  return useQuery({
    queryKey: ["kubePods", clusterId, namespace],
    queryFn: () => api.get<KubePod[]>(`/api/kube-clusters/${clusterId}/namespaces/${namespace}/pods`),
    enabled: !!clusterId && !!namespace,
  });
}

export function useDbConnections() {
  return useQuery({ queryKey: ["dbConnections"], queryFn: () => api.get<DbConnection[]>("/api/db-connections") });
}

export function useDbConnection(connectionId: string | undefined) {
  return useQuery({
    queryKey: ["dbConnections", connectionId],
    queryFn: () => api.get<DbConnection>(`/api/db-connections/${connectionId}`),
    enabled: !!connectionId,
  });
}

export interface DbConnectionInput {
  name: string;
  engine: DbEngine;
  hostname: string;
  port: number;
  database: string;
  username: string;
  tunnelHostId: string | null;
  tags: string[];
  folder: string | null;
  color: string | null;
  teamId: string | null;
}

export function useCreateDbConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DbConnectionInput) => api.post<DbConnection>("/api/db-connections", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dbConnections"] }),
  });
}

export function useUpdateDbConnection(connectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<DbConnectionInput>) =>
      api.patch<DbConnection>(`/api/db-connections/${connectionId}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dbConnections"] });
      qc.invalidateQueries({ queryKey: ["dbConnections", connectionId] });
    },
  });
}

export function useDeleteDbConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) => api.delete(`/api/db-connections/${connectionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dbConnections"] }),
  });
}

export function useSetDbCredential() {
  return useMutation({
    mutationFn: (input: { connectionId: string; password: string }) =>
      api.put(`/api/db-connections/${input.connectionId}/credentials`, { password: input.password }),
  });
}

export function usePortScan() {
  return useMutation({
    mutationFn: (input: { target: string; ports?: string }) =>
      api.post<PortScanSummary>("/api/port-scan", input),
  });
}

export function useDnsLookup() {
  return useMutation({
    mutationFn: (target: string) => api.post<DnsLookupResult>("/api/dns-lookup", { target }),
  });
}

export function useDnsPropagation() {
  return useMutation({
    mutationFn: (input: { target: string; recordType: DnsRecordType }) =>
      api.post<PropagationSummary>("/api/dns-propagation", input),
  });
}

export function useWhois() {
  return useMutation({
    mutationFn: (target: string) => api.post<WhoisResult>("/api/whois", { target }),
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
