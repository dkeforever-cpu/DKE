"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useRequireAuth } from "@/lib/use-require-auth";
import { useDashboardState } from "@/lib/dashboard-state";
import { AppShell } from "@/components/app-shell";
import { formatDateTime } from "@/lib/format";
import { NewsItem } from "@/lib/types";

const ENTITY_LABELS: Record<NewsItem["entityType"], string> = {
  task: "새 업무",
  calendarEvent: "새 일정",
  checklistItem: "새 필요 업무",
  comment: "새 댓글",
};

export default function NewPage() {
  const { ready, currentUser } = useRequireAuth();
  const { newsItems, dismissNewsItem } = useStore();
  const { setView } = useDashboardState();
  const router = useRouter();
  // 화면이 리렌더되어 항목이 사라지기 전에 같은 확인 버튼을 연타하면
  // dismissNewsItem이 같은 id로 여러 번 호출될 수 있었다 — 한 번 확인
  // 요청을 보낸 id는 기록해두고 다시 보내지 않는다.
  const dismissedRef = useRef<Set<string>>(new Set());

  if (!ready || !currentUser) return null;

  function handleDismiss(id: string) {
    if (dismissedRef.current.has(id)) return;
    dismissedRef.current.add(id);
    dismissNewsItem(id);
  }

  function openNewsItem(item: NewsItem) {
    if (item.entityType === "calendarEvent") {
      setView("calendar");
      router.push("/");
      return;
    }
    if (item.taskId) router.push(`/tasks/${item.taskId}`);
  }

  return (
    <AppShell>
      <div className="flex h-8 flex-none items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4">
        <span className="flex-none whitespace-nowrap text-[10.5px] font-semibold text-[var(--text)]">NEW</span>
        <span className="hidden truncate text-[9.5px] text-[var(--text-faintest)] sm:inline">
          같은 팀에 새로 등록된 업무·일정·필요 업무·댓글을 보여줍니다. 확인을 누르면 내 목록에서만 사라집니다.
        </span>
        {newsItems.length > 0 && (
          <span
            className="ml-auto flex-none rounded-full px-2 py-0.5 text-[9.5px] font-bold"
            style={{ background: "var(--danger-soft-bg)", color: "var(--danger)" }}
          >
            {newsItems.length}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
        <div className="flex flex-1 flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex-1 overflow-auto">
            {newsItems.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-[11.5px] text-[var(--text-faintest)]">
                새로운 소식이 없습니다.
              </div>
            ) : (
              newsItems.map((n) => (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openNewsItem(n)}
                  onKeyDown={(e) => e.key === "Enter" && openNewsItem(n)}
                  className="flex w-full cursor-pointer items-start gap-2.5 border-b border-[var(--divider)] px-3 py-2.5 text-left last:border-0 hover:bg-[var(--surface-alt)]"
                  style={{ background: "var(--accent-soft-bg)" }}
                >
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: "var(--accent)" }} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="flex-none rounded-[3px] px-1.5 py-[1px] text-[9.5px] font-semibold"
                        style={{ background: "var(--accent-soft-bg)", color: "var(--accent-soft-fg)" }}
                      >
                        {ENTITY_LABELS[n.entityType]}
                      </span>
                      <span className="ml-auto flex-none text-[10px] text-[var(--text-faintest)]">
                        {formatDateTime(n.createdAt)}
                      </span>
                    </div>
                    <div className="truncate text-[11px] text-[var(--text-secondary)]">{n.summary}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(n.id);
                    }}
                    className="mt-0.5 flex h-6 flex-none items-center whitespace-nowrap rounded-[3px] px-2.5 text-[9.5px] font-semibold"
                    style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                  >
                    확인
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
