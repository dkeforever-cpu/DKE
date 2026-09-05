"use client";

import { ReactNode, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useZoomCorrectedViewportHeight } from "@/lib/theme";
import { useDashboardState } from "@/lib/dashboard-state";
import { TopBar } from "@/components/top-bar";
import { Sidebar, Selection } from "@/components/sidebar";

// Wraps the dashboard and task-detail pages with a shared TopBar + left
// sidebar so switching between "업무 목록 보기" and viewing a task's detail
// doesn't reset the sidebar's filters/selection — only the main content
// slot (children) changes. The sidebar itself can be collapsed to a thin
// rail via a small icon, independent of what page is showing.
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const viewportHeight = useZoomCorrectedViewportHeight();
  const { boards, categoriesByTeam, tasks, currentUser } = useStore();
  const {
    teamTab,
    boardId,
    setBoardId,
    selection,
    setSelection,
    view,
    setView,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useDashboardState();

  const teamBoards = useMemo(
    () => (teamTab === "전체" ? [] : boards.filter((b) => b.teamId === teamTab)),
    [boards, teamTab]
  );
  const activeBoard = teamBoards.find((b) => b.id === boardId) ?? teamBoards[0] ?? null;

  const teamTasks = useMemo(
    () => (teamTab === "전체" ? tasks : tasks.filter((t) => t.teamId === teamTab)),
    [tasks, teamTab]
  );
  const mineCount = teamTasks.filter((t) => t.assigneeId === currentUser?.id).length;
  const allCount = teamTasks.length;
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of teamTasks) map[t.categoryLarge] = (map[t.categoryLarge] ?? 0) + 1;
    return map;
  }, [teamTasks]);

  function handleSelect(s: Selection) {
    setSelection(s);
    setView("list");
    router.push("/");
  }

  function handleSelectBoard(id: string) {
    setBoardId(id);
    setView("list");
    router.push("/");
  }

  function handleOpenCalendar() {
    setView("calendar");
    router.push("/");
  }

  return (
    <div
      className="flex h-screen flex-col"
      style={viewportHeight ? { height: viewportHeight } : undefined}
    >
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {sidebarCollapsed ? (
          <button
            onClick={() => setSidebarCollapsed(false)}
            title="메뉴 펼치기"
            className="dashboard-desktop-pane w-6 flex-none flex-col items-center border-r border-[var(--border)] bg-[var(--surface)] pt-2 text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        ) : (
          <div className="dashboard-desktop-pane flex-none">
            <Sidebar
              teamSelected={teamTab !== "전체"}
              categories={teamTab === "전체" ? [] : categoriesByTeam[teamTab] ?? []}
              boards={teamBoards}
              activeBoardId={activeBoard?.id ?? null}
              onSelectBoard={handleSelectBoard}
              selection={selection}
              onSelect={handleSelect}
              mineCount={mineCount}
              allCount={allCount}
              categoryCounts={categoryCounts}
              calendarActive={view === "calendar"}
              onOpenCalendar={handleOpenCalendar}
              onCollapse={() => setSidebarCollapsed(true)}
            />
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
