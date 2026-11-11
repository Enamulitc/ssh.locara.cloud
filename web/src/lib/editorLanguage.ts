const EXTENSION_LANGUAGES: Record<string, string> = {
  js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  json: "json", yml: "yaml", yaml: "yaml", html: "html", css: "css",
  scss: "scss", md: "markdown", py: "python", sh: "shell", bash: "shell",
  go: "go", rs: "rust", java: "java", rb: "ruby", php: "php", sql: "sql",
  xml: "xml", toml: "ini", ini: "ini", conf: "ini", dockerfile: "dockerfile",
};

export function languageForPath(path: string): string {
  const base = path.split("/").pop() ?? "";
  if (base.toLowerCase() === "dockerfile") return "dockerfile";
  const ext = base.includes(".") ? base.split(".").pop()!.toLowerCase() : "";
  return EXTENSION_LANGUAGES[ext] ?? "plaintext";
}
