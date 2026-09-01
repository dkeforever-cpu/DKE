"use client";

import { createContext, ReactNode, useCallback, useContext, useState } from "react";

// Replaces window.confirm()/alert() with an in-app dialog. The native
// dialogs are blocked (silently return false/resolve instantly) inside a
// sandboxed iframe without allow-modals — which is exactly how the
// published Artifact preview renders this app, so every delete button
// gated behind window.confirm() looked like it simply did nothing there.
interface DialogState {
  message: string;
  kind: "confirm" | "alert";
  resolve: (v: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (message: string) => Promise<boolean>;
  alertUser: (message: string) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, kind: "confirm", resolve });
    });
  }, []);

  const alertUser = useCallback((message: string) => {
    return new Promise<void>((resolve) => {
      setState({ message, kind: "alert", resolve: () => resolve() });
    });
  }, []);

  function choose(v: boolean) {
    state?.resolve(v);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm, alertUser }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-6">
          <div
            className="flex w-full max-w-[360px] flex-col gap-4 border border-[var(--border-strong)] bg-[var(--surface)] p-4"
            style={{ boxShadow: "var(--shadow-menu)" }}
          >
            <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--text)]">
              {state.message}
            </div>
            <div className="flex justify-end gap-1.5">
              {state.kind === "confirm" && (
                <button
                  onClick={() => choose(false)}
                  className="h-7 rounded-[2px] border border-[var(--border-strong)] px-3 text-[11.5px] text-[var(--text-muted)]"
                >
                  취소
                </button>
              )}
              <button
                onClick={() => choose(true)}
                autoFocus
                className="h-7 rounded-[2px] px-3.5 text-[11.5px] font-semibold text-white"
                style={{ background: state.kind === "confirm" ? "var(--danger)" : "var(--accent)" }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirmDialog must be used within ConfirmDialogProvider");
  return ctx;
}
