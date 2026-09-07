"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useRequireAuth } from "@/lib/use-require-auth";
import { AppShell } from "@/components/app-shell";
import { formatDateTime } from "@/lib/format";

export default function NotificationsPage() {
  const { ready, currentUser } = useRequireAuth();
  const { notifications, allTasks, getUser, markNotificationRead } = useStore();
  const router = useRouter();

  if (!ready || !currentUser) return null;

  const mine = notifications
    .filter((n) => n.recipientId === currentUser.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const unreadCount = mine.filter((n) => !n.read).length;

  function openNotification(taskId: string, id: string) {
    markNotificationRead(id, true);
    router.push(`/tasks/${taskId}`);
  }

  return (
    <AppShell>
      <div className="flex h-8 flex-none items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4">
        <span className="flex-none whitespace-nowrap text-[10.5px] font-semibold text-[var(--text)]">알림</span>
        <span className="hidden truncate text-[9.5px] text-[var(--text-faintest)] sm:inline">
          내가 담당·협업 중인 업무에 댓글이 달리면 여기에 표시됩니다.
        </span>
        {unreadCount > 0 && (
          <span
            className="ml-auto flex-none rounded-full px-2 py-0.5 text-[9.5px] font-bold"
            style={{ background: "var(--danger-soft-bg)", color: "var(--danger)" }}
          >
            안 읽음 {unreadCount}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
        <div className="flex flex-1 flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex-1 overflow-auto">
            {mine.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-[11.5px] text-[var(--text-faintest)]">
                아직 온 알림이 없습니다.
              </div>
            ) : (
              mine.map((n) => {
                const actor = getUser(n.actorId);
                const task = allTasks.find((t) => t.id === n.taskId);
                return (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openNotification(n.taskId, n.id)}
                    onKeyDown={(e) => e.key === "Enter" && openNotification(n.taskId, n.id)}
                    className="flex w-full cursor-pointer items-start gap-2.5 border-b border-[var(--divider)] px-3 py-2.5 text-left last:border-0 hover:bg-[var(--surface-alt)]"
                    style={{ background: n.read ? "transparent" : "var(--accent-soft-bg)" }}
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full"
                      style={{ background: n.read ? "transparent" : "var(--accent)" }}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="flex-none text-[11.5px] font-semibold text-[var(--text)]">
                          {actor?.name ?? "알 수 없음"}
                        </span>
                        <span className="flex-none text-[10.5px] text-[var(--text-faint)]">님이 댓글을 남겼습니다</span>
                        <span className="ml-auto flex-none text-[10px] text-[var(--text-faintest)]">
                          {formatDateTime(n.createdAt)}
                        </span>
                      </div>
                      <div className="truncate text-[11px] text-[var(--text-muted)]">{n.contentPreview}</div>
                      <div className="truncate text-[10px] text-[var(--text-faintest)]">
                        {task ? `${task.taskNumber} · ${task.title}` : "삭제된 업무"}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markNotificationRead(n.id, !n.read);
                      }}
                      title={n.read ? "안 읽음으로 표시" : "읽음으로 표시"}
                      className="mt-0.5 flex h-6 flex-none items-center gap-1 whitespace-nowrap rounded-[3px] border px-2 text-[9.5px] font-semibold"
                      style={{
                        borderColor: n.read ? "var(--border-strong)" : "var(--accent)",
                        color: n.read ? "var(--text-faint)" : "var(--accent)",
                        background: "var(--surface)",
                      }}
                    >
                      {n.read ? "읽음" : "안 읽음"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
