"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

export function GeneralSection() {
  const { appTitle, updateAppTitle } = useStore();
  const [draft, setDraft] = useState(appTitle);

  function handleSave() {
    if (!draft.trim() || draft.trim() === appTitle) return;
    updateAppTitle(draft.trim());
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] text-[var(--text-faint)]">
        로그인 화면과 상단바에 표시되는 프로그램 이름을 바꿀 수 있습니다.
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10.5px] font-semibold text-[var(--text-muted)]">프로그램 제목</label>
        <div className="flex gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="예: 물류센터 업무관리 시스템"
            className="h-7 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={handleSave}
            disabled={!draft.trim() || draft.trim() === appTitle}
            className="h-7 flex-none rounded-[2px] px-3 text-[11px] font-semibold disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
