"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useRequireAuth } from "@/lib/use-require-auth";
import { TopBar } from "@/components/top-bar";
import { Sidebar, Selection } from "@/components/sidebar";
import { TaskTable } from "@/components/task-table";
import { TaskFormModal } from "@/components/task-form-modal";
import { CENTERS } from "@/lib/categories";
import { Dept, Priority, Status } from "@/lib/types";
import { isOverdue } from "@/lib/format";
import { flatten } from "@/lib/checklist";

type DeptTab = "전체" | Dept;

export default function DashboardPage() {
  const { ready, currentUser } = useRequireAuth();
  const { tasks, users, logEntries, comments, getUser } = useStore();

  const [deptTab, setDeptTab] = useState<DeptTab>("전체");
  const [selection, setSelection] = useState<Selection>({ type: "all" });
  const [centerFilter, setCenterFilter] = useState("전체");
  const [assigneeFilter, setAssigneeFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState<"전체" | Status>("전체");
  const [priorityFilter, setPriorityFilter] = useState<"전체" | Priority>("전체");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const attachmentCount = (taskId: string) =>
    logEntries
      .filter((l) => l.taskId === taskId)
      .reduce((sum, l) => sum + l.attachments.length, 0);

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

  const deptTasks = useMemo(
    () => (deptTab === "전체" ? tasks : tasks.filter((t) => t.dept === deptTab)),
    [tasks, deptTab]
  );

  const mineCount = deptTasks.filter((t) => t.assigneeId === currentUser?.id).length;
  const allCount = deptTasks.length;
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of deptTasks) map[t.categoryLarge] = (map[t.categoryLarge] ?? 0) + 1;
    return map;
  }, [deptTasks]);

  const scoped = useMemo(() => {
    if (selection.type === "mine") return deptTasks.filter((t) => t.assigneeId === currentUser?.id);
    if (selection.type === "category")
      return deptTasks.filter((t) => t.categoryLarge === selection.large);
    return deptTasks;
  }, [deptTasks, selection, currentUser]);

  const filtered = useMemo(() => {
    return scoped.filter((t) => {
      if (centerFilter !== "전체" && t.center !== centerFilter) return false;
      if (assigneeFilter !== "전체" && t.assigneeId !== assigneeFilter) return false;
      if (statusFilter !== "전체" && t.status !== statusFilter) return false;
      if (priorityFilter !== "전체" && t.priority !== priorityFilter) return false;
      if (search.trim() && !t.title.toLowerCase().includes(search.trim().toLowerCase()))
        return false;
      return true;
    });
  }, [scoped, centerFilter, assigneeFilter, statusFilter, priorityFilter, search]);

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

  function handleDeptChange(next: DeptTab) {
    setDeptTab(next);
    setSelection({ type: "all" });
  }

  if (!ready || !currentUser) return null;

  const selectionLabel =
    selection.type === "mine" ? "내 업무" : selection.type === "all" ? "전체 업무" : selection.large;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />

      <div className="flex h-11 flex-none items-center gap-1 border-b border-[#e3e5e9] bg-white px-5">
        {(["전체", "관리팀", "재경팀"] as DeptTab[]).map((d) => (
          <button
            key={d}
            onClick={() => handleDeptChange(d)}
            className={`rounded-md px-3.5 py-1.5 text-[12.5px] font-semibold ${
              deptTab === d ? "bg-[#23262e] text-white" : "text-[#5b6068] hover:bg-[#f5f6f8]"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          dept={deptTab}
          selection={selection}
          onSelect={setSelection}
          mineCount={mineCount}
          allCount={allCount}
          categoryCounts={categoryCounts}
        />

        <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
          <div className="flex items-center gap-0 rounded-lg border border-[#e3e5e9] bg-white px-[18px] py-2.5">
            <SummaryCell label={`${deptTab === "전체" ? "전체" : deptTab} · ${selectionLabel}`} value={summary.total} />
            <Divider />
            <SummaryCell label="진행중" value={summary.진행중} color="#3355d6" />
            <Divider />
            <SummaryCell label="검토중" value={summary.검토중} color="#b06a00" />
            <Divider />
            <SummaryCell label="완료" value={summary.완료} color="#1f8a4c" />
            <Divider />
            <SummaryCell label="마감 연체" value={summary.연체} color="#d92d20" labelColor="#c0392b" />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
              className="h-[30px] rounded-md border border-[#d7dbe0] bg-white px-2 text-[11.5px] text-[#5b6068]"
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
              className="h-[30px] rounded-md border border-[#d7dbe0] bg-white px-2 text-[11.5px] text-[#5b6068]"
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
              className="h-[30px] rounded-md border border-[#d7dbe0] bg-white px-2 text-[11.5px] text-[#5b6068]"
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
              className="h-[30px] rounded-md border border-[#d7dbe0] bg-white px-2 text-[11.5px] text-[#5b6068]"
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
              placeholder="업무 검색"
              className="h-[30px] w-[200px] rounded-md border border-[#d7dbe0] px-2.5 text-[11.5px] outline-none focus:border-[#3355d6]"
            />
            <div className="flex-1" />
            <button
              onClick={() => setFormOpen(true)}
              className="flex h-[30px] items-center gap-1.5 rounded-md bg-[#23262e] px-3 text-[11.5px] font-semibold text-white"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              새 업무
            </button>
          </div>

          <TaskTable
            tasks={filtered}
            getUser={getUser}
            attachmentCount={attachmentCount}
            commentCount={commentCount}
          />
        </div>
      </div>

      {formOpen && (
        <TaskFormModal
          mode="create"
          initialDept={deptTab === "전체" ? "관리팀" : deptTab}
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
  color = "#1a1d24",
  labelColor = "#8a8f99",
}: {
  label: string;
  value: number;
  color?: string;
  labelColor?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5 px-5 first:pl-0 last:pr-0">
      <span className="text-[11px]" style={{ color: labelColor }}>
        {label}
      </span>
      <span className="text-[15px] font-bold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="h-4 w-px bg-[#eef0f2]" />;
}
