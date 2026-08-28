import { ACCENT_PRESETS } from "@/lib/theme";
import { Task } from "@/lib/types";

export const CALENDAR_PALETTE = ACCENT_PRESETS.map((p) => p.value);

export function taskColor(task: Task): string {
  if (task.color) return task.color;
  let hash = 0;
  for (let i = 0; i < task.id.length; i++) hash = (hash * 31 + task.id.charCodeAt(i)) | 0;
  return CALENDAR_PALETTE[Math.abs(hash) % CALENDAR_PALETTE.length];
}

export function parseDateStr(s: string): Date {
  return new Date(s + "T00:00:00");
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// 6 weeks x 7 days, Sunday-first, covering the full month plus lead/trail days.
export function buildMonthGrid(cursor: Date): Date[][] {
  const first = startOfMonth(cursor);
  const gridStart = addDays(first, -first.getDay());
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const days: Date[] = [];
    for (let d = 0; d < 7; d++) days.push(addDays(gridStart, w * 7 + d));
    weeks.push(days);
  }
  return weeks;
}
