import { Task } from "@/lib/types";

// A wide, evenly-spaced set of hues (distinct from the smaller theme accent
// palette) so that auto-assigned task colors rarely collide even when many
// tasks land on the same day. Lightness is tuned per-hue so every color
// keeps enough contrast for white chip text.
export const CALENDAR_PALETTE: { name: string; value: string }[] = [
  { name: "레드", value: "#ca2121" },
  { name: "오렌지", value: "#ca5921" },
  { name: "앰버", value: "#b4821d" },
  { name: "옐로", value: "#919118" },
  { name: "라임", value: "#6f9a19" },
  { name: "그린", value: "#469e1a" },
  { name: "에메랄드", value: "#1aa21a" },
  { name: "틸", value: "#1aa248" },
  { name: "시안", value: "#1a9e72" },
  { name: "스카이", value: "#199a9a" },
  { name: "블루", value: "#2191ca" },
  { name: "인디고", value: "#2159ca" },
  { name: "바이올렛", value: "#2121ca" },
  { name: "퍼플", value: "#5921ca" },
  { name: "퍼플핑크", value: "#9121ca" },
  { name: "마젠타", value: "#ca21ca" },
  { name: "핑크", value: "#ca2191" },
  { name: "로즈", value: "#ca2159" },
];

export function taskColor(task: Task): string {
  if (task.color) return task.color;
  let hash = 0;
  for (let i = 0; i < task.id.length; i++) hash = (hash * 31 + task.id.charCodeAt(i)) | 0;
  return CALENDAR_PALETTE[Math.abs(hash) % CALENDAR_PALETTE.length].value;
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
