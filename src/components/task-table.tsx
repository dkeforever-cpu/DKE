"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomFieldDef, Task, User } from "@/lib/types";
import { useStore } from "@/lib/store";
import { StatusBadge, PriorityLabel, ProgressBar } from "@/components/badges";
import { formatDateShort, formatDateFull, daysOverdue, isOverdue } from "@/lib/format";

type SortKey =
  | "status"
  | "title"
  | "category"
  | "assignee"
  | "center"
  | "priority"
  | "progress"
  | "level"
  | "createdAt"
  | "dueDate";

interface ColumnDef {
  key: string;
  label: string;
  width: string;
  sortKey?: SortKey;
  render: (t: Task, ctx: { getUser: (id: string) => User | undefined }) => React.ReactNode;
}

const BUILTIN_COLUMN_DEFS: ColumnDef[] = [
  {
    key: "status",
    label: "상태",
    width: "58px",
    sortKey: "status",
    render: (t) => <StatusBadge status={t.status} />,
  },
  {
    key: "title",
    label: "업무명",
    width: "minmax(200px,2.4fr)",
    sortKey: "title",
    render: (t) => <div className="truncate font-semibold text-[var(--text)]">{t.title}</div>,
  },
  {
    key: "category",
    label: "카테고리",
    width: "96px",
    sortKey: "category",
    render: (t) => <div className="truncate text-[var(--text-muted)]">{t.categoryLarge}</div>,
  },
  {
    key: "assignee",
    label: "담당자",
    width: "62px",
    sortKey: "assignee",
    render: (t, { getUser }) => (
      <div className="truncate text-[var(--text-muted)]">{getUser(t.assigneeId)?.name ?? "-"}</div>
    ),
  },
  {
    key: "collaborators",
    label: "협업자",
    width: "90px",
    render: (t, { getUser }) => (
      <div className="truncate text-[var(--text-muted)]">
        {t.collaboratorIds.length === 0
          ? "-"
          : t.collaboratorIds.map((id) => getUser(id)?.name ?? "?").join(", ")}
      </div>
    ),
  },
  {
    key: "center",
    label: "센터",
    width: "80px",
    sortKey: "center",
    render: (t) => <div className="truncate text-[var(--text-muted)]">{t.center}</div>,
  },
  {
    key: "priority",
    label: "우선순위",
    width: "56px",
    sortKey: "priority",
    render: (t) => <PriorityLabel priority={t.priority} />,
  },
  {
    key: "progress",
    label: "진행률",
    width: "100px",
    sortKey: "progress",
    render: (t) => <ProgressBar value={t.progress} />,
  },
  {
    key: "level",
    label: "업무레벨",
    width: "56px",
    sortKey: "level",
    render: (t) => <div className="text-[var(--text-muted)]">Lv.{t.level}</div>,
  },
  {
    key: "createdAt",
    label: "등록일",
    width: "64px",
    sortKey: "createdAt",
    render: (t) => <div className="text-[10px] text-[var(--text-faint)]">{formatDateShort(t.createdAt)}</div>,
  },
  {
    key: "dueDate",
    label: "마감일",
    width: "72px",
    sortKey: "dueDate",
    render: (t) => {
      const overdue = isOverdue(t.dueDate, t.status);
      return overdue ? (
        <span
          title={`목표일 ${formatDateFull(t.dueDate)} · ${daysOverdue(t.dueDate)}일 지남`}
          className="flex items-center gap-1 text-[10.5px] font-bold"
          style={{ color: "var(--danger)" }}
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5" />
            <path d="M12 16h.01" />
          </svg>
          {formatDateShort(t.dueDate)}
        </span>
      ) : (
        <span className="text-[10.5px] text-[var(--text-muted)]">{formatDateShort(t.dueDate)}</span>
      );
    },
  },
];

function SortCaret({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        color: active ? "var(--accent)" : "var(--text-disabled)",
        transform: dir === "asc" ? "rotate(180deg)" : "none",
      }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function TaskTable({
  tasks,
  columns,
  customFields,
  getUser,
  attachmentCount,
  commentCount,
}: {
  tasks: Task[];
  columns: string[];
  customFields: CustomFieldDef[];
  getUser: (id: string) => User | undefined;
  attachmentCount: (taskId: string) => number;
  commentCount: (taskId: string) => number;
}) {
  const router = useRouter();
  const { deleteTask } = useStore();
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const customFieldDefs: ColumnDef[] = customFields.map((f) => ({
    key: f.id,
    label: f.label,
    width: "90px",
    render: (t) => <div className="truncate text-[var(--text-muted)]">{t.customFields?.[f.id] ?? "-"}</div>,
  }));
  const allColumnDefs = [...BUILTIN_COLUMN_DEFS, ...customFieldDefs];
  const activeColumns = allColumnDefs.filter((c) => columns.includes(c.key));
  const showAttachments = columns.includes("attachments");
  const showComments = columns.includes("comments");

  const COLS = [
    "26px",
    "32px",
    ...activeColumns.map((c) => c.width),
    ...(showAttachments ? ["48px"] : []),
    ...(showComments ? ["48px"] : []),
  ].join(" ");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const withValue = tasks.map((t) => {
      let v: string | number;
      switch (sortKey) {
        case "status":
          v = t.status;
          break;
        case "title":
          v = t.title;
          break;
        case "category":
          v = t.categoryLarge;
          break;
        case "assignee":
          v = getUser(t.assigneeId)?.name ?? "";
          break;
        case "center":
          v = t.center;
          break;
        case "priority":
          v = t.priority;
          break;
        case "progress":
          v = t.progress;
          break;
        case "level":
          v = t.level;
          break;
        case "dueDate":
          v = t.dueDate;
          break;
        default:
          v = t.createdAt;
      }
      return { t, v };
    });
    withValue.sort((a, b) => {
      const cmp = a.v < b.v ? -1 : a.v > b.v ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return withValue.map((w) => w.t);
  }, [tasks, sortKey, sortDir, getUser]);

  const allSelected = sorted.length > 0 && sorted.every((t) => selected.has(t.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((t) => t.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}건의 업무를 삭제할까요? 진행 일지와 댓글도 함께 삭제됩니다.`))
      return;
    selected.forEach((id) => deleteTask(id));
    setSelected(new Set());
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
      <div
        className="grid items-center gap-1.5 border-b border-[var(--border-strong)] bg-[var(--surface-alt)] px-2 py-1.5 text-[10px] font-bold tracking-wide text-[var(--text-faint)]"
        style={{ gridTemplateColumns: COLS }}
      >
        <div className="flex justify-center">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-[13px] w-[13px]" style={{ accentColor: "var(--accent)" }} />
        </div>
        <div className="text-center">#</div>
        {activeColumns.map((col) =>
          col.sortKey ? (
            <button
              key={col.key}
              onClick={() => toggleSort(col.sortKey!)}
              className="flex items-center gap-1 text-left hover:text-[var(--text)]"
            >
              {col.label}
              <SortCaret active={sortKey === col.sortKey} dir={sortDir} />
            </button>
          ) : (
            <div key={col.key}>{col.label}</div>
          )
        )}
        {showAttachments && <div className="text-center">첨부</div>}
        {showComments && <div className="text-center">첨언</div>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <div className="flex h-32 items-center justify-center text-[11.5px] text-[var(--text-faintest)]">
            표시할 업무가 없습니다.
          </div>
        )}
        {sorted.map((t, i) => {
          const overdue = isOverdue(t.dueDate, t.status);
          const isSelected = selected.has(t.id);
          return (
            <div
              key={t.id}
              onClick={() => router.push(`/tasks/${t.id}`)}
              className="grid cursor-pointer items-center gap-1.5 border-b px-2 text-[11px]"
              style={{
                gridTemplateColumns: COLS,
                height: "var(--row-h)",
                borderColor: "var(--divider)",
                background: isSelected
                  ? "var(--accent-soft-bg)"
                  : overdue
                    ? "var(--danger-soft-bg)"
                    : i % 2 === 1
                      ? "var(--surface-alt)"
                      : "var(--surface)",
              }}
            >
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(t.id)}
                  className="h-[13px] w-[13px]"
                  style={{ accentColor: "var(--accent)" }}
                />
              </div>
              <div className="text-center text-[10px] text-[var(--text-faintest)]">{i + 1}</div>
              {activeColumns.map((col) => (
                <div key={col.key}>{col.render(t, { getUser })}</div>
              ))}
              {showAttachments && (
                <div className="text-center text-[10px] text-[var(--text-faintest)]">{attachmentCount(t.id)}</div>
              )}
              {showComments && (
                <div className="text-center text-[10px] text-[var(--text-faintest)]">{commentCount(t.id)}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-none items-center gap-2 border-t border-[var(--border)] bg-[var(--surface-alt)] px-2.5 py-1.5">
        <span className="text-[10.5px] text-[var(--text-faint)]">총 {sorted.length}건</span>
        {selected.size > 0 && (
          <span className="text-[10.5px] font-semibold" style={{ color: "var(--accent)" }}>
            {selected.size}건 선택됨
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={handleBulkDelete}
          disabled={selected.size === 0}
          className="h-6 rounded-[3px] border px-2.5 text-[10.5px] font-semibold disabled:opacity-40"
          style={{ borderColor: "var(--border-strong)", color: "var(--danger)" }}
        >
          선택삭제
        </button>
      </div>
    </div>
  );
}
