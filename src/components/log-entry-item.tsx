"use client";

import { useState } from "react";
import { Comment, LogEntry, User } from "@/lib/types";
import { useConfirmDialog } from "@/lib/confirm-dialog";
import { Avatar } from "@/components/avatar";
import { formatDateTime } from "@/lib/format";
import { CommentThread, FileIcon, PencilIcon, TrashIcon } from "@/components/comment-thread";

export function LogEntryItem({
  entry,
  comments,
  getUser,
  canEdit,
  isLast,
  currentUserId,
  onUpdateEntry,
  onDeleteEntry,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: {
  entry: LogEntry;
  comments: Comment[];
  getUser: (id: string) => User | undefined;
  canEdit: (authorId: string) => boolean;
  isLast: boolean;
  currentUserId: string;
  onUpdateEntry: (id: string, content: string) => void;
  onDeleteEntry: (id: string) => void;
  onAddComment: (content: string, attachments: string[]) => void;
  onUpdateComment: (id: string, content: string) => void;
  onDeleteComment: (id: string) => void;
}) {
  const author = getUser(entry.authorId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.content);
  const { confirm } = useConfirmDialog();

  const editable = canEdit(entry.authorId);

  function saveEdit() {
    if (!draft.trim()) return;
    onUpdateEntry(entry.id, draft.trim());
    setEditing(false);
  }

  return (
    <div className="flex gap-2.5" data-log-entry-id={entry.id}>
      <div className="flex w-3.5 flex-none flex-col items-center">
        <div className="mt-[4px] h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
        {!isLast && <div className="w-px flex-1 bg-[var(--divider)]" />}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Avatar id={entry.authorId} name={author?.name ?? "?"} size={19} />
            <span className="text-[11px] font-bold text-[var(--text)]">
              {author?.name ?? "알 수 없음"}
            </span>
            <span className="text-[10px] text-[var(--text-faintest)]">
              {formatDateTime(entry.createdAt)}
              {entry.editedAt ? " · 수정됨" : ""}
            </span>
          </div>
          {editable && !editing && (
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(true)} title="수정">
                <PencilIcon />
              </button>
              <button
                onClick={async () => {
                  if (await confirm("이 일지를 삭제할까요?")) onDeleteEntry(entry.id);
                }}
                title="삭제"
              >
                <TrashIcon />
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="flex flex-col gap-1.5 pl-[26px]">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-14 resize-none rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1.5 text-[11px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
            <div className="flex gap-1.5">
              <button
                onClick={saveEdit}
                className="h-6 rounded-[2px] px-2.5 text-[10px] font-semibold"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                저장
              </button>
              <button
                onClick={() => {
                  setDraft(entry.content);
                  setEditing(false);
                }}
                className="h-6 rounded-[2px] border border-[var(--border-strong)] px-2.5 text-[10px] text-[var(--text-muted)]"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap pl-[26px] text-[11px] leading-relaxed text-[var(--text-secondary)]">
            {entry.content}
          </div>
        )}

        {(entry.attachments ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 pl-[26px]">
            {(entry.attachments ?? []).map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1 rounded-[2px] border border-[var(--divider)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]"
              >
                <FileIcon />
                {f}
              </div>
            ))}
          </div>
        )}

        <div className="pl-[26px]">
          <CommentThread
            comments={comments}
            getUser={getUser}
            canEdit={canEdit}
            currentUserId={currentUserId}
            onAdd={onAddComment}
            onUpdateComment={onUpdateComment}
            onDeleteComment={onDeleteComment}
          />
        </div>
      </div>
    </div>
  );
}
