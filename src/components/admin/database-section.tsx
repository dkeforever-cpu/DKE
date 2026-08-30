"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

const TABLE_LABELS: Record<string, string> = {
  teams: "팀 (teams)",
  users: "사용자 (users)",
  categoriesByTeam: "카테고리 트리 (categoriesByTeam)",
  boards: "게시판 (boards)",
  customFields: "커스텀 필드 (customFields)",
  tasks: "업무 (tasks)",
  logEntries: "진행 일지 (logEntries)",
  comments: "댓글 (comments)",
};

function countOf(v: unknown): number {
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === "object") return Object.keys(v).length;
  return 0;
}

export function DatabaseSection() {
  const { teams, users, categoriesByTeam, boards, customFields, allTasks, logEntries, comments } =
    useStore();
  const tables: Record<string, unknown> = {
    teams,
    users,
    categoriesByTeam,
    boards,
    customFields,
    tasks: allTasks,
    logEntries,
    comments,
  };
  const [openTable, setOpenTable] = useState<string | null>("tasks");

  function downloadJson() {
    const blob = new Blob([JSON.stringify(tables, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dke-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3 rounded-[4px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-2.5">
        <div className="text-[10.5px] leading-relaxed text-[var(--text-faintest)]">
          지금은 별도 서버 DB 없이, 이 브라우저의 localStorage에만 저장되는 구조입니다 — 다른 사람
          기기의 데이터와 공유되지 않습니다. 아래는 현재 저장된 데이터의 테이블별 구조·건수이며,
          실제 백엔드(DB)를 구성할 때 테이블 설계 참고용으로 JSON을 내보낼 수 있습니다.
        </div>
        <button
          onClick={downloadJson}
          className="h-7 flex-none rounded-[3px] border border-[var(--border-strong)] px-2.5 text-[10.5px] font-semibold text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          전체 JSON 내보내기
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {Object.entries(tables).map(([key, value]) => {
          const open = openTable === key;
          return (
            <div key={key} className="border border-[var(--border)]">
              <button
                onClick={() => setOpenTable(open ? null : key)}
                className="flex h-8 w-full items-center justify-between px-2.5 text-left"
                style={{ background: open ? "var(--accent-soft-bg)" : "transparent" }}
              >
                <span
                  className="text-[11.5px] font-semibold"
                  style={{ color: open ? "var(--accent-soft-fg)" : "var(--text)" }}
                >
                  {TABLE_LABELS[key] ?? key}
                </span>
                <span className="text-[10px] text-[var(--text-faintest)]">{countOf(value)}건</span>
              </button>
              {open && (
                <pre className="max-h-[360px] overflow-auto border-t border-[var(--divider)] bg-[var(--surface-alt)] p-2.5 text-[10px] leading-relaxed text-[var(--text-secondary)]">
                  {JSON.stringify(value, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
