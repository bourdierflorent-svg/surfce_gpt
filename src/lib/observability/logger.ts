type LogLevel = "debug" | "info" | "warn" | "error";
type LogValue = string | number | boolean | null | undefined;
type LogFields = Readonly<Record<string, LogValue>>;

const SENSITIVE_KEY = /authorization|cookie|password|secret|token|api.?key|body|content|email/i;
const SECRET_VALUE =
  /(Bearer\s+[A-Za-z0-9._~+/-]+=*|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9_-]{12,})/gi;

function cleanText(value: string) {
  return value.replace(SECRET_VALUE, "[REDACTED]").slice(0, 500);
}

function sanitize(fields: LogFields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => {
      if (SENSITIVE_KEY.test(key)) return [key, "[REDACTED]"];
      return [key, typeof value === "string" ? cleanText(value) : value];
    }),
  );
}

function write(level: LogLevel, event: string, fields: LogFields = {}) {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    service: "surfce-web",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    ...sanitize(fields),
  });
  if (level === "error") {
    console.error(record);
  } else if (level === "warn") {
    console.warn(record);
  } else {
    console.log(record);
  }
}

export const logger = {
  debug(event: string, fields?: LogFields) {
    if (process.env.NODE_ENV !== "production") write("debug", event, fields);
  },
  info(event: string, fields?: LogFields) {
    write("info", event, fields);
  },
  warn(event: string, fields?: LogFields) {
    write("warn", event, fields);
  },
  error(event: string, fields?: LogFields) {
    write("error", event, fields);
  },
};
