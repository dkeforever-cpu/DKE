"use client";

import { ChangeEvent, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useRequireAuth } from "@/lib/use-require-auth";
import { AppShell } from "@/components/app-shell";
import { FloatingWindow } from "@/components/floating-window";
import { readFileAsBase64, MAX_FILE_SIZE_LABEL } from "@/lib/download";
import { formatDateShort } from "@/lib/format";

export const CATEGORIES = ["업무메뉴얼", "양식/서식", "안내자료", "기타"];

export default function ResourcesPage() {
  const { ready, currentUser } = useRequireAuth();
  const { resources, getUser } = useStore();
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState("전체");
  const [uploadOpen, setUploadOpen] = useState(false);

  if (!ready || !currentUser) return null;

  const filtered =
    categoryFilter === "전체" ? resources : resources.filter((r) => r.category === categoryFilter);
  const sorted = [...filtered].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <AppShell>
      <div className="flex h-8 flex-none items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4">
        <span className="flex-none whitespace-nowrap text-[10.5px] font-semibold text-[var(--text)]">자료실</span>
        <span className="hidden truncate text-[9.5px] text-[var(--text-faintest)] sm:inline">
          업무 매뉴얼·양식 등 팀원이 만든 자료를 올리고 내려받을 수 있는 게시판입니다.
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
        <div className="flex flex-none flex-wrap items-center gap-1.5">
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

        <div className="flex flex-1 flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex-1 overflow-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[52px_92px_1fr_92px_80px_56px] border-b border-[var(--border-strong)] bg-[var(--surface-alt)] px-2 py-1.5 text-[10px] font-bold text-[var(--text-faint)]">
                <div>번호</div>
                <div>분류</div>
                <div>제목</div>
                <div>작성자</div>
                <div>등록일</div>
                <div className="text-center">파일</div>
              </div>

              {sorted.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-[11.5px] text-[var(--text-faintest)]">
                  등록된 자료가 없습니다. &lsquo;자료 업로드&rsquo;로 첫 자료를 올려보세요.
                </div>
              ) : (
                sorted.map((r, i) => {
                  const uploader = getUser(r.uploadedBy);
                  return (
                    <button
                      key={r.id}
                      onClick={() => router.push(`/resources/${r.id}`)}
                      className="grid w-full grid-cols-[52px_92px_1fr_92px_80px_56px] items-center border-b border-[var(--divider)] px-2 text-left last:border-0 hover:bg-[var(--surface-alt)]"
                      style={{ height: "var(--row-h)" }}
                    >
                      <div className="text-[10.5px] text-[var(--text-faint)]">{sorted.length - i}</div>
                      <div>
                        <span
                          className="rounded-[3px] px-1.5 py-0.5 text-[9.5px] font-bold"
                          style={{ background: "var(--neutral-soft-bg)", color: "var(--neutral-soft-fg)" }}
                        >
                          {r.category}
                        </span>
                      </div>
                      <div className="truncate text-[11.5px] font-medium text-[var(--text)]">{r.title}</div>
                      <div className="truncate text-[10.5px] text-[var(--text-muted)]">{uploader?.name ?? "-"}</div>
                      <div className="text-[10.5px] text-[var(--text-faint)]">{formatDateShort(r.createdAt.slice(0, 10))}</div>
                      <div className="text-center text-[10.5px] text-[var(--text-faint)]">{r.files.length}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {uploadOpen && <ResourceUploadModal onClose={() => setUploadOpen(false)} />}
    </AppShell>
  );
}

function ResourceUploadModal({ onClose }: { onClose: () => void }) {
  const { currentUser, addResource } = useStore();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<{ name: string; base64: string; mimeType: string; size: number }[]>([]);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);

  async function handleFilePick(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files;
    if (!picked) return;
    const list = Array.from(picked);
    e.target.value = "";
    setReading(true);
    setError("");
    for (const file of list) {
      try {
        const read = await readFileAsBase64(file);
        setFiles((prev) => [...prev, read]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "파일을 읽지 못했습니다.");
      }
    }
    setReading(false);
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
      defaultHeight={580}
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
            disabled={reading}
            className="h-7 rounded-[2px] px-3.5 text-[11.5px] font-semibold disabled:opacity-50"
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

      <Field label={`파일 (개당 최대 ${MAX_FILE_SIZE_LABEL})`}>
        <div className="flex flex-col gap-1.5">
          {files.length > 0 && (
            <div className="flex flex-col gap-1">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-[2px] border border-[var(--border)] bg-[var(--surface-alt)] px-2 py-1"
                >
                  <span className="flex-1 truncate text-[10.5px] text-[var(--text)]">{f.name}</span>
                  <span className="flex-none text-[9.5px] text-[var(--text-faintest)]">
                    {(f.size / 1024).toFixed(0)}KB
                  </span>
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
            {reading ? "읽는 중..." : "파일 선택"}
            <input type="file" multiple className="hidden" onChange={handleFilePick} disabled={reading} />
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
