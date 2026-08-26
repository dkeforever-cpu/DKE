"use client";

import { useState } from "react";
import { Comment, LogEntry, User } from "@/lib/types";
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

  const editable = canEdit(entry.authorId);

  function saveEdit() {
    if (!draft.trim()) return;
    onUpdateEntry(entry.id, draft.trim());
    setEditing(false);
  }

  return (
    <div className="flex gap-3" data-log-entry-id={entry.id}>
      <div className="flex w-4 flex-none flex-col items-center">
        <div className="mt-[5px] h-[9px] w-[9px] rounded-full bg-[#3355d6]" />
        {!isLast && <div className="w-[2px] flex-1 bg-[#eef0f2]" />}
      </div>
      <div className="flex flex-1 flex-col gap-2 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Avatar id={entry.authorId} name={author?.name ?? "?"} size={22} />
            <span className="text-[12px] font-bold text-[#1a1d24]">
              {author?.name ?? "알 수 없음"}
            </span>
            <span className="text-[11px] text-[#a6abb5]">
              {formatDateTime(entry.createdAt)}
              {entry.editedAt ? " · 수정됨" : ""}
            </span>
          </div>
          {editable && !editing && (
            <div className="flex items-center gap-2.5">
              <button onClick={() => setEditing(true)} title="수정">
                <PencilIcon />
              </button>
              <button
                onClick={() => {
                  if (confirm("이 일지를 삭제할까요?")) onDeleteEntry(entry.id);
                }}
                title="삭제"
              >
                <TrashIcon />
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="flex flex-col gap-2 pl-[30px]">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-16 resize-none rounded-md border border-[#d7dbe0] px-2.5 py-2 text-[12.5px] outline-none focus:border-[#3355d6]"
            />
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="h-7 rounded-md bg-[#23262e] px-3 text-[11px] font-semibold text-white"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setDraft(entry.content);
                  setEditing(false);
                }}
                className="h-7 rounded-md border border-[#d7dbe0] px-3 text-[11px] text-[#5b6068]"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="pl-[30px] text-[12.5px] leading-relaxed text-[#3d4148] whitespace-pre-wrap">
            {entry.content}
          </div>
        )}

        {entry.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-[30px]">
            {entry.attachments.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-md border border-[#eef0f2] px-2.5 py-1 text-[11px] text-[#5b6068]"
              >
                <FileIcon />
                {f}
              </div>
            ))}
          </div>
        )}

        <div className="pl-[30px]">
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
