"use client";

import { useState } from "react";
import { ACCENT_PRESETS, useTheme } from "@/lib/theme";

export function ThemeSettingsModal({ onClose }: { onClose: () => void }) {
  const { accent, mode, scale, setAccent, setMode, setScale } = useTheme();
  const [customHex, setCustomHex] = useState(accent);

  function applyCustomHex() {
    const v = customHex.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) setAccent(v);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
      <div className="w-full max-w-[420px] rounded-[6px] border border-[var(--border-strong)] bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--divider)] px-5 py-3.5">
          <div className="text-[13.5px] font-bold text-[var(--text)]">화면 설정</div>
          <button onClick={onClose} className="text-[var(--text-faint)] hover:text-[var(--text)]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold text-[var(--text-muted)]">메뉴 강조색</div>
            <div className="flex flex-wrap gap-1.5">
              {ACCENT_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setAccent(p.value);
                    setCustomHex(p.value);
                  }}
                  title={p.name}
                  className="flex h-7 w-7 items-center justify-center rounded-full border"
                  style={{
                    background: p.value,
                    borderColor:
                      accent.toLowerCase() === p.value.toLowerCase()
                        ? "var(--text)"
                        : "transparent",
                    outline:
                      accent.toLowerCase() === p.value.toLowerCase()
                        ? "2px solid var(--surface)"
                        : "none",
                    boxShadow:
                      accent.toLowerCase() === p.value.toLowerCase()
                        ? "0 0 0 1px var(--text)"
                        : "none",
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                onBlur={applyCustomHex}
                onKeyDown={(e) => e.key === "Enter" && applyCustomHex()}
                placeholder="#3355d6"
                className="h-7 w-[100px] rounded-[4px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
              <span className="text-[10.5px] text-[var(--text-faintest)]">직접 입력 (HEX)</span>
            </div>
          </div>

          <div className="h-px bg-[var(--divider)]" />

          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold text-[var(--text-muted)]">화면 모드</div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setMode("light")}
                className={`flex-1 rounded-[4px] border px-3 py-1.5 text-[12px] font-semibold ${
                  mode === "light"
                    ? "border-[var(--accent)] bg-[var(--accent-soft-bg)] text-[var(--accent-soft-fg)]"
                    : "border-[var(--border-strong)] text-[var(--text-muted)]"
                }`}
              >
                라이트
              </button>
              <button
                onClick={() => setMode("dark")}
                className={`flex-1 rounded-[4px] border px-3 py-1.5 text-[12px] font-semibold ${
                  mode === "dark"
                    ? "border-[var(--accent)] bg-[var(--accent-soft-bg)] text-[var(--accent-soft-fg)]"
                    : "border-[var(--border-strong)] text-[var(--text-muted)]"
                }`}
              >
                다크
              </button>
            </div>
          </div>

          <div className="h-px bg-[var(--divider)]" />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-[var(--text-muted)]">화면 배율</div>
              <div className="text-[11px] font-bold text-[var(--text)]">{scale}%</div>
            </div>
            <input
              type="range"
              min={80}
              max={130}
              step={5}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              style={{ accentColor: "var(--accent)" }}
            />
            <div className="flex justify-between text-[10px] text-[var(--text-faintest)]">
              <span>80%</span>
              <span>100%</span>
              <span>130%</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-[var(--divider)] px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-[4px] bg-[var(--accent)] px-4 py-[7px] text-[12px] font-semibold text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
