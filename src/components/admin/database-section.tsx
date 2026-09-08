"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { FloatingWindow } from "@/components/floating-window";

const TABLE_LABELS: Record<string, string> = {
  teams: "팀 (teams)",
  centers: "센터 (centers)",
  users: "사용자 (users)",
  categoriesByTeam: "카테고리 트리 (categoriesByTeam)",
  boards: "게시판 (boards)",
  customFields: "커스텀 필드 (customFields)",
  tasks: "업무 (tasks)",
  logEntries: "업무 메모 (logEntries)",
  comments: "댓글 (comments)",
  resources: "자료실 (resources)",
  settings: "일반 설정 (settings)",
  calendarEvents: "캘린더 일정 (calendarEvents)",
};

function countOf(v: unknown): number {
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === "object") return Object.keys(v).length;
  return 0;
}

export function DatabaseSection() {
  const {
    teams,
    centers,
    users,
    categoriesByTeam,
    boards,
    customFields,
    allTasks,
    logEntries,
    comments,
    resources,
    calendarEvents,
    appTitle,
    appIconUrl,
    backendConfigured,
  } = useStore();
  const tables: Record<string, unknown> = {
    teams,
    centers,
    users,
    categoriesByTeam,
    boards,
    customFields,
    tasks: allTasks,
    logEntries,
    comments,
    resources,
    settings: { id: "app", appTitle, appIconUrl },
    calendarEvents,
  };
  const [openTable, setOpenTable] = useState<string | null>("tasks");
  const [exportOpen, setExportOpen] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const exportJson = JSON.stringify(tables, null, 2);

  function downloadJson() {
    // 다운로드를 시도해보되(자체 호스팅/로컬 파일에서는 정상 동작), 클로드
    // 아티팩트 화면처럼 다운로드 자체가 차단된 환경도 있으므로 항상 성공한다고
    // 가정하지 않는다 — 그래서 모달의 복사/선택 방식이 진짜 fallback이다.
    try {
      const blob = new Blob([exportJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dke-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // 무시 — 아래 모달에서 어차피 복사할 수 있다.
    }
    setExportOpen(true);
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopyMsg("복사되었습니다.");
    } catch {
      textareaRef.current?.focus();
      textareaRef.current?.select();
      setCopyMsg("자동 복사가 막혀 있어 텍스트를 전체 선택해두었습니다 — Ctrl+C(맥은 ⌘+C)로 복사해주세요.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3 rounded-[4px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-2.5">
        <div className="text-[10.5px] leading-relaxed text-[var(--text-faintest)]">
          {backendConfigured
            ? "구글 시트에 연동되어, 팀 전체가 같은 데이터를 공유합니다. 아래는 현재 데이터의 테이블별 구조·건수이며, 백업용으로 JSON을 내보낼 수 있습니다."
            : "지금은 이 브라우저의 localStorage에만 저장되는 구조입니다 — 다른 사람 기기의 데이터와 공유되지 않습니다. 아래는 현재 저장된 데이터의 테이블별 구조·건수이며, '백엔드 연동' 탭에서 구글 시트를 연결하면 팀 전체와 공유할 수 있고, 여기서 내보낸 JSON을 그대로 가져올 수 있습니다."}
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

      {exportOpen && (
        <FloatingWindow
          title="전체 JSON 내보내기"
          onClose={() => setExportOpen(false)}
          defaultWidth={560}
          defaultHeight={520}
          footer={
            <>
              <button
                onClick={() => setExportOpen(false)}
                className="h-7 rounded-[2px] border border-[var(--border-strong)] px-3 text-[11.5px] text-[var(--text-muted)]"
              >
                닫기
              </button>
              <button
                onClick={copyJson}
                className="h-7 rounded-[2px] px-3.5 text-[11.5px] font-semibold"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                전체 복사
              </button>
            </>
          }
        >
          <div className="flex h-full flex-col gap-2">
            <div className="text-[10.5px] leading-relaxed text-[var(--text-faint)]">
              파일 다운로드가 안 되는 화면(예: 클로드 아티팩트)에서도 쓸 수 있도록, 아래
              텍스트를 그대로 복사해서 구글 시트의 &lsquo;기존 데이터 가져오기&rsquo;
              창에 붙여넣으시면 됩니다. &lsquo;전체 복사&rsquo;가 안 먹으면 텍스트 상자를
              클릭한 뒤 Ctrl+A → Ctrl+C로 직접 복사해주세요.
            </div>
            {copyMsg && (
              <div className="text-[10.5px]" style={{ color: "var(--success)" }}>
                {copyMsg}
              </div>
            )}
            <textarea
              ref={textareaRef}
              readOnly
              value={exportJson}
              onFocus={(e) => e.currentTarget.select()}
              className="min-h-0 flex-1 resize-none rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface-alt)] p-2 font-mono text-[10px] leading-relaxed text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
            />
          </div>
        </FloatingWindow>
      )}
    </div>
  );
}
