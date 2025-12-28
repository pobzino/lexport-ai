import * as Diff from "diff";
import type {
  ContractContent,
  ContractClause,
  VersionDiff,
  ClauseDiff,
  VersionComparison,
} from "@/db/types";

/**
 * Compute a word-by-word diff between two text strings
 */
export function computeTextDiff(oldText: string, newText: string): VersionDiff[] {
  if (!oldText && !newText) {
    return [];
  }

  if (!oldText) {
    return [{ type: "added", value: newText }];
  }

  if (!newText) {
    return [{ type: "removed", value: oldText }];
  }

  const changes = Diff.diffWords(oldText, newText);

  return changes.map((change) => {
    if (change.added) {
      return { type: "added" as const, value: change.value };
    }
    if (change.removed) {
      return { type: "removed" as const, value: change.value };
    }
    return { type: "unchanged" as const, value: change.value };
  });
}

/**
 * Compute a line-by-line diff for longer content (useful for clauses)
 */
export function computeLineDiff(oldText: string, newText: string): VersionDiff[] {
  if (!oldText && !newText) {
    return [];
  }

  if (!oldText) {
    return [{ type: "added", value: newText }];
  }

  if (!newText) {
    return [{ type: "removed", value: oldText }];
  }

  const changes = Diff.diffLines(oldText, newText);

  return changes.map((change) => {
    if (change.added) {
      return { type: "added" as const, value: change.value };
    }
    if (change.removed) {
      return { type: "removed" as const, value: change.value };
    }
    return { type: "unchanged" as const, value: change.value };
  });
}

/**
 * Compare two clauses and determine their diff status
 */
export function computeClauseDiff(
  oldClauses: ContractClause[],
  newClauses: ContractClause[]
): ClauseDiff[] {
  const result: ClauseDiff[] = [];
  const oldClauseMap = new Map(oldClauses.map((c) => [c.id, c]));
  const newClauseMap = new Map(newClauses.map((c) => [c.id, c]));
  const processedIds = new Set<string>();

  // Process clauses in new order first
  for (const newClause of newClauses) {
    const oldClause = oldClauseMap.get(newClause.id);
    processedIds.add(newClause.id);

    if (!oldClause) {
      // New clause added
      result.push({
        clauseId: newClause.id,
        clauseTitle: newClause.title,
        status: "added",
        contentDiff: [{ type: "added", value: newClause.content }],
      });
    } else if (
      oldClause.title !== newClause.title ||
      oldClause.content !== newClause.content
    ) {
      // Clause modified
      result.push({
        clauseId: newClause.id,
        clauseTitle: newClause.title,
        status: "modified",
        titleDiff:
          oldClause.title !== newClause.title
            ? computeTextDiff(oldClause.title, newClause.title)
            : undefined,
        contentDiff:
          oldClause.content !== newClause.content
            ? computeTextDiff(oldClause.content, newClause.content)
            : undefined,
      });
    } else {
      // Clause unchanged
      result.push({
        clauseId: newClause.id,
        clauseTitle: newClause.title,
        status: "unchanged",
      });
    }
  }

  // Check for removed clauses
  for (const oldClause of oldClauses) {
    if (!processedIds.has(oldClause.id)) {
      result.push({
        clauseId: oldClause.id,
        clauseTitle: oldClause.title,
        status: "removed",
        contentDiff: [{ type: "removed", value: oldClause.content }],
      });
    }
  }

  return result;
}

/**
 * Compare two contract versions and generate a full comparison
 */
export function compareVersions(
  oldContent: ContractContent,
  newContent: ContractContent,
  fromVersion: number,
  toVersion: number
): VersionComparison {
  return {
    fromVersion,
    toVersion,
    preambleDiff: computeTextDiff(oldContent.preamble, newContent.preamble),
    recitalsDiff: computeTextDiff(
      oldContent.recitals || "",
      newContent.recitals || ""
    ),
    clausesDiff: computeClauseDiff(oldContent.clauses, newContent.clauses),
    signatureBlockDiff: computeTextDiff(
      oldContent.signatureBlock,
      newContent.signatureBlock
    ),
  };
}

/**
 * Generate a human-readable summary of changes between versions
 */
export function generateChangeSummary(
  oldContent: ContractContent,
  newContent: ContractContent
): string {
  const changes: string[] = [];

  // Check preamble changes
  if (oldContent.preamble !== newContent.preamble) {
    changes.push("Preamble updated");
  }

  // Check recitals changes
  if ((oldContent.recitals || "") !== (newContent.recitals || "")) {
    changes.push("Recitals updated");
  }

  // Check clause changes
  const oldClauseMap = new Map(oldContent.clauses.map((c) => [c.id, c]));
  const newClauseMap = new Map(newContent.clauses.map((c) => [c.id, c]));

  let addedClauses = 0;
  let removedClauses = 0;
  let modifiedClauses = 0;

  for (const newClause of newContent.clauses) {
    const oldClause = oldClauseMap.get(newClause.id);
    if (!oldClause) {
      addedClauses++;
    } else if (
      oldClause.title !== newClause.title ||
      oldClause.content !== newClause.content
    ) {
      modifiedClauses++;
    }
  }

  for (const oldClause of oldContent.clauses) {
    if (!newClauseMap.has(oldClause.id)) {
      removedClauses++;
    }
  }

  if (addedClauses > 0) {
    changes.push(`${addedClauses} clause${addedClauses > 1 ? "s" : ""} added`);
  }
  if (removedClauses > 0) {
    changes.push(
      `${removedClauses} clause${removedClauses > 1 ? "s" : ""} removed`
    );
  }
  if (modifiedClauses > 0) {
    changes.push(
      `${modifiedClauses} clause${modifiedClauses > 1 ? "s" : ""} modified`
    );
  }

  // Check signature block changes
  if (oldContent.signatureBlock !== newContent.signatureBlock) {
    changes.push("Signature block updated");
  }

  if (changes.length === 0) {
    return "No changes detected";
  }

  return changes.join("; ");
}

/**
 * Check if there are any actual changes between two versions
 */
export function hasChanges(
  oldContent: ContractContent,
  newContent: ContractContent
): boolean {
  // Quick check for preamble
  if (oldContent.preamble !== newContent.preamble) {
    return true;
  }

  // Quick check for recitals
  if ((oldContent.recitals || "") !== (newContent.recitals || "")) {
    return true;
  }

  // Quick check for signature block
  if (oldContent.signatureBlock !== newContent.signatureBlock) {
    return true;
  }

  // Check clause count
  if (oldContent.clauses.length !== newContent.clauses.length) {
    return true;
  }

  // Check each clause
  const oldClauseMap = new Map(oldContent.clauses.map((c) => [c.id, c]));
  for (const newClause of newContent.clauses) {
    const oldClause = oldClauseMap.get(newClause.id);
    if (!oldClause) {
      return true;
    }
    if (
      oldClause.title !== newClause.title ||
      oldClause.content !== newClause.content
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Get statistics about the diff
 */
export function getDiffStats(comparison: VersionComparison): {
  additions: number;
  deletions: number;
  modifications: number;
} {
  let additions = 0;
  let deletions = 0;
  let modifications = 0;

  // Count preamble changes
  for (const diff of comparison.preambleDiff) {
    if (diff.type === "added") additions++;
    if (diff.type === "removed") deletions++;
  }

  // Count recitals changes
  for (const diff of comparison.recitalsDiff) {
    if (diff.type === "added") additions++;
    if (diff.type === "removed") deletions++;
  }

  // Count clause changes
  for (const clauseDiff of comparison.clausesDiff) {
    if (clauseDiff.status === "added") additions++;
    if (clauseDiff.status === "removed") deletions++;
    if (clauseDiff.status === "modified") modifications++;
  }

  // Count signature block changes
  for (const diff of comparison.signatureBlockDiff) {
    if (diff.type === "added") additions++;
    if (diff.type === "removed") deletions++;
  }

  return { additions, deletions, modifications };
}
