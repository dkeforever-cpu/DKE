"use client";

import { useCallback, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useRequireAuth } from "@/lib/use-require-auth";
import { useDashboardState } from "@/lib/dashboard-state";
import { AppShell } from "@/components/app-shell";
import { TaskTable } from "@/components/task-table";
import { CalendarView } from "@/components/calendar-view";
import { MobileTaskList } from "@/components/mobile-task-list";
import { TaskFormModal } from "@/components/task-form-modal";
import { CalendarEventFormModal } from "@/components/calendar-event-form-modal";
import { AdminPanel } from "@/components/admin/admin-panel";
import { CalendarEvent, Priority, Status } from "@/lib/types";
import { isOverdue } from "@/lib/format";
import { flatten } from "@/lib/checklist";

export default function DashboardPage() {
  const { ready, currentUser } = useRequireAuth();
  const { tasks, users, teams, centers, boards, customFields, logEntries, comments, calendarEvents, getUser } =
    useStore();

  const viewableTeams = useMemo(
    () => teams.filter((t) => currentUser?.viewTeamIds.includes(t.id)),
    [teams, currentUser]
  );

  const { teamTab, setTeamTab, boardId, selection, setSelection, view, adminTab } = useDashboardState();
  const [centerFilter, setCenterFilter] = useState("전체");
  const [assigneeFilter, setAssigneeFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState<"전체" | Status>("전체");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<"전체" | Priority>("전체");
  const [includeReported, setIncludeReported] = useState(true);
  const [includeTasksInCalendar, setIncludeTasksInCalendar] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const teamBoards = useMemo(
    () => (teamTab === "전체" ? [] : boards.filter((b) => b.teamId === teamTab)),
    [boards, teamTab]
  );

  // boardId holds the last explicitly clicked board; when it doesn't belong
  // to the currently selected team (e.g. right after switching teams), fall
  // back to that team's first board instead of syncing state via an effect.
  const activeBoard = teamBoards.find((b) => b.id === boardId) ?? teamBoards[0] ?? null;
  const visibleColumns =
    activeBoard?.visibleColumns ?? [
      "taskNumber",
      "status",
      "title",
      "category",
      "assignee",
      "center",
      "priority",
      "progress",
      "createdAt",
      "dueDate",
      "attachments",
      "comments",
      "reported",
    ];

  const attachmentCount = (taskId: string) => {
    const taskLogEntries = logEntries.filter((l) => l.taskId === taskId);
    const logCount = taskLogEntries.reduce((sum, l) => sum + (l.attachments ?? []).length, 0);
    // 업무 메모/필요 업무 댓글에 달린 첨부파일도 함께 센다(업무 상세의
    // "전체 첨부파일" 목록과 동일한 기준).
    const logIds = new Set(taskLogEntries.map((l) => l.id));
    const task = tasks.find((t) => t.id === taskId);
    const checklistIds = new Set(flatten(task?.checklist ?? []).map((i) => i.id));
    const commentAttachmentCount = comments
      .filter(
        (c) =>
          (c.targetType === "log" && logIds.has(c.targetId)) ||
          (c.targetType === "checklist" && checklistIds.has(c.targetId))
      )
      .reduce((sum, c) => sum + (c.attachments ?? []).length, 0);
    return logCount + commentAttachmentCount;
  };

  const commentCount = (taskId: string) => {
    const logIds = new Set(logEntries.filter((l) => l.taskId === taskId).map((l) => l.id));
    const task = tasks.find((t) => t.id === taskId);
    const checklistIds = new Set(flatten(task?.checklist ?? []).map((i) => i.id));
    return comments.filter(
      (c) =>
        (c.targetType === "log" && logIds.has(c.targetId)) ||
        (c.targetType === "checklist" && checklistIds.has(c.targetId))
    ).length;
  };

  const teamTasks = useMemo(
    () => (teamTab === "전체" ? tasks : tasks.filter((t) => t.teamId === teamTab)),
    [tasks, teamTab]
  );

  // "내 업무"는 담당자로 지정된 업무뿐 아니라 협업자로 지정된 업무도
  // 포함한다 — 협업자도 그 업무를 함께 관리하는 사람이니 자기 업무 목록에
  // 안 보이면 놓치기 쉽다.
  const isMine = useCallback(
    (t: { assigneeId: string; collaboratorIds: string[] }) =>
      t.assigneeId === currentUser?.id || t.collaboratorIds.includes(currentUser?.id ?? ""),
    [currentUser]
  );
  const mineCount = teamTasks.filter(isMine).length;
  const allCount = teamTasks.length;

  const scoped = useMemo(() => {
    if (selection.type === "mine") return teamTasks.filter(isMine);
    if (selection.type === "category")
      return teamTasks.filter((t) => t.categoryLarge === selection.large);
    return teamTasks;
  }, [teamTasks, selection, isMine]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((t) => {
      if (centerFilter !== "전체" && t.center !== centerFilter) return false;
      if (assigneeFilter !== "전체" && t.assigneeId !== assigneeFilter) return false;
      if (statusFilter !== "전체" && t.status !== statusFilter) return false;
      if (overdueOnly && !isOverdue(t.dueDate, t.status)) return false;
      if (priorityFilter !== "전체" && t.priority !== priorityFilter) return false;
      if (!includeReported && t.reported) return false;
      if (q) {
        const haystack = [
          t.title,
          t.description,
          t.categoryLarge,
          t.categoryMedium,
          t.center,
          getUser(t.assigneeId)?.name ?? "",
          ...t.collaboratorIds.map((id) => getUser(id)?.name ?? ""),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    scoped,
    centerFilter,
    assigneeFilter,
    statusFilter,
    overdueOnly,
    priorityFilter,
    includeReported,
    search,
    getUser,
  ]);

  // 캘린더의 '일정 등록'으로 만든 항목은 업무와 달리 담당자 필드가 없다 —
  // 등록한 사람을 담당자로 보고, 상단 '담당자' 필터가 이 일정에도 걸리도록
  // 한다(등록자=담당자로 취급하기로 확정).
  const filteredEvents = useMemo(() => {
    if (assigneeFilter === "전체") return calendarEvents;
    return calendarEvents.filter((ev) => ev.createdBy === assigneeFilter);
  }, [calendarEvents, assigneeFilter]);

  const summary = useMemo(() => {
    const base = scoped;
    return {
      total: base.length,
      진행중: base.filter((t) => t.status === "진행중").length,
      검토중: base.filter((t) => t.status === "검토중").length,
      완료: base.filter((t) => t.status === "완료").length,
      연체: base.filter((t) => isOverdue(t.dueDate, t.status)).length,
    };
  }, [scoped]);

  function handleTeamChange(next: string) {
    setTeamTab(next);
    setSelection({ type: "all" });
  }

  // 요약 건수(진행중/검토중/완료/마감 연체)를 눌렀을 때 그 상태의 업무만
  // 걸러서 보여준다 — 이미 같은 조건이 걸려있으면 다시 눌러서 해제한다.
  function toggleStatusFilter(status: Status) {
    setOverdueOnly(false);
    setStatusFilter((prev) => (prev === status ? "전체" : status));
  }
  function toggleOverdueOnly() {
    setStatusFilter("전체");
    setOverdueOnly((prev) => !prev);
  }
  function clearSummaryFilter() {
    setStatusFilter("전체");
    setOverdueOnly(false);
  }

  if (!ready || !currentUser) return null;

  const teamName = teams.find((t) => t.id === teamTab)?.name ?? "전체";
  const selectionLabel =
    selection.type === "mine" ? "내 업무" : selection.type === "all" ? "전체 업무" : selection.large;
  // 팀을 특정해서 고르지 않았을 때는 "전체 · 전체 업무"처럼 "전체"가
  // 중복 표시되니, 그럴 때는 선택 라벨만 보여준다.
  const summaryTitle = teamName === "전체" ? selectionLabel : `${teamName} · ${selectionLabel}`;

  return (
    <AppShell>
      {view === "admin" && currentUser.isAdmin ? (
        <AdminPanel tab={adminTab} />
      ) : (
        <>
      <div className="flex h-8 flex-none items-center gap-0.5 border-b border-[var(--border)] bg-[var(--surface)] px-3">
        <button
          onClick={() => handleTeamChange("전체")}
          className="h-6 rounded-[3px] px-3 text-[11.5px] font-semibold"
          style={
            teamTab === "전체"
              ? { background: "var(--accent)", color: "var(--accent-fg)" }
              : { color: "var(--text-muted)" }
          }
        >
          전체
        </button>
        {viewableTeams.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTeamChange(t.id)}
            className="h-6 rounded-[3px] px-3 text-[11.5px] font-semibold"
            style={
              teamTab === t.id
                ? { background: "var(--accent)", color: "var(--accent-fg)" }
                : { color: "var(--text-muted)" }
            }
          >
            {t.name}
          </button>
        ))}
      </div>

      <MobileTaskList
        className="dashboard-mobile-pane"
        tasks={filtered}
        getUser={getUser}
        selection={selection}
        onSelectionChange={setSelection}
        mineCount={mineCount}
        allCount={allCount}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        centerFilter={centerFilter}
        onCenterFilterChange={setCenterFilter}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        users={users}
        centers={centers}
        onOpenNewTask={() => setFormOpen(true)}
        events={filteredEvents}
        onOpenEvent={setEditingEvent}
        onOpenNewEvent={() => setEventFormOpen(true)}
      />

      <div className="dashboard-desktop-pane flex-1 flex-col gap-1.5 overflow-hidden p-2">
        <div className="flex items-center gap-0 border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
          <SummaryCell
            label={summaryTitle}
            value={summary.total}
            active={statusFilter === "전체" && !overdueOnly}
            onClick={clearSummaryFilter}
          />
          <Divider />
          <SummaryCell
            label="진행중"
            value={summary.진행중}
            color="var(--accent)"
            active={statusFilter === "진행중"}
            onClick={() => toggleStatusFilter("진행중")}
          />
          <Divider />
          <SummaryCell
            label="검토중"
            value={summary.검토중}
            color="var(--warning-text)"
            active={statusFilter === "검토중"}
            onClick={() => toggleStatusFilter("검토중")}
          />
          <Divider />
          <SummaryCell
            label="완료"
            value={summary.완료}
            color="var(--success)"
            active={statusFilter === "완료"}
            onClick={() => toggleStatusFilter("완료")}
          />
          <Divider />
          <SummaryCell
            label="마감 연체"
            value={summary.연체}
            color="var(--danger)"
            labelColor="var(--danger-text)"
            active={overdueOnly}
            onClick={toggleOverdueOnly}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={centerFilter}
            onChange={(e) => setCenterFilter(e.target.value)}
            className="h-6 border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[10.5px] text-[var(--text-muted)]"
          >
            <option value="전체">센터 전체</option>
            {centers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-6 border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[10.5px] text-[var(--text-muted)]"
          >
            <option value="전체">담당자 전체</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "전체" | Status)}
            className="h-6 border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[10.5px] text-[var(--text-muted)]"
          >
            <option value="전체">상태 전체</option>
            {(["대기", "진행중", "검토중", "완료"] as Status[]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as "전체" | Priority)}
            className="h-6 border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[10.5px] text-[var(--text-muted)]"
          >
            <option value="전체">우선순위 전체</option>
            {(["높음", "보통", "낮음"] as Priority[]).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="업무명·설명·카테고리·담당자·센터 검색"
            className="h-6 w-[180px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[10.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={() => setIncludeReported((v) => !v)}
            className="h-6 rounded-[2px] border px-2 text-[10.5px] font-semibold"
            style={
              includeReported
                ? { borderColor: "var(--border-strong)", color: "var(--text-muted)", background: "var(--surface)" }
                : { borderColor: "var(--accent)", color: "var(--accent-fg)", background: "var(--accent)" }
            }
            title="보고완료 업무를 목록에 표시할지 전환합니다"
          >
            {includeReported ? "보고완료 포함" : "보고완료 제외"}
          </button>
          {view === "calendar" && (
            <button
              onClick={() => setIncludeTasksInCalendar((v) => !v)}
              className="h-6 rounded-[2px] border px-2 text-[10.5px] font-semibold"
              style={
                includeTasksInCalendar
                  ? { borderColor: "var(--border-strong)", color: "var(--text-muted)", background: "var(--surface)" }
                  : { borderColor: "var(--accent)", color: "var(--accent-fg)", background: "var(--accent)" }
              }
              title="캘린더에 업무 시작일·마감일도 함께 표시할지 전환합니다"
            >
              {includeTasksInCalendar ? "업무일정포함" : "등록일정만"}
            </button>
          )}
          <div className="flex-1" />
          {view === "calendar" ? (
            <button
              onClick={() => setEventFormOpen(true)}
              className="flex h-6 items-center gap-1 rounded-[3px] px-2.5 text-[10.5px] font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              일정 등록
            </button>
          ) : (
            <button
              onClick={() => setFormOpen(true)}
              className="flex h-6 items-center gap-1 rounded-[3px] px-2.5 text-[10.5px] font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              새 업무
            </button>
          )}
        </div>

        {view === "calendar" ? (
          <CalendarView
            tasks={filtered}
            events={filteredEvents}
            includeTasks={includeTasksInCalendar}
            onOpenEvent={setEditingEvent}
          />
        ) : (
          <TaskTable
            tasks={filtered}
            columns={visibleColumns}
            customFields={customFields}
            getUser={getUser}
            attachmentCount={attachmentCount}
            commentCount={commentCount}
          />
        )}
      </div>
        </>
      )}

      {formOpen && (
        <TaskFormModal
          mode="create"
          initialTeamId={teamTab === "전체" ? currentUser.teamId : teamTab}
          onClose={() => setFormOpen(false)}
          onSaved={() => setFormOpen(false)}
        />
      )}

      {eventFormOpen && <CalendarEventFormModal mode="create" onClose={() => setEventFormOpen(false)} />}
      {editingEvent && (
        <CalendarEventFormModal mode="edit" event={editingEvent} onClose={() => setEditingEvent(null)} />
      )}
    </AppShell>
  );
}

function SummaryCell({
  label,
  value,
  color = "var(--text)",
  labelColor = "var(--text-faint)",
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  color?: string;
  labelColor?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={onClick ? "눌러서 이 상태의 업무만 보기 (다시 누르면 해제)" : undefined}
      className="flex items-baseline gap-1.5 rounded-[3px] px-3.5 py-0.5 first:pl-0 last:pr-0 hover:bg-[var(--surface-alt)]"
      style={active ? { background: "var(--accent-soft-bg)" } : undefined}
    >
      <span className="text-[10.5px]" style={{ color: active ? "var(--accent-soft-fg)" : labelColor }}>
        {label}
      </span>
      <span className="text-[13px] font-bold" style={{ color: active ? "var(--accent-soft-fg)" : color }}>
        {value}
      </span>
    </button>
  );
}

function Divider() {
  return <div className="h-3 w-px bg-[var(--divider)]" />;
}
