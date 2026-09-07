"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { getBackendConfig } from "@/lib/gas-client";
import { BackendSettingsModal } from "@/components/backend-settings-modal";

/**
 * 이 앱 코드(리액트 번들) 자신이 실제로 돌아가는 그 자리에서
 * google.script.run이 보이는지 확인한다. 스크립트가 늦게 붙는 경우를
 * 대비해 1.5초 지연 후 자동으로 한 번 확인하고, 버튼으로 언제든 다시
 * 확인할 수 있다.
 */
function checkScriptRun(): boolean {
  return !!(window as unknown as { google?: { script?: { run?: unknown } } }).google?.script?.run;
}

function BackendRunDiagnostic() {
  const [result, setResult] = useState<boolean | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  function runCheck() {
    setResult(checkScriptRun());
    setCheckedAt(new Date().toLocaleTimeString("ko-KR"));
  }

  useEffect(() => {
    const timer = setTimeout(runCheck, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] px-3 py-2 text-[10.5px]">
      <span className="font-semibold text-[var(--text-muted)]">google.script.run 존재 여부:</span>
      <span
        className="font-mono font-bold"
        style={{ color: result === null ? "var(--text-faint)" : result ? "var(--success)" : "var(--danger)" }}
      >
        {result === null ? "확인 중..." : String(result)}
      </span>
      {checkedAt && <span className="text-[9.5px] text-[var(--text-faintest)]">({checkedAt} 확인)</span>}
      <button
        onClick={runCheck}
        className="ml-auto h-6 flex-none rounded-[2px] border border-[var(--border-strong)] px-2 text-[10px] font-semibold text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        다시 확인
      </button>
    </div>
  );
}

export function BackendSection() {
  const { backendConfigured, syncError, dismissSyncError } = useStore();
  const [open, setOpen] = useState(false);
  const config = getBackendConfig();

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] text-[var(--text-faint)]">
        구글 시트를 데이터베이스로, 구글 드라이브를 파일 저장소로 쓰도록 연동합니다. 연동하면
        팀 전체가 같은 데이터를 실시간으로 공유하고, 이 브라우저의 localStorage에만 있던
        데이터는 더 이상 쓰이지 않습니다. 설치 방법은 별도 설치 매뉴얼을 참고하세요.
      </div>

      <div className="flex items-center gap-2 border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2.5">
        <span
          className="h-2 w-2 flex-none rounded-full"
          style={{ background: backendConfigured ? "var(--success)" : "var(--text-disabled)" }}
        />
        <div className="flex-1">
          <div className="text-[11.5px] font-semibold text-[var(--text)]">
            {backendConfigured ? "연동됨" : "연동 안 됨 (로컬 저장 모드)"}
          </div>
          {backendConfigured && config && (
            <div className="truncate text-[10px] text-[var(--text-faintest)]" title={config.url}>
              {config.url}
            </div>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="h-7 flex-none rounded-[2px] border border-[var(--border-strong)] px-2.5 text-[10.5px] font-semibold text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {backendConfigured ? "설정 다시 열기" : "지금 연동하기"}
        </button>
      </div>

      {syncError && (
        <div
          className="flex items-start justify-between gap-2 rounded-[2px] px-2.5 py-2 text-[10.5px]"
          style={{ background: "var(--danger-soft-bg)", color: "var(--danger)" }}
        >
          <span>동기화 실패: {syncError} (화면에는 반영되었지만 구글 시트에는 저장되지 않았을 수 있습니다)</span>
          <button onClick={dismissSyncError} className="flex-none font-semibold">
            닫기
          </button>
        </div>
      )}

      <BackendRunDiagnostic />

      {open && <BackendSettingsModal onClose={() => setOpen(false)} />}
    </div>
  );
}
