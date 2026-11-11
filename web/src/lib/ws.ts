function wsProtocol(): string {
  return window.location.protocol === "https:" ? "wss:" : "ws:";
}

export function sshSocketUrl(hostId: string): string {
  return `${wsProtocol()}//${window.location.host}/ws/ssh/${hostId}`;
}

export function kubeExecSocketUrl(clusterId: string, namespace: string, pod: string, container: string): string {
  const query = new URLSearchParams({ namespace, pod, container });
  return `${wsProtocol()}//${window.location.host}/ws/kube/${clusterId}/exec?${query.toString()}`;
}

export function dbSocketUrl(connectionId: string): string {
  return `${wsProtocol()}//${window.location.host}/ws/db/${connectionId}`;
}
