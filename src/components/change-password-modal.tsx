"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { FloatingWindow } from "@/components/floating-window";

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { currentUser, changePassword } = useStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!currentUser) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("모든 항목을 입력해주세요.");
      return;
    }
    if (newPassword.length < 4) {
      setError("새 비밀번호는 4자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    setSubmitting(true);
    setError("");
    const ok = await changePassword(currentUser.id, currentPassword, newPassword);
    setSubmitting(false);
    if (!ok) {
      setError("현재 비밀번호가 올바르지 않습니다.");
      return;
    }
    setSuccess(true);
  }

  return (
    <FloatingWindow
      title="비밀번호 변경"
      onClose={onClose}
      defaultWidth={360}
      defaultHeight={360}
      footer={
        success ? (
          <button
            onClick={onClose}
            className="h-7 rounded-[2px] px-3.5 text-[11.5px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            닫기
          </button>
        ) : (
          <>
            <button
              onClick={onClose}
              className="h-7 rounded-[2px] border border-[var(--border-strong)] px-3 text-[11.5px] text-[var(--text-muted)]"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="h-7 rounded-[2px] px-3.5 text-[11.5px] font-semibold disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              변경
            </button>
          </>
        )
      }
    >
      {success ? (
        <div className="py-6 text-center text-[12px] text-[var(--text)]">
          비밀번호가 변경되었습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <Field label="현재 비밀번호">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoFocus
              className="h-8 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[12px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </Field>
          <Field label="새 비밀번호">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-8 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[12px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </Field>
          <Field label="새 비밀번호 확인">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="h-8 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[12px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </Field>
          {error && (
            <div className="text-[10.5px]" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          )}
        </div>
      )}
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
