"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Task } from "@/lib/types";
import { taskColor } from "@/lib/calendar";
import { buildMonthGrid, parseDateStr, toDateStr } from "@/lib/calendar";
import { todayStr } from "@/lib/format";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_LANES = 4;
const BAR_H = 16;
const BAR_GAP = 2;
const HEADER_H = 20;

interface Segment {
  task: Task;
  colStart: number; // 0-6
  colEnd: number; // 0-6, inclusive
  lane: number;
}

function buildWeekSegments(days: Date[], items: { task: Task; start: Date; end: Date }[]) {
  const rowStart = days[0];
  const rowEnd = days[6];
  const raw: { task: Task; colStart: number; colEnd: number }[] = [];
  for (const it of items) {
    if (it.end < rowStart || it.start > rowEnd) continue;
    const segStart = it.start < rowStart ? rowStart : it.start;
    const segEnd = it.end > rowEnd ? rowEnd : it.end;
    const colStart = Math.round((segStart.getTime() - rowStart.getTime()) / 86400000);
    const colEnd = Math.round((segEnd.getTime() - rowStart.getTime()) / 86400000);
    raw.push({ task: it.task, colStart, colEnd });
  }
  raw.sort((a, b) => a.colStart - b.colStart || a.colEnd - b.colEnd);

  const laneEnds: number[] = [];
  const segments: Segment[] = [];
  let overflow = 0;
  for (const r of raw) {
    let lane = laneEnds.findIndex((end) => end < r.colStart);
    if (lane === -1) {
      if (laneEnds.length >= MAX_LANES) {
        overflow++;
        continue;
      }
      lane = laneEnds.length;
      laneEnds.push(r.colEnd);
    } else {
      laneEnds[lane] = r.colEnd;
    }
    segments.push({ ...r, lane });
  }
  const laneCount = Math.min(laneEnds.length, MAX_LANES);
  return { segments, laneCount, overflow };
}

export function CalendarView({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const weeks = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const today = todayStr();

  const items = useMemo(
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
        {weeks.map((days, wi) => {
          const { segments, laneCount, overflow } = buildWeekSegments(days, items);
          const rowHeight = HEADER_H + Math.max(1, laneCount) * (BAR_H + BAR_GAP) + 4;
          return (
            <div
              key={wi}
              className="relative grid grid-cols-7 border-b border-[var(--divider)]"
              style={{ minHeight: rowHeight }}
            >
              {days.map((d) => {
                const inMonth = d.getMonth() === cursor.getMonth();
                const isToday = toDateStr(d) === today;
                return (
                  <div key={d.toISOString()} className="border-r border-[var(--divider)] px-1 pt-1 last:border-r-0">
                    <span
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold"
                      style={{
                        color: !inMonth ? "var(--text-disabled)" : isToday ? "var(--accent-fg)" : "var(--text-secondary)",
                        background: isToday ? "var(--accent)" : "transparent",
                      }}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                );
              })}

              {segments.map((seg) => (
                <button
                  key={`${seg.task.id}-${seg.colStart}`}
                  onClick={() => router.push(`/tasks/${seg.task.id}`)}
                  title={seg.task.title}
                  className="absolute flex items-center overflow-hidden rounded-[3px] px-1.5 text-left text-[10px] font-semibold text-white"
                  style={{
                    left: `calc(${(seg.colStart / 7) * 100}% + 2px)`,
                    width: `calc(${((seg.colEnd - seg.colStart + 1) / 7) * 100}% - 4px)`,
                    top: HEADER_H + seg.lane * (BAR_H + BAR_GAP),
                    height: BAR_H,
                    background: taskColor(seg.task),
                  }}
                >
                  <span className="truncate">{seg.task.title}</span>
                </button>
              ))}

              {overflow > 0 && (
                <div
                  className="absolute right-1 text-[9px] font-semibold text-[var(--text-faint)]"
                  style={{ top: HEADER_H + MAX_LANES * (BAR_H + BAR_GAP) }}
                >
                  +{overflow}개 더
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
