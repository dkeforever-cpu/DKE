import { ChecklistItem, Status, Task } from "./types";

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
      ? { ...item, ...patch, updatedAt: new Date().toISOString() }
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
  // progress는 항상 숫자여야 하지만, 구글 시트를 거쳐 문자열("50")로
  // 돌아오는 경우 "+"가 숫자 덧셈이 아니라 문자열 이어붙이기로 동작해
  // 평균이 터무니없이 큰 값으로 깨진다 — 항상 Number로 강제 변환한다.
  const sum = all.reduce((acc, i) => acc + (Number(i.progress) || 0), 0);
  return Math.round(sum / all.length);
}

// Keeps status in lockstep with the derived progress: reaching 100% marks
// the task 완료; falling back below 100% (e.g. reopening a checklist item)
// un-completes it so the status badge never disagrees with the progress bar.
export function deriveStatus(progress: number, currentStatus: Status): Status {
  if (progress === 100) return "완료";
  if (currentStatus === "완료") return "진행중";
  return currentStatus;
}

// 종료일(completedAt)은 진행률이 처음 100%가 된 날짜 — 100%인 상태가
// 계속 유지되는 동안은 그대로 두고, 100% 밑으로 떨어지면 지워졌다가
// 다시 100%가 되면 그 시점의 날짜로 새로 채워진다.
export function deriveCompletedAt(
  progress: number,
  previousProgress: number,
  previousCompletedAt: string | undefined
): string | undefined {
  if (progress !== 100) return undefined;
  if (previousProgress === 100) return previousCompletedAt;
  return new Date().toISOString().slice(0, 10);
}

// addChecklistItem/updateChecklistItem/deleteChecklistItem이 공통으로
// 쓰는 재계산 로직 — checklist를 바꾼 뒤 progress/status/completedAt을
// 한 번에 다시 맞춘다.
export function applyChecklist(
  task: Task,
  checklist: ChecklistItem[]
): Pick<Task, "checklist" | "progress" | "status" | "completedAt"> {
  const progress = computeProgress(checklist);
  return {
    checklist,
    progress,
    status: deriveStatus(progress, task.status),
    completedAt: deriveCompletedAt(progress, task.progress, task.completedAt),
  };
}
