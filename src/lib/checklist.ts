import { ChecklistItem } from "./types";

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
  patch: Partial<Pick<ChecklistItem, "label" | "progress">>
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
