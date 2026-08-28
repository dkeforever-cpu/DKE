"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useRequireAuth } from "@/lib/use-require-auth";
import { TopBar } from "@/components/top-bar";
import { Sidebar, Selection } from "@/components/sidebar";
import { TaskTable } from "@/components/task-table";
import { CalendarView } from "@/components/calendar-view";
import { MobileTaskList } from "@/components/mobile-task-list";
import { TaskFormModal } from "@/components/task-form-modal";
import { CENTERS } from "@/lib/categories";
import { Priority, Status } from "@/lib/types";
import { isOverdue } from "@/lib/format";
import { flatten } from "@/lib/checklist";

export default function DashboardPage() {
  const { ready, currentUser } = useRequireAuth();
  const { tasks, users, teams, categoriesByTeam, boards, customFields, logEntries, comments, getUser } =
    useStore();

  const viewableTeams = useMemo(
    () => teams.filter((t) => currentUser?.viewTeamIds.includes(t.id)),
    [teams, currentUser]
  );

  const [teamTab, setTeamTab] = useState<string>("전체"); // "전체" or a team id
  const [boardId, setBoardId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ type: "all" });
  const [view, setView] = useState<"list" | "calendar">("list");
  const [centerFilter, setCenterFilter] = useState("전체");
  const [assigneeFilter, setAssigneeFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState<"전체" | Status>("전체");
  const [priorityFilter, setPriorityFilter] = useState<"전체" | Priority>("전체");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

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
    ];

  const attachmentCount = (taskId: string) =>
    logEntries
      .filter((l) => l.taskId === taskId)
      .reduce((sum, l) => sum + (l.attachments ?? []).length, 0);

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

  const mineCount = teamTasks.filter((t) => t.assigneeId === currentUser?.id).length;
  const allCount = teamTasks.length;
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of teamTasks) map[t.categoryLarge] = (map[t.categoryLarge] ?? 0) + 1;
    return map;
  }, [teamTasks]);

  const scoped = useMemo(() => {
    if (selection.type === "mine") return teamTasks.filter((t) => t.assigneeId === currentUser?.id);
    if (selection.type === "category")
      return teamTasks.filter((t) => t.categoryLarge === selection.large);
    return teamTasks;
  }, [teamTasks, selection, currentUser]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((t) => {
      if (centerFilter !== "전체" && t.center !== centerFilter) return false;
      if (assigneeFilter !== "전체" && t.assigneeId !== assigneeFilter) return false;
      if (statusFilter !== "전체" && t.status !== statusFilter) return false;
      if (priorityFilter !== "전체" && t.priority !== priorityFilter) return false;
      if (q) {
        const haystack = [
          t.title,
          t.description,
          t.categoryLarge,
          t.categoryMedium,
          t.categorySmall,
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
  }, [scoped, centerFilter, assigneeFilter, statusFilter, priorityFilter, search, getUser]);

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

  function handleSelect(s: Selection) {
    setView("list");
    setSelection(s);
  }

  function handleSelectBoard(id: string) {
    setView("list");
    setBoardId(id);
  }

  if (!ready || !currentUser) return null;

  const teamName = teams.find((t) => t.id === teamTab)?.name ?? "전체";
  const selectionLabel =
    selection.type === "mine" ? "내 업무" : selection.type === "all" ? "전체 업무" : selection.large;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />

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
        onOpenNewTask={() => setFormOpen(true)}
      />

      <div className="dashboard-desktop-pane flex-1 overflow-hidden">
        <Sidebar
          teamSelected={teamTab !== "전체"}
          categories={teamTab === "전체" ? [] : categoriesByTeam[teamTab] ?? []}
          boards={teamBoards}
          activeBoardId={activeBoard?.id ?? null}
          onSelectBoard={handleSelectBoard}
          selection={selection}
          onSelect={handleSelect}
          mineCount={mineCount}
          allCount={allCount}
          categoryCounts={categoryCounts}
          calendarActive={view === "calendar"}
          onOpenCalendar={() => setView("calendar")}
        />

        <div className="flex flex-1 flex-col gap-1.5 overflow-hidden p-2">
          <div className="flex items-center gap-0 border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
            <SummaryCell label={`${teamName} · ${selectionLabel}`} value={summary.total} />
            <Divider />
            <SummaryCell label="진행중" value={summary.진행중} color="var(--accent)" />
            <Divider />
            <SummaryCell label="검토중" value={summary.검토중} color="var(--warning-text)" />
            <Divider />
            <SummaryCell label="완료" value={summary.완료} color="var(--success)" />
            <Divider />
            <SummaryCell label="마감 연체" value={summary.연체} color="var(--danger)" labelColor="var(--danger-text)" />
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
              className="h-6 border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[10.5px] text-[var(--text-muted)]"
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
            <div className="flex-1" />
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
          </div>

          {view === "calendar" ? (
            <CalendarView tasks={filtered} />
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
      </div>

      {formOpen && (
        <TaskFormModal
          mode="create"
          initialTeamId={teamTab === "전체" ? currentUser.teamId : teamTab}
          onClose={() => setFormOpen(false)}
          onSaved={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}

function SummaryCell({
  label,
  value,
  color = "var(--text)",
  labelColor = "var(--text-faint)",
}: {
  label: string;
  value: number;
  color?: string;
  labelColor?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5 px-3.5 first:pl-0 last:pr-0">
      <span className="text-[10.5px]" style={{ color: labelColor }}>
        {label}
      </span>
      <span className="text-[13px] font-bold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="h-3 w-px bg-[var(--divider)]" />;
}
