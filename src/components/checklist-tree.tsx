"use client";

import { useEffect, useState } from "react";
import { ChecklistItem, Comment, User } from "@/lib/types";
import { flatten } from "@/lib/checklist";
import { CommentList } from "@/components/comment-thread";
import { daysOverdue, formatDateShort, formatDateTime } from "@/lib/format";

interface CommentProps {
  comments: Comment[];
  getUser: (id: string) => User | undefined;
  canEdit: (authorId: string) => boolean;
  currentUserId: string;
  onAddComment: (itemId: string, content: string, attachments: string[]) => void;
  onUpdateComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
}

interface ExpandSignal {
  expand: boolean;
  token: number;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--text-faint)"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 120ms" }}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-faintest)" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CalendarIcon({ color = "var(--text-faintest)" }: { color?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function progressColor(v: number) {
  if (v >= 100) return "var(--success)";
  if (v === 0) return "var(--text-disabled)";
  return "var(--accent)";
}

export function ChecklistTree({
  items,
  onAdd,
  onUpdate,
  onDelete,
  commentProps,
  readOnly = false,
}: {
  items: ChecklistItem[];
  onAdd: (parentId: string | null, label: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<ChecklistItem, "label" | "progress" | "dueDate">>) => void;
  onDelete: (id: string) => void;
  commentProps: CommentProps;
  readOnly?: boolean;
}) {
  const all = flatten(items);
  const avg = all.length
    ? Math.round(all.reduce((sum, i) => sum + i.progress, 0) / all.length)
    : 0;

  const [expandSignal, setExpandSignal] = useState<ExpandSignal | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="text-[12px] font-bold text-[var(--text)]">필요 업무</div>
        {all.length > 0 && (
          <span className="text-[10px] text-[var(--text-faintest)]">
            {all.length}개 항목 · 평균 {avg}%
          </span>
        )}
        {all.length > 0 && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() =>
                setExpandSignal((prev) => ({ expand: true, token: (prev?.token ?? 0) + 1 }))
              }
              className="h-5 rounded-[3px] border border-[var(--border-strong)] px-1.5 text-[9.5px] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              전체 펴기
            </button>
            <button
              onClick={() =>
                setExpandSignal((prev) => ({ expand: false, token: (prev?.token ?? 0) + 1 }))
              }
              className="h-5 rounded-[3px] border border-[var(--border-strong)] px-1.5 text-[9.5px] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              전체 접기
            </button>
          </div>
        )}
      </div>
      <div className="text-[9.5px] text-[var(--text-faintest)]">
        행 왼쪽의 화살표를 눌러 펼치면 하위 항목과 댓글을 볼 수 있어요 (엑셀 그룹 접기/펼치기와
        같은 방식).
      </div>

      <div className="flex flex-col border border-[var(--border)]">
        {items.length === 0 ? (
          <div className="px-2.5 py-2 text-[10.5px] text-[var(--text-faintest)]">
            등록된 필요 업무가 없습니다. 아래에서 항목을 추가해보세요.
          </div>
        ) : (
          items.map((item) => (
            <ChecklistNode
              key={item.id}
              item={item}
              depth={0}
              onAdd={onAdd}
              onUpdate={onUpdate}
              onDelete={onDelete}
              commentProps={commentProps}
              expandSignal={expandSignal}
              readOnly={readOnly}
            />
          ))
        )}
        {!readOnly && <AddRow depth={0} onConfirm={(label) => onAdd(null, label)} />}
      </div>
    </div>
  );
}

function ChecklistNode({
  item,
  depth,
  onAdd,
  onUpdate,
  onDelete,
  commentProps,
  expandSignal,
  readOnly,
}: {
  item: ChecklistItem;
  depth: number;
  onAdd: (parentId: string | null, label: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<ChecklistItem, "label" | "progress" | "dueDate">>) => void;
  onDelete: (id: string) => void;
  commentProps: CommentProps;
  expandSignal: ExpandSignal | null;
  readOnly: boolean;
}) {
  const itemComments = commentProps.comments
    .filter((c) => c.targetType === "checklist" && c.targetId === item.id)
    .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));

  const [expanded, setExpanded] = useState(item.children.length > 0 || itemComments.length > 0);
  const [addingChild, setAddingChild] = useState(false);

  useEffect(() => {
    if (expandSignal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpanded(expandSignal.expand);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandSignal?.token]);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(item.label);
  const [editingDue, setEditingDue] = useState(false);
  const hasChildren = item.children.length > 0;
  const done = item.progress >= 100;
  const indent = 10 + depth * 18;
  const overdue = !!item.dueDate && !done && daysOverdue(item.dueDate) > 0;

  function saveLabel() {
    if (labelDraft.trim()) onUpdate(item.id, { label: labelDraft.trim() });
    setEditingLabel(false);
  }

  return (
    <div>
      <div
        className="flex h-7 items-center gap-1.5 border-b px-2.5"
        style={{ paddingLeft: indent, borderColor: "var(--divider)" }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? "접기" : "펼치기 (하위 항목·댓글)"}
          className="flex h-3.5 w-3.5 flex-none items-center justify-center rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)]"
        >
          <ChevronIcon open={expanded} />
        </button>

        {editingLabel && !readOnly ? (
          <input
            autoFocus
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={saveLabel}
            onKeyDown={(e) => e.key === "Enter" && saveLabel()}
            className="h-5 min-w-0 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1 text-[11px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
        ) : (
          <button
            onClick={() => !readOnly && setEditingLabel(true)}
            disabled={readOnly}
            className="min-w-0 flex-1 truncate text-left text-[11px]"
            style={{
              color: done ? "var(--text-faintest)" : "var(--text)",
              textDecoration: done ? "line-through" : "none",
            }}
          >
            {item.label}
          </button>
        )}

        {!expanded && itemComments.length > 0 && (
          <span className="flex flex-none items-center gap-1 text-[9.5px] text-[var(--text-faintest)]">
            <CommentIcon />
            {itemComments.length}
          </span>
        )}

        {editingDue && !readOnly ? (
          <input
            type="date"
            autoFocus
            value={item.dueDate ?? ""}
            onChange={(e) => onUpdate(item.id, { dueDate: e.target.value || undefined })}
            onBlur={() => setEditingDue(false)}
            className="h-5 w-[110px] flex-none rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1 text-[10px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
        ) : (
          <button
            onClick={() => !readOnly && setEditingDue(true)}
            disabled={readOnly}
            title="기한 설정"
            className="flex flex-none items-center gap-1 rounded-[2px] px-1 py-0.5 text-[9.5px]"
            style={{
              fontWeight: overdue ? 700 : 400,
              color: overdue ? "var(--danger)" : item.dueDate ? "var(--text-muted)" : "var(--text-disabled)",
            }}
          >
            <CalendarIcon color={overdue ? "var(--danger)" : item.dueDate ? "var(--text-faint)" : "var(--text-disabled)"} />
            {item.dueDate ? formatDateShort(item.dueDate) : "기한"}
          </button>
        )}

        <div className="flex w-[110px] flex-none items-center gap-1.5">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={item.progress}
            disabled={readOnly}
            onChange={(e) => onUpdate(item.id, { progress: Number(e.target.value) })}
            style={{ accentColor: progressColor(item.progress) }}
            className="h-1 w-14 min-w-0 flex-none disabled:opacity-60"
          />
          <span className="w-7 flex-none text-right text-[9.5px] text-[var(--text-faintest)]">
            {item.progress}%
          </span>
        </div>

        {!readOnly && (
          <>
            <button
              onClick={() => setAddingChild((v) => !v)}
              title="하위 항목 추가"
              className="flex-none text-[var(--text-faint)] hover:text-[var(--accent)]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (confirm("이 항목을 삭제할까요? 하위 항목도 함께 삭제됩니다.")) onDelete(item.id);
              }}
              title="삭제"
              className="flex-none"
              style={{ color: "var(--danger-text)" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {expanded && (
        <div
          className="border-b bg-[var(--surface-alt)] px-2.5 py-2"
          style={{ paddingLeft: indent + 20, borderColor: "var(--divider)" }}
        >
          <div className="mb-1.5 text-[9px] text-[var(--text-disabled)]">
            등록일 {formatDateTime(item.createdAt)}
          </div>
          <div className="mb-1 text-[9.5px] font-semibold text-[var(--text-faintest)]">댓글</div>
          <CommentList
            comments={itemComments}
            getUser={commentProps.getUser}
            canEdit={commentProps.canEdit}
            currentUserId={commentProps.currentUserId}
            onAdd={(content, attachments) =>
              commentProps.onAddComment(item.id, content, attachments)
            }
            onUpdateComment={commentProps.onUpdateComment}
            onDeleteComment={commentProps.onDeleteComment}
          />
        </div>
      )}

      {expanded && hasChildren && (
        <div>
          {item.children.map((child) => (
            <ChecklistNode
              key={child.id}
              item={child}
              depth={depth + 1}
              onAdd={onAdd}
              onUpdate={onUpdate}
              onDelete={onDelete}
              commentProps={commentProps}
              expandSignal={expandSignal}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {addingChild && !readOnly && (
        <AddRow
          depth={depth + 1}
          onConfirm={(label) => {
            onAdd(item.id, label);
            setAddingChild(false);
            setExpanded(true);
          }}
          onCancel={() => setAddingChild(false)}
        />
      )}
    </div>
  );
}

function AddRow({
  depth,
  onConfirm,
  onCancel,
}: {
  depth: number;
  onConfirm: (label: string) => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState("");

  function confirm() {
    if (value.trim()) {
      onConfirm(value.trim());
      setValue("");
    }
  }

  return (
    <div
      className="flex h-7 items-center gap-1.5 border-b px-2.5"
      style={{ paddingLeft: 10 + depth * 18, borderColor: "var(--divider)" }}
    >
      <span className="w-3.5 flex-none" />
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-faintest)" strokeWidth="2" strokeLinecap="round" className="flex-none">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") confirm();
          if (e.key === "Escape") onCancel?.();
        }}
        placeholder="필요 업무 항목 입력 후 Enter"
        className="h-5 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1 text-[11px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
      />
      <button
        onClick={confirm}
        className="flex-none rounded-[2px] px-1.5 py-0.5 text-[9.5px] font-semibold"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        추가
      </button>
      {onCancel && (
        <button onClick={onCancel} className="flex-none text-[9.5px] text-[var(--text-faintest)]">
          취소
        </button>
      )}
    </div>
  );
}
