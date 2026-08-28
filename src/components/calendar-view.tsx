"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Task } from "@/lib/types";
import { taskColor, buildMonthGrid, parseDateStr, toDateStr } from "@/lib/calendar";
import { todayStr } from "@/lib/format";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_START_ROWS = 3;
const ITEM_H = 15;

type Role = "start" | "due" | "progress";

interface DayItem {
  task: Task;
  role: Role;
}

interface Range {
  task: Task;
  start: Date;
  end: Date;
}

function itemsForDay(day: Date, ranges: Range[]): DayItem[] {
  const t = day.getTime();
  const list: DayItem[] = [];
  for (const r of ranges) {
    if (t < r.start.getTime() || t > r.end.getTime()) continue;
    const role: Role = t === r.start.getTime() ? "start" : t === r.end.getTime() ? "due" : "progress";
    list.push({ task: r.task, role });
  }
  const priority: Record<Role, number> = { start: 0, due: 1, progress: 2 };
  list.sort((a, b) => priority[a.role] - priority[b.role] || a.task.dueDate.localeCompare(b.task.dueDate));
  return list;
}

export function CalendarView({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const weeks = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const today = todayStr();

  const ranges = useMemo<Range[]>(
    () =>
      tasks
        .filter((t) => t.status !== "완료")
        .map((t) => {
          const start = parseDateStr(t.createdAt);
          let end = parseDateStr(t.dueDate);
          if (end < start) end = start;
          return { task: t, start, end };
        }),
    [tasks]
  );

  function openTask(id: string) {
    router.push(`/tasks/${id}`);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex flex-none items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
        <div className="text-[12.5px] font-bold text-[var(--text)]">
          {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
          className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[var(--text-faint)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          onClick={() => setCursor(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })}
          className="h-6 rounded-[3px] px-2 text-[10.5px] font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-alt)]"
        >
          오늘
        </button>
        <button
          onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
          className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[var(--text-faint)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="grid flex-none grid-cols-7 border-b border-[var(--divider)]">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className="px-1.5 py-1 text-center text-[10px] font-semibold"
            style={{ color: i === 0 ? "var(--danger-text)" : i === 6 ? "var(--accent-soft-fg)" : "var(--text-faint)" }}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {weeks.map((days, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-[var(--divider)]">
            {days.map((d) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = toDateStr(d) === today;
              const dayItems = itemsForDay(d, ranges);
              const starts = dayItems.filter((i) => i.role === "start");
              const others = dayItems.filter((i) => i.role !== "start");
              const visibleStarts = starts.slice(0, MAX_START_ROWS);
              const startOverflow = starts.length - visibleStarts.length;
              return (
                <div
                  key={d.toISOString()}
                  className="flex flex-col gap-[1px] border-r border-[var(--divider)] px-1 pb-1 pt-1 last:border-r-0"
                  style={{ minHeight: 46 }}
                >
                  <span
                    className="mb-[1px] inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold"
                    style={{
                      color: !inMonth ? "var(--text-disabled)" : isToday ? "var(--accent-fg)" : "var(--text-secondary)",
                      background: isToday ? "var(--accent)" : "transparent",
                    }}
                  >
                    {d.getDate()}
                  </span>

                  {visibleStarts.map(({ task }) => (
                    <StartChip key={task.id} task={task} onOpen={() => openTask(task.id)} />
                  ))}
                  {startOverflow > 0 && (
                    <div className="text-[9px] font-semibold text-[var(--text-faint)]">
                      +{startOverflow}개 시작
                    </div>
                  )}

                  {others.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-[3px] gap-y-[1px]">
                      {others.map(({ task, role }) => (
                        <MiniBadge key={`${task.id}-${role}`} task={task} role={role} onOpen={() => openTask(task.id)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function StartChip({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const color = taskColor(task);
  return (
    <button
      onClick={onOpen}
      title={task.title}
      className="flex items-center overflow-hidden rounded-[2px] px-1 text-left text-[10px] font-semibold text-white"
      style={{ background: color, height: ITEM_H }}
    >
      <span className="truncate">{task.title}</span>
    </button>
  );
}

// Progress/due days omit the title entirely — with many people each running
// several tasks, one full-width row per task per day would blow up the row
// count, so these render as compact same-color glyphs that wrap inline.
function MiniBadge({ task, role, onOpen }: { task: Task; role: Role; onOpen: () => void }) {
  const color = taskColor(task);
  if (role === "due") {
    return (
      <button
        onClick={onOpen}
        title={`${task.title} (마감)`}
        className="flex flex-none items-center gap-[1px] text-[9px] font-bold leading-none"
        style={{ color }}
      >
        <span>■</span>
        <span>마감</span>
      </button>
    );
  }
  return (
    <button
      onClick={onOpen}
      title={task.title}
      className="flex-none text-[11px] font-bold leading-none"
      style={{ color }}
    >
      ▶
    </button>
  );
}
