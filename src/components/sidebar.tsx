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
    <div className="flex w-[216px] flex-none flex-col gap-4 overflow-y-auto border-r border-[#e3e5e9] bg-white p-3">
      <div className="flex flex-col gap-0.5">
        <SidebarItem
          label="내 업무"
          count={mineCount}
          active={currentKey === "mine"}
          onClick={() => onSelect({ type: "mine" })}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          }
        />
      </div>

      <div className="h-px bg-[#eef0f2]" />

      {dept === "전체" ? (
        <div className="rounded-md border border-dashed border-[#d7dbe0] p-2.5 text-[10.5px] leading-relaxed text-[#a6abb5]">
          상단에서 관리팀 또는 재경팀 탭을 선택하면
          <br />
          해당 부서의 세부 업무 분류가 표시됩니다.
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          <div className="px-2.5 pb-1.5 pt-0.5 text-[10.5px] font-bold tracking-wide text-[#a6abb5]">
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
      className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12.5px] font-semibold ${
        active ? "bg-[#e7edff] text-[#3355d6]" : "text-[#3d4148] hover:bg-[#f5f6f8]"
      }`}
    >
      {icon && <span className={active ? "text-[#3355d6]" : "text-[#5b6068]"}>{icon}</span>}
      <span className="truncate">{label}</span>
      <span className={`ml-auto text-[10.5px] ${active ? "text-[#3355d6]" : "text-[#a6abb5]"}`}>
        {count}
      </span>
    </button>
  );
}
