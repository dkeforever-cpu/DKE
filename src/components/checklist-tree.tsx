"use client";

import { useEffect, useState } from "react";
import { ChecklistItem, Comment, User } from "@/lib/types";
import { flatten } from "@/lib/checklist";
import { CommentList } from "@/components/comment-thread";
import { daysOverdue, formatDateShort } from "@/lib/format";

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
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#8a8f99"
      strokeWidth="2.4"
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
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a6abb5" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CalendarIcon({ color = "#a6abb5" }: { color?: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function progressColor(v: number) {
  if (v >= 100) return "#1f8a4c";
  if (v === 0) return "#c7cad0";
  return "#3355d6";
}

export function ChecklistTree({
  items,
  onAdd,
  onUpdate,
  onDelete,
  commentProps,
}: {
  items: ChecklistItem[];
  onAdd: (parentId: string | null, label: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<ChecklistItem, "label" | "progress" | "dueDate">>) => void;
  onDelete: (id: string) => void;
  commentProps: CommentProps;
}) {
  const all = flatten(items);
  const avg = all.length
    ? Math.round(all.reduce((sum, i) => sum + i.progress, 0) / all.length)
    : 0;

  const [expandSignal, setExpandSignal] = useState<ExpandSignal | null>(null);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="text-[13.5px] font-bold text-[#1a1d24]">필요 업무</div>
        {all.length > 0 && (
          <span className="text-[11px] text-[#a6abb5]">
            {all.length}개 항목 · 평균 {avg}%
          </span>
        )}
        {all.length > 0 && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() =>
                setExpandSignal((prev) => ({ expand: true, token: (prev?.token ?? 0) + 1 }))
              }
              className="rounded border border-[#d7dbe0] px-2 py-1 text-[10.5px] text-[#5b6068] hover:border-[#3355d6] hover:text-[#3355d6]"
            >
              전체 펴기
            </button>
            <button
              onClick={() =>
                setExpandSignal((prev) => ({ expand: false, token: (prev?.token ?? 0) + 1 }))
              }
              className="rounded border border-[#d7dbe0] px-2 py-1 text-[10.5px] text-[#5b6068] hover:border-[#3355d6] hover:text-[#3355d6]"
            >
              전체 접기
            </button>
          </div>
        )}
      </div>
      <div className="text-[10.5px] text-[#a6abb5]">
        행 왼쪽의 화살표를 눌러 펼치면 하위 항목과 댓글을 볼 수 있어요 (엑셀 그룹 접기/펼치기와
        같은 방식).
      </div>

      <div className="flex flex-col rounded-lg border border-[#e3e5e9]">
        {items.length === 0 ? (
          <div className="px-3.5 py-3 text-[11.5px] text-[#a6abb5]">
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
            />
          ))
        )}
        <AddRow depth={0} onConfirm={(label) => onAdd(null, label)} />
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
}: {
  item: ChecklistItem;
  depth: number;
  onAdd: (parentId: string | null, label: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<ChecklistItem, "label" | "progress" | "dueDate">>) => void;
  onDelete: (id: string) => void;
  commentProps: CommentProps;
  expandSignal: ExpandSignal | null;
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
  const indent = 12 + depth * 20;
  const overdue = !!item.dueDate && !done && daysOverdue(item.dueDate) > 0;

  function saveLabel() {
    if (labelDraft.trim()) onUpdate(item.id, { label: labelDraft.trim() });
    setEditingLabel(false);
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 border-b border-[#eef0f2] px-3 py-2 last:border-0"
        style={{ paddingLeft: indent }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? "접기" : "펼치기 (하위 항목·댓글)"}
          className="flex h-4 w-4 flex-none items-center justify-center rounded border border-[#d7dbe0] bg-white"
        >
          <ChevronIcon open={expanded} />
        </button>

        <button
          onClick={() => onUpdate(item.id, { progress: done ? 0 : 100 })}
          title={done ? "완료 취소" : "완료로 표시"}
          className={`flex h-[16px] w-[16px] flex-none items-center justify-center rounded border ${
            done ? "border-[#1f8a4c] bg-[#1f8a4c]" : "border-[#d7dbe0] bg-white"
          }`}
        >
          {done && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </button>

        {editingLabel ? (
          <input
            autoFocus
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={saveLabel}
            onKeyDown={(e) => e.key === "Enter" && saveLabel()}
            className="h-6 flex-1 rounded border border-[#d7dbe0] px-1.5 text-[12px] outline-none focus:border-[#3355d6]"
          />
        ) : (
          <button
            onClick={() => setEditingLabel(true)}
            className={`flex-1 truncate text-left text-[12.5px] ${
              done ? "text-[#a6abb5] line-through" : "text-[#1a1d24]"
            }`}
          >
            {item.label}
          </button>
        )}

        {!expanded && itemComments.length > 0 && (
          <span className="flex flex-none items-center gap-1 text-[10.5px] text-[#a6abb5]">
            <CommentIcon />
            {itemComments.length}
          </span>
        )}

        {editingDue ? (
          <input
            type="date"
            autoFocus
            value={item.dueDate ?? ""}
            onChange={(e) => onUpdate(item.id, { dueDate: e.target.value || undefined })}
            onBlur={() => setEditingDue(false)}
            className="h-6 w-[122px] flex-none rounded border border-[#d7dbe0] px-1 text-[11px] outline-none focus:border-[#3355d6]"
          />
        ) : (
          <button
            onClick={() => setEditingDue(true)}
            title="기한 설정"
            className={`flex flex-none items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] ${
              overdue ? "font-bold text-[#d92d20]" : item.dueDate ? "text-[#5b6068]" : "text-[#c7cad0]"
            }`}
          >
            <CalendarIcon color={overdue ? "#d92d20" : item.dueDate ? "#8a8f99" : "#c7cad0"} />
            {item.dueDate ? formatDateShort(item.dueDate) : "기한"}
          </button>
        )}

        <div className="flex w-[110px] flex-none items-center gap-1.5">
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#eceef1]">
            <div
              className="h-full rounded-full"
              style={{ width: `${item.progress}%`, background: progressColor(item.progress) }}
            />
          </div>
          <input
            type="number"
            min={0}
            max={100}
            step={5}
            value={item.progress}
            onChange={(e) => {
              const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
              onUpdate(item.id, { progress: v });
            }}
            className="h-6 w-[42px] rounded border border-[#d7dbe0] px-1 text-right text-[11px] outline-none focus:border-[#3355d6]"
          />
          <span className="text-[10.5px] text-[#a6abb5]">%</span>
        </div>

        <button
          onClick={() => setAddingChild((v) => !v)}
          title="하위 항목 추가"
          className="flex-none text-[#8a8f99] hover:text-[#3355d6]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          onClick={() => {
            if (confirm("이 항목을 삭제할까요? 하위 항목도 함께 삭제됩니다.")) onDelete(item.id);
          }}
          title="삭제"
          className="flex-none text-[#c0392b]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="border-b border-[#eef0f2] bg-[#fafafb] px-3 py-3 last:border-0" style={{ paddingLeft: indent + 22 }}>
          <div className="mb-2 text-[10px] text-[#c7cad0]">
            등록일 {formatDateShort(item.createdAt)}
          </div>
          <div className="mb-1.5 text-[10.5px] font-semibold text-[#a6abb5]">댓글</div>
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
            />
          ))}
        </div>
      )}

      {addingChild && (
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
      className="flex items-center gap-2 border-b border-[#eef0f2] px-3 py-2 last:border-0"
      style={{ paddingLeft: 12 + depth * 20 }}
    >
      <span className="w-4 flex-none" />
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a6abb5" strokeWidth="2" strokeLinecap="round" className="flex-none">
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
        className="h-6 flex-1 rounded border border-[#d7dbe0] px-1.5 text-[12px] outline-none focus:border-[#3355d6]"
      />
      <button
        onClick={confirm}
        className="flex-none rounded bg-[#23262e] px-2 py-0.5 text-[10.5px] font-semibold text-white"
      >
        추가
      </button>
      {onCancel && (
        <button onClick={onCancel} className="flex-none text-[10.5px] text-[#a6abb5]">
          취소
        </button>
      )}
    </div>
  );
}
