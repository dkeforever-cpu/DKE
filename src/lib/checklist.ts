import { ChecklistItem, Status } from "./types";

export function addNode(
  tree: ChecklistItem[],
  parentId: string | null,
  node: ChecklistItem
): ChecklistItem[] {
  if (parentId === null) return [...tree, node];
  return tree.map((item) =>
    item.id === parentId
      ? { ...item, children: [...item.children, node] }
      : { ...item, children: addNode(item.children, parentId, node) }
  );
}

export function updateNode(
  tree: ChecklistItem[],
  id: string,
  patch: Partial<Pick<ChecklistItem, "label" | "progress" | "dueDate">>
): ChecklistItem[] {
  return tree.map((item) =>
    item.id === id
      ? { ...item, ...patch }
      : { ...item, children: updateNode(item.children, id, patch) }
  );
}

export function removeNode(tree: ChecklistItem[], id: string): ChecklistItem[] {
  return tree
    .filter((item) => item.id !== id)
    .map((item) => ({ ...item, children: removeNode(item.children, id) }));
}

export function flatten(tree: ChecklistItem[]): ChecklistItem[] {
  return tree.flatMap((item) => [item, ...flatten(item.children)]);
}

export function findNode(tree: ChecklistItem[], id: string): ChecklistItem | undefined {
  for (const item of tree) {
    if (item.id === id) return item;
    const found = findNode(item.children, id);
    if (found) return found;
  }
  return undefined;
}

// A task's overall progress is not set directly — it's the average
// completion of its own 필요 업무 (checklist items), flattened across all
// depths, matching the "평균" already shown in the checklist UI.
export function computeProgress(items: ChecklistItem[]): number {
  const all = flatten(items);
  if (all.length === 0) return 0;
  return Math.round(all.reduce((sum, i) => sum + i.progress, 0) / all.length);
}

// Keeps status in lockstep with the derived progress: reaching 100% marks
// the task 완료; falling back below 100% (e.g. reopening a checklist item)
// un-completes it so the status badge never disagrees with the progress bar.
export function deriveStatus(progress: number, currentStatus: Status): Status {
  if (progress === 100) return "완료";
  if (currentStatus === "완료") return "진행중";
  return currentStatus;
}
