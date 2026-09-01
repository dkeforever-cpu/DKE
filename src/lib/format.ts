import type { User } from "./types";

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function formatDateShort(dateStr: string): string {
  // dateStr: YYYY-MM-DD
  const [, m, d] = dateStr.split("-");
  return `${m}.${d}`;
}

export function formatDateFull(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${y}.${m}.${d}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}.${dd} · ${hh}:${min}`;
}

export function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate + "T00:00:00");
  const today = new Date(todayStr() + "T00:00:00");
  const diff = Math.round((today.getTime() - due.getTime()) / 86400000);
  return diff;
}

export function isOverdue(dueDate: string, status: string): boolean {
  return status !== "완료" && daysOverdue(dueDate) > 0;
}

export function assigneeDisplay(
  task: { assigneeId: string; collaboratorIds: string[] },
  getUser: (id: string) => User | undefined
): { label: string; title: string } {
  const assigneeName = getUser(task.assigneeId)?.name ?? "-";
  const collaboratorNames = task.collaboratorIds.map((id) => getUser(id)?.name ?? "?");

  if (collaboratorNames.length === 0) {
    return { label: assigneeName, title: `담당자: ${assigneeName}` };
  }
  if (collaboratorNames.length === 1) {
    return {
      label: `${assigneeName}/${collaboratorNames[0]}`,
      title: `담당자: ${assigneeName} / 협업자: ${collaboratorNames[0]}`,
    };
  }
  const extra = collaboratorNames.length - 1;
  return {
    label: `${assigneeName}/${collaboratorNames[0]} 외 ${extra}명`,
    title: `담당자: ${assigneeName} / 협업자: ${collaboratorNames.join(", ")}`,
  };
}
