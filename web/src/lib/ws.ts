export function sshSocketUrl(hostId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/ssh/${hostId}`;
}
