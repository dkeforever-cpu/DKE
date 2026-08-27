"use client";

import { ReactNode } from "react";
import { Dept } from "@/lib/types";
import { CATEGORY_TREE } from "@/lib/categories";

export type Selection =
  | { type: "mine" }
  | { type: "all" }
  | { type: "category"; large: string };

export function selectionKey(s: Selection): string {
  return s.type === "category" ? `category:${s.large}` : s.type;
}

export function Sidebar({
  dept,
  selection,
  onSelect,
  mineCount,
  allCount,
  categoryCounts,
}: {
  dept: Dept | "전체";
  selection: Selection;
  onSelect: (s: Selection) => void;
  mineCount: number;
  allCount: number;
  categoryCounts: Record<string, number>;
}) {
  const currentKey = selectionKey(selection);
  const categories = dept === "전체" ? [] : CATEGORY_TREE[dept];

  return (
    <div className="flex w-[168px] flex-none flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] py-1.5">
      <div className="flex flex-col">
        <SidebarItem
          label="내 업무"
          count={mineCount}
          active={currentKey === "mine"}
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
          active={currentKey === "all"}
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
      </div>

      <div className="mx-2.5 my-1.5 h-px bg-[var(--divider)]" />

      {dept === "전체" ? (
        <div className="mx-2 rounded-[4px] border border-dashed border-[var(--border-strong)] p-2 text-[10px] leading-relaxed text-[var(--text-faintest)]">
          상단에서 관리팀 또는 재경팀 탭을 선택하면
          <br />
          해당 부서의 세부 업무 분류가 표시됩니다.
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="px-3 pb-1 pt-0.5 text-[10px] font-bold tracking-wide text-[var(--text-faintest)]">
            {dept} 메뉴
          </div>
          {categories.map((c) => (
            <SidebarItem
              key={c.name}
              label={c.name}
              count={categoryCounts[c.name] ?? 0}
              active={currentKey === `category:${c.name}`}
              onClick={() => onSelect({ type: "category", large: c.name })}
            />
          ))}
        </div>
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
  count: number;
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
      <span
        className="ml-auto text-[10px]"
        style={{ color: active ? "var(--accent-soft-fg)" : "var(--text-faintest)" }}
      >
        {count}
      </span>
    </button>
  );
}
