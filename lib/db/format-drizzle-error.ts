export function getDrizzleQueryCause(error: unknown): unknown {
  if (!error || typeof error !== "object") return undefined;
  const record = error as { cause?: unknown };
  return record.cause;
}

export function formatDrizzleQueryError(error: unknown): string {
  const cause = getDrizzleQueryCause(error);
  const causeMessage =
    cause instanceof Error
      ? cause.message
      : typeof cause === "string"
        ? cause
        : "";

  if (causeMessage) {
    if (/column .* does not exist/i.test(causeMessage)) {
      return `${causeMessage} — run npm run db:migrate on this database (auth user columns are out of date).`;
    }
    if (/relation .* does not exist/i.test(causeMessage)) {
      return `${causeMessage} — run npm run db:migrate (database schema is behind the app).`;
    }
    if (/connection terminated|timeout|ECONNREFUSED|ENOTFOUND/i.test(causeMessage)) {
      return `Database connection failed: ${causeMessage}. Check DATABASE_URL and Neon status, then retry.`;
    }
    return causeMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "Unknown database error";
}

export function isMissingColumnError(error: unknown, column?: string): boolean {
  const causeMessage = formatDrizzleQueryError(error).toLowerCase();
  if (!causeMessage.includes("does not exist")) return false;
  if (!column) return causeMessage.includes("column");
  return causeMessage.includes(column.toLowerCase());
}
