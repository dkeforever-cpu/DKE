"use client";

import { useState } from "react";
import { Comment, User } from "@/lib/types";
import { Avatar } from "@/components/avatar";
import { formatDateTime } from "@/lib/format";

export function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8a8f99" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

export function CommentThread({
  comments,
  getUser,
  canEdit,
  currentUserId,
  onAdd,
  onUpdateComment,
  onDeleteComment,
  defaultExpanded,
}: {
  comments: Comment[];
  getUser: (id: string) => User | undefined;
  canEdit: (authorId: string) => boolean;
  currentUserId: string;
  onAdd: (content: string) => void;
  onUpdateComment: (id: string, content: string) => void;
  onDeleteComment: (id: string) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? comments.length > 0);
  const [replyText, setReplyText] = useState("");

  function submitReply() {
    if (!replyText.trim()) return;
    onAdd(replyText.trim());
    setReplyText("");
    setExpanded(true);
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-[11px] text-[#a6abb5] hover:text-[#5b6068]"
      >
        {comments.length === 0 ? "댓글 남기기" : `댓글 ${comments.length}개 보기 ›`}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-[#eef0f2] bg-[#fafafb] p-3">
      {comments.length > 0 && (
        <button
          onClick={() => setExpanded(false)}
          className="self-start text-[10.5px] text-[#a6abb5] hover:text-[#5b6068]"
        >
          접기 ‹
        </button>
      )}
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
      <div className="flex items-center gap-2">
        <Avatar id={currentUserId} name="" size={20} />
        <input
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitReply();
          }}
          placeholder="댓글로 피드백 남기기"
          className="h-7 flex-1 rounded-md border border-[#d7dbe0] bg-white px-2.5 text-[11.5px] outline-none focus:border-[#3355d6]"
        />
        <button
          onClick={submitReply}
          className="h-7 rounded-md bg-[#23262e] px-2.5 text-[11px] font-semibold text-white"
        >
          등록
        </button>
      </div>
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
    <div className="flex gap-2">
      <Avatar id={comment.authorId} name={author?.name ?? "?"} size={20} />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11.5px] font-bold text-[#1a1d24]">
            {author?.name ?? "알 수 없음"}
          </span>
          <span className="text-[10.5px] text-[#a6abb5]">
            {formatDateTime(comment.createdAt)}
            {comment.editedAt ? " · 수정됨" : ""}
          </span>
          {editable && !editing && (
            <div className="ml-auto flex items-center gap-2">
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
          <div className="flex flex-col gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-7 rounded-md border border-[#d7dbe0] bg-white px-2 text-[12px] outline-none focus:border-[#3355d6]"
            />
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  if (draft.trim()) {
                    onUpdate(draft.trim());
                    setEditing(false);
                  }
                }}
                className="h-6 rounded bg-[#23262e] px-2 text-[10.5px] font-semibold text-white"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setDraft(comment.content);
                  setEditing(false);
                }}
                className="h-6 rounded border border-[#d7dbe0] px-2 text-[10.5px] text-[#5b6068]"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="text-[12px] leading-relaxed text-[#3d4148]">{comment.content}</div>
        )}
      </div>
    </div>
  );
}
