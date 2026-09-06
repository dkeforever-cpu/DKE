"use client";

import { useState } from "react";
import {
  clearBackendConfig,
  gas,
  getBackendConfig,
  getSelfHostedBackendUrl,
  GasApiError,
  setBackendConfig,
} from "@/lib/gas-client";
import { FloatingWindow } from "@/components/floating-window";

export function BackendSettingsModal({ onClose }: { onClose: () => void }) {
  const existing = getBackendConfig();
  const selfHostedUrl = getSelfHostedBackendUrl();
  const [url, setUrl] = useState(existing?.url ?? selfHostedUrl ?? "");
  const [token, setToken] = useState(existing?.token ?? "");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleTest() {
    const trimmedUrl = url.trim();
    const trimmedToken = token.trim();
    if (!trimmedUrl || !trimmedToken) return;
    setTesting(true);
    setResult(null);
    try {
      await gas.testConnection({ url: trimmedUrl, token: trimmedToken });
      setResult({ ok: true, message: "연결 성공! 구글 시트와 정상적으로 연결되었습니다." });
    } catch (err) {
      const message = err instanceof GasApiError ? err.message : "연결에 실패했습니다.";
      setResult({ ok: false, message });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    setBackendConfig(url.trim(), token.trim());
    window.location.reload();
  }

  function handleDisconnect() {
    clearBackendConfig();
    window.location.reload();
  }

  return (
    <FloatingWindow title="데이터 연동 설정 (구글 시트 · 드라이브)" onClose={onClose} defaultWidth={480} defaultHeight={440}>
      <div className="flex flex-col gap-2.5">
        <div className="text-[10.5px] leading-relaxed text-[var(--text-faint)]">
          구글 시트를 데이터베이스로, 구글 드라이브를 파일 저장소로 씁니다. 배포한 Apps Script
          웹 앱의 URL과 API 토큰을 아래에 입력하세요. 아직 설치하지 않았다면 설치 매뉴얼을
          참고해주세요.
        </div>

        {selfHostedUrl && !existing && (
          <div
            className="rounded-[2px] px-2.5 py-2 text-[10.5px] leading-relaxed"
            style={{ background: "var(--accent-soft-bg)", color: "var(--accent-soft-fg)" }}
          >
            이 화면은 배포된 웹 앱에서 직접 열렸습니다 — 주소가 자동으로 채워졌습니다. API
            토큰만 입력하시면 됩니다 (스프레드시트 메뉴 → &lsquo;3. API 토큰 다시 보기&rsquo;).
          </div>
        )}

        <Field label="Apps Script 웹 앱 URL">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/xxxxx/exec"
            className="h-8 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
        </Field>
        <Field label="API 토큰">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Apps Script 편집기 메뉴의 '3. API 토큰 다시 보기'에서 확인"
            className="h-8 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
        </Field>

        {result && (
          <div
            className="rounded-[2px] px-2.5 py-2 text-[10.5px]"
            style={
              result.ok
                ? { background: "var(--success-soft-bg)", color: "var(--success)" }
                : { background: "var(--danger-soft-bg)", color: "var(--danger)" }
            }
          >
            {result.message}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleTest}
            disabled={!url.trim() || !token.trim() || testing}
            className="h-7 flex-none rounded-[2px] border border-[var(--border-strong)] px-2.5 text-[10.5px] font-semibold text-[var(--text-muted)] disabled:opacity-40"
          >
            {testing ? "확인 중..." : "연결 테스트"}
          </button>
          <button
            onClick={handleSave}
            disabled={!url.trim() || !token.trim()}
            className="h-7 flex-none rounded-[2px] px-2.5 text-[10.5px] font-semibold disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            저장하고 새로고침
          </button>
          <div className="flex-1" />
          {existing && (
            <button
              onClick={handleDisconnect}
              className="h-7 flex-none rounded-[2px] border px-2.5 text-[10.5px] font-semibold"
              style={{ borderColor: "var(--danger-soft-bg)", color: "var(--danger)" }}
            >
              연동 해제
            </button>
          )}
        </div>

        <div className="mt-1 border-t border-[var(--divider)] pt-2.5 text-[9.5px] leading-relaxed text-[var(--text-faintest)]">
          연동 해제 시 이 브라우저는 다시 로컬 저장(localStorage) 모드로 동작합니다 — 구글
          시트의 데이터는 지워지지 않습니다. 연동 중에는 &lsquo;테스트 데이터 초기화&rsquo;
          기능이 비활성화됩니다 (팀 전체가 공유하는 데이터가 실수로 지워지는 것을 막기 위함).
        </div>
      </div>
    </FloatingWindow>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10.5px] font-semibold text-[var(--text-muted)]">{label}</label>
      {children}
    </div>
  );
}
