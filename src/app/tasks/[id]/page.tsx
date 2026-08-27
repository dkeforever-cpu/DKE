"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useRequireAuth } from "@/lib/use-require-auth";
import { TopBar } from "@/components/top-bar";
import { Avatar } from "@/components/avatar";
import { StatusBadge, PriorityLabel, ProgressBar } from "@/components/badges";
import { LogEntryItem } from "@/components/log-entry-item";
import { TaskFormModal } from "@/components/task-form-modal";
import { ChecklistTree } from "@/components/checklist-tree";
import { formatDateFull, formatDateTime, daysOverdue, isOverdue } from "@/lib/format";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, currentUser } = useRequireAuth();
  const {
    tasks,
    teams,
    logEntries,
    comments,
    getUser,
    canEdit,
    canEditTask,
    deleteTask,
    addLogEntry,
    updateLogEntry,
    deleteLogEntry,
    addComment,
    updateComment,
    deleteComment,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
  } = useStore();

  const [editOpen, setEditOpen] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newAttachments, setNewAttachments] = useState<string[]>([]);

  const task = tasks.find((t) => t.id === id);

  const taskLogEntries = useMemo(
    () =>
      logEntries
        .filter((l) => l.taskId === id)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [logEntries, id]
  );

  const allAttachments = useMemo(() => {
    return taskLogEntries
      .flatMap((l) => (l.attachments ?? []).map((f) => ({ file: f, date: l.createdAt })))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [taskLogEntries]);

  if (!ready || !currentUser) return null;

  if (!task) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="text-[12px] text-[var(--text-faint)]">업무를 찾을 수 없습니다.</div>
          <button
            onClick={() => router.push("/")}
            className="rounded-[3px] px-3.5 py-1.5 text-[11.5px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const assignee = getUser(task.assigneeId);
  const creator = getUser(task.createdBy);
  const overdue = isOverdue(task.dueDate, task.status);
  const teamName = teams.find((t) => t.id === task.teamId)?.name ?? "-";
  const editable = canEditTask(task);
  const collaborators = task.collaboratorIds.map((id) => getUser(id)?.name ?? "?");

  function handleSubmitEntry() {
    if (!newContent.trim() || !currentUser || !task) return;
    addLogEntry({
      taskId: task.id,
      authorId: currentUser.id,
      content: newContent.trim(),
      attachments: newAttachments,
    });
    setNewContent("");
    setNewAttachments([]);
  }

  function handleFilePick(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    // Snapshot the names before clearing the input — e.target.files is a live
    // FileList, so resetting e.target.value would empty it before a deferred
    // functional setState update gets a chance to read it.
    const names = Array.from(files).map((f) => f.name);
    e.target.value = "";
    setNewAttachments((prev) => [...prev, ...names]);
  }

  function handleDeleteTask() {
    if (!task) return;
    if (confirm("이 업무를 삭제할까요? 진행 일지와 댓글도 함께 삭제됩니다.")) {
      deleteTask(task.id);
      router.push("/");
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />

      <div className="flex h-8 flex-none items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4">
        <button onClick={() => router.push("/")} className="text-[var(--text-muted)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-[10.5px] text-[var(--text-faint)]">{teamName}</span>
        <span className="text-[10.5px] text-[var(--text-disabled)]">/</span>
        <span className="text-[10.5px] text-[var(--text-faint)]">{task.categoryLarge}</span>
        <span className="text-[10.5px] text-[var(--text-disabled)]">/</span>
        <span className="text-[10.5px] font-semibold text-[var(--text)]">업무 상세</span>
      </div>

      <div className="grid flex-1 grid-cols-[1.7fr_1fr] gap-2 overflow-hidden p-2">
        <div className="flex flex-col gap-2 overflow-y-auto pr-1">
          <div className="flex flex-col gap-2 border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-faintest)]">
                  {task.categoryLarge}
                  <span className="text-[var(--text-disabled)]">›</span>
                  {task.categoryMedium}
                  <span className="text-[var(--text-disabled)]">›</span>
                  {task.categorySmall}
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={task.status} />
                  <span className="flex items-center gap-1 text-[10.5px] font-bold">
                    <PriorityLabel priority={task.priority} />
                  </span>
                </div>
                <div className="text-[16px] font-bold leading-snug text-[var(--text)]">
                  {task.title}
                </div>
              </div>
              {editable && (
                <div className="flex flex-none gap-1.5">
                  <button
                    onClick={() => setEditOpen(true)}
                    className="h-6 rounded-[3px] border border-[var(--border-strong)] px-2.5 text-[10.5px] text-[var(--text-muted)]"
                  >
                    수정
                  </button>
                  <button
                    onClick={handleDeleteTask}
                    className="h-6 rounded-[3px] border px-2.5 text-[10.5px]"
                    style={{ borderColor: "var(--danger-soft-bg)", background: "var(--danger-soft-bg)", color: "var(--danger)" }}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
            <div className="h-px bg-[var(--divider)]" />
            <div className="whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--text-secondary)]">
              {task.description || "설명이 없습니다."}
            </div>
          </div>

          <div className="border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <ChecklistTree
              items={task.checklist ?? []}
              onAdd={(parentId, label) => addChecklistItem(task.id, parentId, label)}
              onUpdate={(itemId, patch) => updateChecklistItem(task.id, itemId, patch)}
              onDelete={(itemId) => deleteChecklistItem(task.id, itemId)}
              readOnly={!editable}
              commentProps={{
                comments,
                getUser,
                canEdit,
                currentUserId: currentUser.id,
                onAddComment: (itemId, content, attachments) =>
                  addComment({
                    targetType: "checklist",
                    targetId: itemId,
                    authorId: currentUser.id,
                    content,
                    attachments,
                  }),
                onUpdateComment: updateComment,
                onDeleteComment: deleteComment,
              }}
            />
          </div>

          <div className="flex flex-col gap-3 border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <div className="text-[12px] font-bold text-[var(--text)]">진행 일지</div>
                <span className="text-[10px] text-[var(--text-faintest)]">{taskLogEntries.length}건</span>
              </div>
              <div className="text-[9.5px] text-[var(--text-faintest)]">
                등록 횟수 제한 없음 · 본인이 작성한 일지·댓글은 언제든 수정할 수 있어요 (관리자
                권한 계정은 전체 수정·삭제 가능)
              </div>
            </div>

            <div className="flex flex-col gap-2 border border-[var(--divider)] bg-[var(--surface-alt)] p-2.5">
              <div className="flex items-center gap-1.5">
                <Avatar id={currentUser.id} name={currentUser.name} size={19} />
                <span className="text-[10.5px] font-semibold text-[var(--text-secondary)]">
                  {currentUser.name}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] text-[var(--text-faintest)]">
                  오늘 · {formatDateFull(new Date().toISOString().slice(0, 10))}
                </span>
              </div>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="오늘 진행한 내용을 기록하세요 (예: 건물주 통화, 견적 확인, 서류 검토 등)"
                className="h-12 resize-none rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-2 text-[11px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
              {newAttachments.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {newAttachments.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 rounded-[2px] border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[9.5px] text-[var(--text-muted)]"
                    >
                      {f}
                      <button
                        onClick={() =>
                          setNewAttachments((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="text-[var(--text-faintest)] hover:text-[var(--danger)]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="flex h-6 cursor-pointer items-center gap-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[10.5px] text-[var(--text-muted)]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8">
                    <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  파일 첨부
                  <input type="file" multiple className="hidden" onChange={handleFilePick} />
                </label>
                <button
                  onClick={handleSubmitEntry}
                  disabled={!newContent.trim()}
                  className="h-6 rounded-[2px] px-3 text-[10.5px] font-semibold disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  일지 등록
                </button>
              </div>
            </div>

            <div className="flex flex-col">
              {taskLogEntries.length === 0 && (
                <div className="py-5 text-center text-[11px] text-[var(--text-faintest)]">
                  아직 등록된 진행 일지가 없습니다.
                </div>
              )}
              {taskLogEntries.map((entry, idx) => (
                <LogEntryItem
                  key={entry.id}
                  entry={entry}
                  comments={comments
                    .filter((c) => c.targetType === "log" && c.targetId === entry.id)
                    .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))}
                  getUser={getUser}
                  canEdit={canEdit}
                  isLast={idx === taskLogEntries.length - 1}
                  currentUserId={currentUser.id}
                  onUpdateEntry={updateLogEntry}
                  onDeleteEntry={deleteLogEntry}
                  onAddComment={(content, attachments) =>
                    addComment({
                      targetType: "log",
                      targetId: entry.id,
                      authorId: currentUser.id,
                      content,
                      attachments,
                    })
                  }
                  onUpdateComment={updateComment}
                  onDeleteComment={deleteComment}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto pr-1">
          <div className="flex flex-col gap-3 border border-[var(--border)] bg-[var(--surface)] p-3">
            <div className="flex flex-col gap-1">
              <div className="text-[10px] text-[var(--text-faint)]">진행률</div>
              <ProgressBar value={task.progress} />
            </div>
            <div className="h-px bg-[var(--divider)]" />
            <MetaRow label="담당자" value={assignee?.name ?? "-"} />
            <MetaRow
              label="협업자"
              value={collaborators.length > 0 ? collaborators.join(", ") : "-"}
            />
            <MetaRow label="관련 센터" value={task.center} />
            <MetaRow label="업무레벨" value={`Lv.${task.level}`} />
            <div className="flex flex-col gap-0.5">
              <div className="text-[10px] text-[var(--text-faint)]">목표일(마감일)</div>
              {overdue ? (
                <div className="flex items-center gap-1" style={{ color: "var(--danger)" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5" />
                    <path d="M12 16h.01" />
                  </svg>
                  <span className="text-[11.5px] font-bold">
                    {formatDateFull(task.dueDate)} ({daysOverdue(task.dueDate)}일 지남)
                  </span>
                </div>
              ) : (
                <div className="text-[11.5px] font-semibold text-[var(--text)]">
                  {formatDateFull(task.dueDate)}
                </div>
              )}
            </div>
            <MetaRow label="우선순위" value={task.priority} />
            <MetaRow
              label="등록자 / 등록일"
              value={`${creator?.name ?? "-"} · ${formatDateFull(task.createdAt)}`}
            />
          </div>

          <div className="flex flex-col gap-2 border border-[var(--border)] bg-[var(--surface)] p-3">
            <div className="text-[11px] font-bold text-[var(--text)]">
              전체 첨부파일 ({allAttachments.length})
            </div>
            {allAttachments.length === 0 ? (
              <div className="text-[10px] text-[var(--text-faintest)]">첨부된 파일이 없습니다.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {allAttachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" className="flex-none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <div className="flex-1 truncate text-[10.5px] text-[var(--text)]">{a.file}</div>
                    <div className="text-[9.5px] text-[var(--text-faintest)]">
                      {formatDateTime(a.date).split(" ")[0]}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {editOpen && (
        <TaskFormModal
          mode="edit"
          initialTeamId={task.teamId}
          task={task}
          onClose={() => setEditOpen(false)}
          onSaved={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10px] text-[var(--text-faint)]">{label}</div>
      <div className="text-[11.5px] font-semibold text-[var(--text)]">{value}</div>
    </div>
  );
}
