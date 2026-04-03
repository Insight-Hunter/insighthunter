type Level = "debug" | "info" | "warn" | "error";

function log(level: Level, message: string, data?: unknown): void {
  const entry = JSON.stringify({ level, message, ts: new Date().toISOString(), ...(data ? { data } : {}) });
  level === "error" || level === "warn" ? console.error(entry) : console.log(entry);
}

export const logger = {
  debug: (msg: string, data?: unknown) => log("debug", msg, data),
  info:  (msg: string, data?: unknown) => log("info",  msg, data),
  warn:  (msg: string, data?: unknown) => log("warn",  msg, data),
  error: (msg: string, data?: unknown) => log("error", msg, data),
};
