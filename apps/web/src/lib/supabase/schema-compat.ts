interface DatabaseErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

/**
 * PostgREST reports an unknown selected column as PostgreSQL 42703 and an
 * unknown write payload column as PGRST204. Keeping this check narrow lets a
 * release remain compatible while its additive migration is being rolled out,
 * without hiding unrelated database errors.
 */
export function isMissingColumnError(
  error: DatabaseErrorLike | null | undefined,
  column: string,
): boolean {
  if (!error) return false;
  const text = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    (error.code === "42703" || error.code === "PGRST204") &&
    text.includes(column.toLowerCase())
  );
}
