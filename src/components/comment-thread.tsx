"use client";

import { ChangeEvent, useState } from "react";
import { Comment, User } from "@/lib/types";
import { Avatar } from "@/components/avatar";
import { formatDateTime } from "@/lib/format";

export function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--danger-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

export function FileIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function ClipIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8">
      <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

interface CommentListProps {
  comments: Comment[];
  getUser: (id: string) => User | undefined;
  canEdit: (authorId: string) => boolean;
  currentUserId: string;
  onAdd: (content: string, attachments: string[]) => void;
  onUpdateComment: (id: string, content: string) => void;
  onDeleteComment: (id: string) => void;
}

/** Comment list + reply box, no expand/collapse of its own — the caller controls visibility. */
export function CommentList({
  comments,
  getUser,
  canEdit,
  currentUserId,
  onAdd,
  onUpdateComment,
  onDeleteComment,
}: CommentListProps) {
  const [replyText, setReplyText] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<string[]>([]);

  function submitReply() {
    if (!replyText.trim()) return;
    onAdd(replyText.trim(), replyAttachments);
    setReplyText("");
    setReplyAttachments([]);
  }

  function handleFilePick(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    // Snapshot the names before clearing the input — e.target.files is a live
    // FileList, so resetting e.target.value would empty it before a deferred
    // functional setState update gets a chance to read it.
    const names = Array.from(files).map((f) => f.name);
    e.target.value = "";
    setReplyAttachments((prev) => [...prev, ...names]);
  }

  return (
    <div className="flex flex-col gap-2">
      {comments.map((c) => (
        <CommentRow
          key={c.id}
          comment={c}
          author={getUser(c.authorId)}
          editable={canEdit(c.authorId)}
          onUpdate={(content) => onUpdateComment(c.id, content)}
          onDelete={() => onDeleteComment(c.id)}
        />
      ))}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Avatar id={currentUserId} name="" size={18} />
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitReply();
            }}
            placeholder="댓글로 피드백 남기기"
            className="h-6 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[10.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
          <label
            title="파일 첨부"
            className="flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <ClipIcon />
            <input type="file" multiple className="hidden" onChange={handleFilePick} />
          </label>
          <button
            onClick={submitReply}
            className="h-6 flex-none rounded-[2px] px-2 text-[10px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            등록
          </button>
        </div>
        {replyAttachments.length > 0 && (
          <div className="ml-6 flex flex-wrap gap-1">
            {replyAttachments.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1 rounded-[2px] border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[9.5px] text-[var(--text-muted)]"
              >
                <FileIcon />
                {f}
                <button
                  onClick={() => setReplyAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-[var(--text-faintest)] hover:text-[var(--danger)]"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Self-toggling comment section: collapsed shows a "댓글 N개 보기" link. */
export function CommentThread({
  comments,
  getUser,
  canEdit,
  currentUserId,
  onAdd,
  onUpdateComment,
  onDeleteComment,
  defaultExpanded,
}: CommentListProps & { defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? comments.length > 0);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-[10px] text-[var(--text-faintest)] hover:text-[var(--text-muted)]"
      >
        {comments.length === 0 ? "댓글 남기기" : `댓글 ${comments.length}개 보기 ›`}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 border border-[var(--divider)] bg-[var(--surface-alt)] p-2">
      <button
        onClick={() => setExpanded(false)}
        className="self-start text-[9.5px] text-[var(--text-faintest)] hover:text-[var(--text-muted)]"
      >
        접기 ‹
      </button>
      <CommentList
        comments={comments}
        getUser={getUser}
        canEdit={canEdit}
        currentUserId={currentUserId}
        onAdd={onAdd}
        onUpdateComment={onUpdateComment}
        onDeleteComment={onDeleteComment}
      />
    </div>
  );
}

function CommentRow({
  comment,
  author,
  editable,
  onUpdate,
  onDelete,
}: {
  comment: Comment;
  author: User | undefined;
  editable: boolean;
  onUpdate: (content: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);

  return (
    <div className="flex gap-1.5">
      <Avatar id={comment.authorId} name={author?.name ?? "?"} size={18} />
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10.5px] font-bold text-[var(--text)]">
            {author?.name ?? "알 수 없음"}
          </span>
          <span className="text-[9.5px] text-[var(--text-faintest)]">
            {formatDateTime(comment.createdAt)}
            {comment.editedAt ? " · 수정됨" : ""}
          </span>
          {editable && !editing && (
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={() => setEditing(true)} title="수정">
                <PencilIcon />
              </button>
              <button
                onClick={() => {
                  if (confirm("이 댓글을 삭제할까요?")) onDelete();
                }}
                title="삭제"
              >
                <TrashIcon />
              </button>
            </div>
          )}
        </div>
        {editing ? (
          <div className="flex flex-col gap-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-6 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[11px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
            <div className="flex gap-1">
              <button
                onClick={() => {
                  if (draft.trim()) {
                    onUpdate(draft.trim());
                    setEditing(false);
                  }
                }}
                className="h-5 rounded-[2px] px-1.5 text-[9.5px] font-semibold"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                저장
              </button>
              <button
                onClick={() => {
                  setDraft(comment.content);
                  setEditing(false);
                }}
                className="h-5 rounded-[2px] border border-[var(--border-strong)] px-1.5 text-[9.5px] text-[var(--text-muted)]"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="text-[10.5px] leading-relaxed text-[var(--text-secondary)]">{comment.content}</div>
        )}
        {(comment.attachments ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(comment.attachments ?? []).map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1 rounded-[2px] border border-[var(--divider)] bg-[var(--surface)] px-1.5 py-0.5 text-[9.5px] text-[var(--text-muted)]"
              >
                <FileIcon />
                {f}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
