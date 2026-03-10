export interface RecentContractTypeEntry<T extends string = string> {
  type: T;
  contractId: string;
  createdAt: number;
}

function isRecentEntryLike<T extends string>(
  value: unknown,
  isValidType: (value: string | null) => value is T
): value is RecentContractTypeEntry<T> {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<RecentContractTypeEntry<T>>;
  if (!isValidType(typeof candidate.type === "string" ? candidate.type : null)) {
    return false;
  }
  if (typeof candidate.contractId !== "string" || candidate.contractId.trim().length === 0) {
    return false;
  }

  return true;
}

export function parseRecentContractTypeHistory<T extends string>(
  rawRecent: string | null,
  isValidType: (value: string | null) => value is T,
  options?: {
    maxEntries?: number;
    now?: number;
  }
): RecentContractTypeEntry<T>[] {
  if (!rawRecent) return [];

  const maxEntries = options?.maxEntries ?? 10;
  const now = options?.now ?? Date.now();

  try {
    const parsed = JSON.parse(rawRecent) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((value, index): RecentContractTypeEntry<T> | null => {
        // Backward compatibility: older payloads were plain type id arrays.
        if (typeof value === "string" && isValidType(value)) {
          return {
            type: value,
            contractId: `legacy-${value}-${index}`,
            createdAt: now - index,
          };
        }

        if (!isRecentEntryLike(value, isValidType)) return null;

        return {
          type: value.type,
          contractId: value.contractId,
          createdAt: typeof value.createdAt === "number" ? value.createdAt : now - index,
        };
      })
      .filter((entry): entry is RecentContractTypeEntry<T> => Boolean(entry))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, maxEntries);
  } catch {
    return [];
  }
}

export function upsertRecentContractType<T extends string>(
  history: RecentContractTypeEntry<T>[],
  next: {
    type: T;
    contractId: string;
  },
  options?: {
    maxEntries?: number;
    now?: number;
  }
): RecentContractTypeEntry<T>[] {
  const maxEntries = options?.maxEntries ?? 10;
  const now = options?.now ?? Date.now();
  const normalizedContractId = next.contractId.trim();
  if (!normalizedContractId) return history;

  const entry: RecentContractTypeEntry<T> = {
    type: next.type,
    contractId: normalizedContractId,
    createdAt: now,
  };

  return [entry, ...history.filter((item) => item.contractId !== normalizedContractId)].slice(0, maxEntries);
}

export function pickRecentUniqueTypes<T extends string>(
  history: RecentContractTypeEntry<T>[],
  maxTypes = 5
): T[] {
  const seen = new Set<T>();
  const unique: T[] = [];

  for (const entry of history) {
    if (seen.has(entry.type)) continue;
    seen.add(entry.type);
    unique.push(entry.type);
    if (unique.length >= maxTypes) break;
  }

  return unique;
}
