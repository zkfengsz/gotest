import { shuffleArray } from "@/lib/exam";

export function orderQuestionsByIds<T extends { id: string }>(
  questions: T[],
  order: string[]
): T[] {
  const map = new Map(questions.map((q) => [q.id, q]));
  const ordered = order
    .map((id) => map.get(id))
    .filter((q): q is T => q !== undefined);
  const orderedSet = new Set(order);
  const extras = questions.filter((q) => !orderedSet.has(q.id));
  return [...ordered, ...shuffleArray(extras)];
}

export function syncQuestionOrder(
  existing: string[] | undefined | null,
  currentIds: string[]
): { order: string[]; changed: boolean } {
  if (!existing || existing.length === 0) {
    return { order: shuffleArray(currentIds), changed: true };
  }

  const currentSet = new Set(currentIds);
  const kept = existing.filter((id) => currentSet.has(id));
  const keptSet = new Set(kept);
  const added = currentIds.filter((id) => !keptSet.has(id));

  if (added.length === 0 && kept.length === existing.length) {
    return { order: existing, changed: false };
  }

  return { order: [...kept, ...shuffleArray(added)], changed: true };
}
