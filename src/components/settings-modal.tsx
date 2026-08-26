"use client";

import { useState } from "react";
import { getApiUrl, setApiUrl, gasClient, GasApiError } from "@/lib/gas-client";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState(getApiUrl());
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleTest() {
    setTesting(true);
    setResult(null);
    const trimmed = url.trim();
    const prevUrl = getApiUrl();
    setApiUrl(trimmed);
    try {
      await gasClient.call("bootstrap");
      setResult({ ok: true, message: "연결 성공! 구글 시트와 정상적으로 연결되었습니다." });
    } catch (err) {
      setApiUrl(prevUrl);
      const message = err instanceof GasApiError ? err.message : "연결에 실패했습니다.";
      setResult({ ok: false, message });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    setApiUrl(url.trim());
    window.location.reload();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-[520px] rounded-[10px] bg-white p-6 shadow-xl">
        <div className="mb-1 text-[15px] font-bold text-[#1a1d24]">데이터 연동 설정</div>
        <p className="mb-4 text-[12.5px] leading-relaxed text-[#5b6068]">
          구글 시트를 데이터베이스로, 구글 드라이브를 파일 저장소로 사용합니다. 배포한
          Google Apps Script 웹앱의 URL을 아래에 입력하세요. 아직 배포하지 않았다면{" "}
          <code className="rounded bg-[#f3f4f6] px-1 py-0.5 text-[11.5px]">apps-script/README.md</code>{" "}
          의 안내를 참고해주세요.
        </p>

        <label className="mb-1 block text-[11.5px] font-semibold text-[#1a1d24]">
          Apps Script 웹앱 URL
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://script.google.com/macros/s/xxxxx/exec"
          className="mb-3 w-full rounded-[7px] border border-[#dde0e4] px-3 py-2 text-[12.5px] outline-none focus:border-[#23262e]"
        />

        {result && (
          <div
            className={`mb-3 rounded-[7px] px-3 py-2 text-[12px] ${
              result.ok
                ? "bg-[#eafaf0] text-[#1a7a4c]"
                : "bg-[#fdecec] text-[#c23636]"
            }`}
          >
            {result.message}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-[7px] px-3 py-[7px] text-[12.5px] font-medium text-[#5b6068] hover:bg-[#f3f4f6]"
          >
            취소
          </button>
          <button
            onClick={handleTest}
            disabled={!url.trim() || testing}
            className="rounded-[7px] border border-[#dde0e4] px-3 py-[7px] text-[12.5px] font-medium text-[#1a1d24] hover:bg-[#f3f4f6] disabled:opacity-50"
          >
            {testing ? "확인 중..." : "연결 테스트"}
          </button>
          <button
            onClick={handleSave}
            disabled={!url.trim()}
            className="rounded-[7px] bg-[#23262e] px-3 py-[7px] text-[12.5px] font-medium text-white hover:bg-[#1a1d24] disabled:opacity-50"
          >
            저장하고 새로고침
          </button>
        </div>
      </div>
    </div>
  );
}
