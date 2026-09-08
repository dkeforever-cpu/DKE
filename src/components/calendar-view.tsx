"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarEvent, Task } from "@/lib/types";
import { taskColor, buildMonthGrid, parseDateStr, toDateStr } from "@/lib/calendar";
import { todayStr } from "@/lib/format";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_ROWS_PER_DAY = 4;
const ITEM_H = 15;

type Role = "start" | "due";

type DayItem = { kind: "task"; task: Task; role: Role } | { kind: "event"; event: CalendarEvent };

interface Range {
  task: Task;
  start: Date;
  end: Date;
}

interface EventRange {
  event: CalendarEvent;
  start: Date;
  end: Date;
}

// 업무는 시작일·마감일 이틀만 표시한다(그 사이 날짜는 "아직 진행 중"이라는
// 것 외에 정보가 없고, 여러 명이 동시에 업무를 여러 개 갖고 있으면 칸만
// 복잡해진다) — 반면 등록한 일정은 기간 전체를 매일 같은 색으로 표시해서
// 하나의 이어진 막대처럼 보이게 한다(휴가·출장처럼 "이 기간 통째로"가
// 핵심 정보이기 때문).
function itemsForDay(day: Date, taskRanges: Range[], eventRanges: EventRange[], includeTasks: boolean): DayItem[] {
  const t = day.getTime();
  const list: DayItem[] = [];
  for (const r of eventRanges) {
    if (t >= r.start.getTime() && t <= r.end.getTime()) list.push({ kind: "event", event: r.event });
  }
  if (includeTasks) {
    for (const r of taskRanges) {
      if (t === r.start.getTime()) list.push({ kind: "task", task: r.task, role: "start" });
      else if (t === r.end.getTime()) list.push({ kind: "task", task: r.task, role: "due" });
    }
  }
  const rolePriority: Record<Role, number> = { start: 0, due: 1 };
  list.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "event" ? -1 : 1;
    if (a.kind === "task" && b.kind === "task") {
      return rolePriority[a.role] - rolePriority[b.role] || a.task.dueDate.localeCompare(b.task.dueDate);
    }
    return 0;
  });
  return list;
}

export function CalendarView({
  tasks,
  events,
  includeTasks,
  onOpenEvent,
}: {
  tasks: Task[];
  events: CalendarEvent[];
  includeTasks: boolean;
  onOpenEvent: (event: CalendarEvent) => void;
}) {
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

  const eventRanges = useMemo<EventRange[]>(
    () =>
      events.map((ev) => {
        const start = parseDateStr(ev.startDate);
        let end = parseDateStr(ev.endDate);
        if (end < start) end = start;
        return { event: ev, start, end };
      }),
    [events]
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
              const dayItems = itemsForDay(d, ranges, eventRanges, includeTasks);
              const visible = dayItems.slice(0, MAX_ROWS_PER_DAY);
              const overflow = dayItems.length - visible.length;
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

                  {visible.map((item) =>
                    item.kind === "event" ? (
                      <EventChip
                        key={`ev_${item.event.id}`}
                        event={item.event}
                        onOpen={() => onOpenEvent(item.event)}
                      />
                    ) : item.role === "start" ? (
                      <StartChip key={item.task.id} task={item.task} onOpen={() => openTask(item.task.id)} />
                    ) : (
                      <DueChip key={item.task.id} task={item.task} onOpen={() => openTask(item.task.id)} />
                    )
                  )}
                  {overflow > 0 && (
                    <div className="text-[9px] font-semibold text-[var(--text-faint)]">+{overflow}개 더</div>
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

// 업무 칩은 업무마다 색이 달라지지만, 등록된 일정은 항상 같은 색으로
// 표시해서 같은 색이 이어지는 것만으로 "이 기간 전체가 하나의 일정"임을
// 한눈에 알아볼 수 있게 한다.
function EventChip({ event, onOpen }: { event: CalendarEvent; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      title={event.title}
      className="flex items-center overflow-hidden rounded-[2px] px-1 text-left text-[10px] font-semibold"
      style={{ background: "var(--accent)", color: "var(--accent-fg)", height: ITEM_H }}
    >
      <span className="truncate">{event.title}</span>
    </button>
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

function DueChip({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const color = taskColor(task);
  return (
    <button
      onClick={onOpen}
      title={`${task.title} (마감)`}
      className="flex items-center gap-1 overflow-hidden border-l-2 pl-1 text-left text-[10px]"
      style={{ borderColor: color, height: ITEM_H }}
    >
      <span className="flex-none font-bold leading-none" style={{ color }}>■마감</span>
      <span className="truncate text-[var(--text-secondary)]">{task.title}</span>
    </button>
  );
}
