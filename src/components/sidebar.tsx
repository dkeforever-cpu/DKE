"use client";

import { ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Board, CategoryLarge } from "@/lib/types";

export type Selection =
  | { type: "mine" }
  | { type: "all" }
  | { type: "category"; large: string };

export function selectionKey(s: Selection): string {
  return s.type === "category" ? `category:${s.large}` : s.type;
}

export function Sidebar({
  teamSelected,
  categories,
  boards,
  activeBoardId,
  onSelectBoard,
  selection,
  onSelect,
  mineCount,
  allCount,
  categoryCounts,
  calendarActive,
  onOpenCalendar,
  onCollapse,
}: {
  teamSelected: boolean;
  categories: CategoryLarge[];
  boards: Board[];
  activeBoardId: string | null;
  onSelectBoard: (id: string) => void;
  selection: Selection;
  onSelect: (s: Selection) => void;
  mineCount: number;
  allCount: number;
  categoryCounts: Record<string, number>;
  calendarActive: boolean;
  onOpenCalendar: () => void;
  onCollapse: () => void;
}) {
  const currentKey = selectionKey(selection);
  const router = useRouter();
  const pathname = usePathname();
  const onDashboard = pathname === "/";

  return (
    <div className="flex w-[168px] flex-none flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] py-1.5">
      <div className="mb-1 flex items-center justify-end px-1.5">
        <button
          onClick={onCollapse}
          title="메뉴 접기"
          className="flex h-5 w-5 items-center justify-center rounded-[3px] text-[var(--text-faint)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
            <path d="M6 4v16" />
          </svg>
        </button>
      </div>
      <div className="flex flex-col">
        <SidebarItem
          label="내 업무"
          count={mineCount}
          active={onDashboard && !calendarActive && currentKey === "mine"}
          onClick={() => onSelect({ type: "mine" })}
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
            </svg>
          }
        />
        <SidebarItem
          label="전체 업무"
          count={allCount}
          active={onDashboard && !calendarActive && currentKey === "all"}
          onClick={() => onSelect({ type: "all" })}
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          }
        />
        <SidebarItem
          label="캘린더"
          active={onDashboard && calendarActive}
          onClick={onOpenCalendar}
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="4.5" width="18" height="16" rx="1.5" />
              <path d="M3 9.5h18M8 3v3M16 3v3" />
            </svg>
          }
        />
      </div>

      <div className="mx-2.5 my-1.5 h-px bg-[var(--divider)]" />

      <div className="flex flex-col">
        <SidebarItem
          label="프로그램 사용설명서"
          active={pathname === "/guide"}
          onClick={() => router.push("/guide")}
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          }
        />
        <SidebarItem
          label="자료실"
          active={pathname === "/resources"}
          onClick={() => router.push("/resources")}
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            </svg>
          }
        />
      </div>

      <div className="mx-2.5 my-1.5 h-px bg-[var(--divider)]" />

      {!teamSelected ? (
        <div className="mx-2 rounded-[4px] border border-dashed border-[var(--border-strong)] p-2 text-[10px] leading-relaxed text-[var(--text-faintest)]">
          상단에서 팀을 선택하면
          <br />
          해당 팀의 게시판·세부 업무 분류가 표시됩니다.
        </div>
      ) : (
        <>
          {boards.length > 0 && (
            <div className="mb-1.5 flex flex-col">
              <div className="px-3 pb-1 pt-0.5 text-[10px] font-bold tracking-wide text-[var(--text-faintest)]">
                게시판
              </div>
              {boards.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onSelectBoard(b.id)}
                  className="flex h-[26px] items-center gap-1.5 px-2.5 text-left text-[11.5px] font-medium"
                  style={{
                    background: activeBoardId === b.id ? "var(--accent-soft-bg)" : "transparent",
                    color: activeBoardId === b.id ? "var(--accent-soft-fg)" : "var(--text-secondary)",
                    borderLeft: activeBoardId === b.id ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                >
                  <span className="truncate">{b.name}</span>
                </button>
              ))}
              <div className="mx-2.5 my-1.5 h-px bg-[var(--divider)]" />
            </div>
          )}

          <div className="flex flex-col">
            <div className="px-3 pb-1 pt-0.5 text-[10px] font-bold tracking-wide text-[var(--text-faintest)]">
              카테고리
            </div>
            {categories.map((c) => (
              <SidebarItem
                key={c.id}
                label={c.name}
                count={categoryCounts[c.name] ?? 0}
                active={onDashboard && currentKey === `category:${c.name}`}
                onClick={() => onSelect({ type: "category", large: c.name })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SidebarItem({
  label,
  count,
  active,
  onClick,
  icon,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-[26px] items-center gap-1.5 px-2.5 text-left text-[11.5px] font-medium"
      style={{
        background: active ? "var(--accent-soft-bg)" : "transparent",
        color: active ? "var(--accent-soft-fg)" : "var(--text-secondary)",
        borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
      }}
    >
      {icon && <span className="flex-none">{icon}</span>}
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span
          className="ml-auto text-[10px]"
          style={{ color: active ? "var(--accent-soft-fg)" : "var(--text-faintest)" }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
