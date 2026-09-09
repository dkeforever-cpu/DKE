"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/lib/confirm-dialog";
import { buildAndDownloadExcel } from "@/lib/excel-export";
import { todayStr } from "@/lib/format";

function defaultFilename() {
  return `업무현황_${todayStr()}`;
}

// 파일명에 못 쓰는 문자(윈도우 기준 \ / : * ? " < > |)는 지워서, 사용자가
// 실수로 넣어도 다운로드 자체가 깨지지 않게 한다.
function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

export function ExcelSection() {
  const { teams, users, allTasks, calendarEvents, logEntries, comments } = useStore();
  const { confirm, alertUser } = useConfirmDialog();
  const [downloading, setDownloading] = useState(false);
  const [filename, setFilename] = useState(defaultFilename);

  async function handleDownload() {
    if (!(await confirm("현재 데이터를 엑셀 파일로 다운로드하시겠습니까?"))) return;
    setDownloading(true);
    try {
      const name = `${sanitizeFilename(filename) || defaultFilename()}.xlsx`;
      await buildAndDownloadExcel(
        { teams, users, tasks: allTasks, calendarEvents, logEntries, comments },
        name
      );
    } catch (err) {
      console.error("[Excel 다운로드 실패]", err);
      const detail = err instanceof Error ? err.message : String(err);
      await alertUser(`엑셀 파일을 만드는 중 문제가 발생했습니다.\n(${detail})`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[4px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-2.5 text-[10.5px] leading-relaxed text-[var(--text-faintest)]">
        현재 저장된 전체 데이터를 엑셀(.xlsx) 파일로 내려받습니다. 시트 구성은 다음과 같습니다.
        <br />
        1. <b>캘린더</b> — 등록·마감일과 일정을 달력 형태로 표시
        <br />
        2. <b>전체업무</b> — 업무 목록 (업무명을 누르면 3번 시트의 해당 업무로 이동)
        <br />
        3. <b>업무 세부내용</b> — 업무별 필요 업무·업무 메모·댓글
        <br />
        처음 누를 때 서식 라이브러리를 추가로 받아오기 때문에 몇 초 걸릴 수 있습니다.
      </div>

      <div className="flex items-center gap-1.5">
        <label className="text-[10.5px] font-semibold text-[var(--text-muted)]">파일명</label>
        <input
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          disabled={downloading}
          placeholder={defaultFilename()}
          className="h-7 w-56 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)] disabled:opacity-60"
        />
        <span className="text-[10.5px] text-[var(--text-faintest)]">.xlsx</span>
      </div>

      <button
        onClick={handleDownload}
        disabled={downloading}
        className="h-8 w-fit flex-none rounded-[3px] border border-[var(--border-strong)] px-3 text-[11.5px] font-semibold text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
      >
        {downloading ? "만드는 중..." : "Excel 다운로드"}
      </button>
    </div>
  );
}
