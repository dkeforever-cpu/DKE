"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CENTERS } from "@/lib/categories";
import { Priority, Status, Task, User } from "@/lib/types";
import { StatusBadge, PriorityLabel } from "@/components/badges";
import { formatDateShort, daysOverdue, isOverdue } from "@/lib/format";
import { Selection, selectionKey } from "@/components/sidebar";
import { CalendarView } from "@/components/calendar-view";

const STATUSES: Status[] = ["대기", "진행중", "검토중", "완료"];
const PRIORITIES: Priority[] = ["높음", "보통", "낮음"];

export function MobileTaskList({
  className = "",
  tasks,
  getUser,
  selection,
  onSelectionChange,
  mineCount,
  allCount,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  centerFilter,
  onCenterFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  users,
  onOpenNewTask,
}: {
  className?: string;
  tasks: Task[];
  getUser: (id: string) => User | undefined;
  selection: Selection;
  onSelectionChange: (s: Selection) => void;
  mineCount: number;
  allCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: "전체" | Status;
  onStatusFilterChange: (v: "전체" | Status) => void;
  centerFilter: string;
  onCenterFilterChange: (v: string) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (v: string) => void;
  priorityFilter: "전체" | Priority;
  onPriorityFilterChange: (v: "전체" | Priority) => void;
  users: User[];
  onOpenNewTask: () => void;
}) {
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const currentKey = selectionKey(selection);
  const activeExtraFilters = [centerFilter, assigneeFilter, priorityFilter].filter(
    (v) => v !== "전체"
  ).length;

  return (
    <div className={`flex-1 flex-col overflow-hidden ${className}`}>
      <div className="flex flex-none items-center gap-1.5 border-b border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
        <button
          onClick={() => onSelectionChange({ type: "mine" })}
          className="h-7 flex-1 rounded-[4px] text-[12px] font-semibold"
          style={
            currentKey === "mine"
              ? { background: "var(--accent)", color: "var(--accent-fg)" }
              : { background: "var(--surface-alt)", color: "var(--text-muted)" }
          }
        >
          내 업무 {mineCount}
        </button>
        <button
          onClick={() => onSelectionChange({ type: "all" })}
          className="h-7 flex-1 rounded-[4px] text-[12px] font-semibold"
          style={
            currentKey === "all"
              ? { background: "var(--accent)", color: "var(--accent-fg)" }
              : { background: "var(--surface-alt)", color: "var(--text-muted)" }
          }
        >
          전체 업무 {allCount}
        </button>
      </div>

      <div className="flex flex-none flex-col gap-1.5 border-b border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="업무 검색"
            className="h-8 flex-1 rounded-[4px] border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={() => setShowCalendar((v) => !v)}
            title="캘린더 보기"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-[4px] border text-[var(--text-muted)]"
            style={
              showCalendar
                ? { borderColor: "var(--accent)", background: "var(--accent-soft-bg)", color: "var(--accent-soft-fg)" }
                : { borderColor: "var(--border-strong)" }
            }
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4.5" width="18" height="16" rx="1.5" />
              <path d="M3 9.5h18M8 3v3M16 3v3" />
            </svg>
          </button>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="relative flex h-8 w-8 flex-none items-center justify-center rounded-[4px] border border-[var(--border-strong)] text-[var(--text-muted)]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            {activeExtraFilters > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                {activeExtraFilters}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          {(["전체", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => onStatusFilterChange(s)}
              className="h-6 flex-none rounded-full border px-2.5 text-[10.5px] font-semibold"
              style={
                statusFilter === s
                  ? { borderColor: "var(--accent)", background: "var(--accent-soft-bg)", color: "var(--accent-soft-fg)" }
                  : { borderColor: "var(--border-strong)", color: "var(--text-muted)" }
              }
            >
              {s}
            </button>
          ))}
        </div>

        {filtersOpen && (
          <div className="flex flex-col gap-1.5 pt-0.5">
            <select
              value={centerFilter}
              onChange={(e) => onCenterFilterChange(e.target.value)}
              className="h-8 rounded-[4px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[12px] text-[var(--text-muted)]"
            >
              <option value="전체">센터 전체</option>
              {CENTERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={assigneeFilter}
              onChange={(e) => onAssigneeFilterChange(e.target.value)}
              className="h-8 rounded-[4px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[12px] text-[var(--text-muted)]"
            >
              <option value="전체">담당자 전체</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => onPriorityFilterChange(e.target.value as "전체" | Priority)}
              className="h-8 rounded-[4px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[12px] text-[var(--text-muted)]"
            >
              <option value="전체">우선순위 전체</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {showCalendar ? (
        <div className="flex flex-1 flex-col overflow-hidden p-1.5">
          <CalendarView tasks={tasks} />
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-[12px] text-[var(--text-faintest)]">
            표시할 업무가 없습니다.
          </div>
        ) : (
          tasks.map((t) => {
            const assignee = getUser(t.assigneeId);
            const creator = getUser(t.createdBy);
            const distinctCreator = creator && t.createdBy !== t.assigneeId;
            const assigneeLabel = distinctCreator
              ? `${assignee?.name ?? "-"}/${creator.name}`
              : assignee?.name ?? "-";
            const overdue = isOverdue(t.dueDate, t.status);
            return (
              <button
                key={t.id}
                onClick={() => router.push(`/tasks/${t.id}`)}
                className="flex w-full flex-col gap-1.5 border-b px-3 py-3 text-left"
                style={{
                  borderColor: "var(--divider)",
                  background: overdue ? "var(--danger-soft-bg)" : "var(--surface)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={t.status} />
                  <PriorityLabel priority={t.priority} />
                  <div className="flex-1" />
                  {overdue ? (
                    <span className="text-[10.5px] font-bold" style={{ color: "var(--danger)" }}>
                      {formatDateShort(t.dueDate)} · {daysOverdue(t.dueDate)}일 지남
                    </span>
                  ) : (
                    <span className="text-[10.5px] text-[var(--text-faint)]">{formatDateShort(t.dueDate)}</span>
                  )}
                </div>
                <div className="text-[13.5px] font-semibold leading-snug text-[var(--text)]">{t.title}</div>
                <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                  <span className="truncate">{t.categoryLarge}</span>
                  <span className="text-[var(--text-disabled)]">·</span>
                  <span
                    className="flex-none truncate"
                    title={distinctCreator ? `담당자: ${assignee?.name ?? "-"} / 지정자: ${creator.name}` : undefined}
                  >
                    {assigneeLabel}
                  </span>
                  <span className="text-[var(--text-disabled)]">·</span>
                  <span className="flex-none">{t.center}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${t.progress}%`,
                        background: t.progress === 0 ? "var(--text-disabled)" : "var(--accent)",
                      }}
                    />
                  </div>
                  <span className="text-[10.5px] text-[var(--text-faint)]">{t.progress}%</span>
                </div>
              </button>
            );
          })
        )}
      </div>
      )}

      <button
        onClick={onOpenNewTask}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg"
        style={{ background: "var(--accent)", color: "var(--accent-fg)", boxShadow: "var(--shadow-menu)" }}
        title="새 업무 등록"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
