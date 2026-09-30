export function languageFromPath(path?: string): string {
  if (!path || path === "终端") return "bash";
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".env.local")) return "plaintext";
  return "typescript";
}
