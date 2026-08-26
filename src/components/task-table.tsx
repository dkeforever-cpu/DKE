"use client";

import { useRouter } from "next/navigation";
import { Task, User } from "@/lib/types";
import { StatusBadge, PriorityLabel, ProgressBar } from "@/components/badges";
import { formatDateShort, formatDateFull, daysOverdue, isOverdue } from "@/lib/format";

const COLS =
  "60px minmax(200px,2.4fr) 100px 64px 84px 60px 108px 68px 76px 34px 34px";

export function TaskTable({
  tasks,
  getUser,
  attachmentCount,
  commentCount,
}: {
  tasks: Task[];
  getUser: (id: string) => User | undefined;
  attachmentCount: (taskId: string) => number;
  commentCount: (taskId: string) => number;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-[#e3e5e9] bg-white">
      <div
        className="grid gap-2 border-b border-[#e3e5e9] bg-[#fafafb] px-3.5 py-2 text-[10.5px] font-bold tracking-wide text-[#8a8f99]"
        style={{ gridTemplateColumns: COLS }}
      >
        <div>상태</div>
        <div>업무명</div>
        <div>카테고리</div>
        <div>담당자</div>
        <div>센터</div>
        <div>우선순위</div>
        <div>진행률</div>
        <div>등록일</div>
        <div>마감일</div>
        <div className="text-center">첨부</div>
        <div className="text-center">첨언</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 && (
          <div className="flex h-32 items-center justify-center text-[12px] text-[#a6abb5]">
            표시할 업무가 없습니다.
          </div>
        )}
        {tasks.map((t) => {
          const assignee = getUser(t.assigneeId);
          const overdue = isOverdue(t.dueDate, t.status);
          return (
            <div
              key={t.id}
              onClick={() => router.push(`/tasks/${t.id}`)}
              className={`grid cursor-pointer items-center gap-2 border-b border-[#eef0f2] px-3.5 py-[7px] last:border-0 hover:bg-[#f7f9ff] ${
                overdue ? "bg-[#fff8f7]" : ""
              }`}
              style={{ gridTemplateColumns: COLS }}
            >
              <div>
                <StatusBadge status={t.status} />
              </div>
              <div className="truncate text-[12px] font-semibold text-[#1a1d24]">
                {t.title}
              </div>
              <div className="truncate text-[11px] text-[#5b6068]">{t.categoryLarge}</div>
              <div className="truncate text-[11px] text-[#5b6068]">
                {assignee?.name ?? "-"}
              </div>
              <div className="truncate text-[11px] text-[#5b6068]">{t.center}</div>
              <div>
                <PriorityLabel priority={t.priority} />
              </div>
              <div>
                <ProgressBar value={t.progress} />
              </div>
              <div className="text-[11px] text-[#8a8f99]">
                {formatDateShort(t.createdAt)}
              </div>
              <div>
                {overdue ? (
                  <span
                    title={`목표일 ${formatDateFull(t.dueDate)} · ${daysOverdue(
                      t.dueDate
                    )}일 지남`}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#d92d20]"
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#d92d20" strokeWidth="2.6">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v5" />
                      <path d="M12 16h.01" />
                    </svg>
                    {formatDateShort(t.dueDate)}
                  </span>
                ) : (
                  <span className="text-[11px] text-[#5b6068]">
                    {formatDateShort(t.dueDate)}
                  </span>
                )}
              </div>
              <div className="text-center text-[10.5px] text-[#a6abb5]">
                {attachmentCount(t.id)}
              </div>
              <div className="text-center text-[10.5px] text-[#a6abb5]">
                {commentCount(t.id)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
