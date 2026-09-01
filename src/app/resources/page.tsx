"use client";

import { ChangeEvent, ReactNode, useState } from "react";
import { useStore } from "@/lib/store";
import { useRequireAuth } from "@/lib/use-require-auth";
import { useConfirmDialog } from "@/lib/confirm-dialog";
import { AppShell } from "@/components/app-shell";
import { FloatingWindow } from "@/components/floating-window";
import { Avatar } from "@/components/avatar";
import { FileIcon, TrashIcon } from "@/components/comment-thread";
import { formatDateTime } from "@/lib/format";

const CATEGORIES = ["업무메뉴얼", "양식/서식", "안내자료", "기타"];

export default function ResourcesPage() {
  const { ready, currentUser } = useRequireAuth();
  const { resources, deleteResource, getUser } = useStore();
  const { confirm } = useConfirmDialog();
  const [categoryFilter, setCategoryFilter] = useState("전체");
  const [uploadOpen, setUploadOpen] = useState(false);

  if (!ready || !currentUser) return null;

  const filtered =
    categoryFilter === "전체" ? resources : resources.filter((r) => r.category === categoryFilter);
  const sorted = [...filtered].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  async function handleDelete(id: string) {
    if (await confirm("이 자료를 삭제할까요?")) deleteResource(id);
  }

  return (
    <AppShell>
      <div className="flex h-8 flex-none items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4">
        <span className="flex-none whitespace-nowrap text-[10.5px] font-semibold text-[var(--text)]">자료실</span>
        <span className="hidden truncate text-[9.5px] text-[var(--text-faintest)] sm:inline">
          업무 매뉴얼·양식 등 팀원이 만든 자료를 올리고 내려받을 수 있는 공간입니다.
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCategoryFilter("전체")}
            className="h-6 flex-none whitespace-nowrap rounded-[3px] px-2.5 text-[10.5px] font-semibold"
            style={
              categoryFilter === "전체"
                ? { background: "var(--accent)", color: "var(--accent-fg)" }
                : { color: "var(--text-muted)", border: "1px solid var(--border-strong)" }
            }
          >
            전체
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className="h-6 flex-none whitespace-nowrap rounded-[3px] px-2.5 text-[10.5px] font-semibold"
              style={
                categoryFilter === c
                  ? { background: "var(--accent)", color: "var(--accent-fg)" }
                  : { color: "var(--text-muted)", border: "1px solid var(--border-strong)" }
              }
            >
              {c}
            </button>
          ))}
          <div className="hidden flex-1 sm:block" />
          <button
            onClick={() => setUploadOpen(true)}
            className="flex h-6 flex-none items-center gap-1 whitespace-nowrap rounded-[3px] px-2.5 text-[10.5px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            자료 업로드
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-[11.5px] text-[var(--text-faintest)]">
            등록된 자료가 없습니다. &lsquo;자료 업로드&rsquo;로 첫 자료를 올려보세요.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {sorted.map((r) => {
              const uploader = getUser(r.uploadedBy);
              const canDelete = currentUser.id === r.uploadedBy || currentUser.isAdmin;
              return (
                <div key={r.id} className="flex gap-3 border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="rounded-[3px] px-1.5 py-0.5 text-[9.5px] font-bold"
                        style={{ background: "var(--neutral-soft-bg)", color: "var(--neutral-soft-fg)" }}
                      >
                        {r.category}
                      </span>
                      <span className="text-[12.5px] font-bold text-[var(--text)]">{r.title}</span>
                    </div>
                    {r.description && (
                      <div className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                        {r.description}
                      </div>
                    )}
                    {r.files.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {r.files.map((f, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1 rounded-[2px] border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]"
                          >
                            <FileIcon />
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Avatar id={r.uploadedBy} name={uploader?.name ?? "?"} size={16} />
                      <span className="text-[10px] text-[var(--text-faintest)]">
                        {uploader?.name ?? "알 수 없음"} · {formatDateTime(r.createdAt)}
                      </span>
                    </div>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(r.id)}
                      title="삭제"
                      className="flex-none text-[var(--text-faintest)] hover:text-[var(--danger)]"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {uploadOpen && (
        <ResourceUploadModal onClose={() => setUploadOpen(false)} />
      )}
    </AppShell>
  );
}

function ResourceUploadModal({ onClose }: { onClose: () => void }) {
  const { currentUser, addResource } = useStore();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [error, setError] = useState("");

  function handleFilePick(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files;
    if (!picked) return;
    const names = Array.from(picked).map((f) => f.name);
    e.target.value = "";
    setFiles((prev) => [...prev, ...names]);
  }

  function handleSubmit() {
    if (!currentUser) return;
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }
    if (files.length === 0) {
      setError("첨부할 파일을 최소 1개 선택해주세요.");
      return;
    }
    addResource({
      title: title.trim(),
      description: description.trim(),
      category,
      files,
      uploadedBy: currentUser.id,
    });
    onClose();
  }

  return (
    <FloatingWindow
      title="자료 업로드"
      onClose={onClose}
      defaultWidth={460}
      defaultHeight={560}
      footer={
        <>
          <button
            onClick={onClose}
            className="h-7 rounded-[2px] border border-[var(--border-strong)] px-3 text-[11.5px] text-[var(--text-muted)]"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="h-7 rounded-[2px] px-3.5 text-[11.5px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            업로드
          </button>
        </>
      }
    >
      <Field label="제목">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 재고 실사 업무 매뉴얼"
          className="h-7 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      </Field>

      <Field label="분류">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-7 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11.5px] text-[var(--text)]"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="설명 (선택)">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="자료에 대한 간단한 설명을 입력하세요"
          className="h-16 resize-none rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1.5 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      </Field>

      <Field label="파일">
        <div className="flex flex-col gap-1.5">
          {files.length > 0 && (
            <div className="flex flex-col gap-1">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-[2px] border border-[var(--border)] bg-[var(--surface-alt)] px-2 py-1"
                >
                  <FileIcon />
                  <span className="flex-1 truncate text-[10.5px] text-[var(--text)]">{f}</span>
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-[var(--text-faintest)] hover:text-[var(--danger)]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="flex h-7 w-fit cursor-pointer items-center gap-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 text-[10.5px] text-[var(--text-muted)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8">
              <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            파일 선택
            <input type="file" multiple className="hidden" onChange={handleFilePick} />
          </label>
        </div>
      </Field>

      {error && <div className="text-[10.5px]" style={{ color: "var(--danger)" }}>{error}</div>}
    </FloatingWindow>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10.5px] font-semibold text-[var(--text-muted)]">{label}</label>
      {children}
    </div>
  );
}
