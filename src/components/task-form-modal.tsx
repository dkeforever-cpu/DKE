"use client";

import { ReactNode, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { ChecklistItem, Priority, Status, Task } from "@/lib/types";
import { CALENDAR_PALETTE, taskColor } from "@/lib/calendar";
import { FloatingWindow } from "@/components/floating-window";

const STATUSES: Status[] = ["대기", "진행중", "검토중", "완료"];
const PRIORITIES: Priority[] = ["높음", "보통", "낮음"];

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const inputCls =
  "h-7 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]";

export function TaskFormModal({
  mode,
  initialTeamId,
  task,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initialTeamId: string;
  task?: Task;
  onClose: () => void;
  onSaved: (taskId: string) => void;
}) {
  const { users, teams, centers, categoriesByTeam, currentUser, addTask, updateTask } = useStore();

  const creatableTeams = useMemo(
    () => teams.filter((t) => currentUser?.viewTeamIds.includes(t.id)),
    [teams, currentUser]
  );

  const [teamId, setTeamId] = useState(task?.teamId ?? initialTeamId ?? creatableTeams[0]?.id ?? "");
  const tree = categoriesByTeam[teamId] ?? [];
  const [large, setLarge] = useState(task?.categoryLarge ?? tree[0]?.name ?? "");
  const largeNode = tree.find((n) => n.name === large) ?? tree[0];
  const [medium, setMedium] = useState(
    task?.categoryMedium ?? largeNode?.children[0]?.name ?? ""
  );
  const mediumNode =
    largeNode?.children.find((n) => n.name === medium) ?? largeNode?.children[0];
  const [small, setSmall] = useState(task?.categorySmall ?? mediumNode?.children[0]?.name ?? "");

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? currentUser?.id ?? users[0]?.id ?? "");
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>(task?.collaboratorIds ?? []);
  const [center, setCenter] = useState(task?.center ?? centers[0]);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaultDueDate());
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "보통");
  const [status, setStatus] = useState<Status>(task?.status ?? "대기");
  const [level, setLevel] = useState(task?.level ?? 1);
  const [color, setColor] = useState<string | undefined>(task?.color);
  const [checklistDraft, setChecklistDraft] = useState<string[]>([]);
  const [newChecklistLabel, setNewChecklistLabel] = useState("");
  const [error, setError] = useState("");

  function addChecklistDraftItem() {
    if (!newChecklistLabel.trim()) return;
    setChecklistDraft((prev) => [...prev, newChecklistLabel.trim()]);
    setNewChecklistLabel("");
  }

  function handleTeamChange(next: string) {
    setTeamId(next);
    const t = categoriesByTeam[next] ?? [];
    setLarge(t[0]?.name ?? "");
    setMedium(t[0]?.children[0]?.name ?? "");
    setSmall(t[0]?.children[0]?.children[0]?.name ?? "");
  }

  function handleLargeChange(name: string) {
    setLarge(name);
    const node = tree.find((n) => n.name === name);
    setMedium(node?.children[0]?.name ?? "");
    setSmall(node?.children[0]?.children[0]?.name ?? "");
  }

  function handleMediumChange(name: string) {
    setMedium(name);
    const node = largeNode?.children.find((n) => n.name === name);
    setSmall(node?.children[0]?.name ?? "");
  }

  function toggleCollaborator(id: string) {
    setCollaboratorIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  const canSubmit = useMemo(() => title.trim().length > 0, [title]);

  function handleSubmit() {
    if (!currentUser) return;
    if (!canSubmit) {
      setError("업무 제목을 입력해주세요.");
      return;
    }
    if (mode === "create") {
      const now = new Date().toISOString();
      const checklist: ChecklistItem[] = checklistDraft.map((label, i) => ({
        id: `ci_${Date.now().toString(36)}_${i}`,
        label,
        progress: 0,
        createdAt: now,
        children: [],
      }));
      const id = addTask({
        title: title.trim(),
        description: description.trim(),
        teamId,
        categoryLarge: large,
        categoryMedium: medium,
        categorySmall: small,
        assigneeId,
        collaboratorIds: collaboratorIds.filter((id2) => id2 !== assigneeId),
        center,
        priority,
        status,
        level,
        dueDate,
        createdBy: currentUser.id,
        checklist,
        color,
      });
      onSaved(id);
    } else if (task) {
      updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        teamId,
        categoryLarge: large,
        categoryMedium: medium,
        categorySmall: small,
        assigneeId,
        collaboratorIds: collaboratorIds.filter((id2) => id2 !== assigneeId),
        center,
        priority,
        status,
        level,
        dueDate,
        color,
      });
      onSaved(task.id);
    }
  }

  return (
    <FloatingWindow
      title={mode === "create" ? "새 업무 등록" : "업무 수정"}
      onClose={onClose}
      defaultWidth={520}
      defaultHeight={700}
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
            저장
          </button>
        </>
      }
    >
      <Field label="담당 팀">
        <div className="flex flex-wrap gap-1.5">
          {creatableTeams.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTeamChange(t.id)}
              className="rounded-[2px] border px-3 py-1.5 text-[11.5px] font-semibold"
              style={
                teamId === t.id
                  ? { borderColor: "var(--accent)", background: "var(--accent)", color: "var(--accent-fg)" }
                  : { borderColor: "var(--border-strong)", color: "var(--text-muted)" }
              }
            >
              {t.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="업무 제목">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 부산센터 임차 계약 갱신 검토"
          className={inputCls}
        />
      </Field>

      <Field label="업무 설명">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="업무 배경과 목적을 입력하세요"
          className="h-14 resize-none rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1.5 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      </Field>

      <Field label="업무 분류 (대분류 · 중분류 · 소분류)">
        <div className="grid grid-cols-3 gap-1.5">
          <select value={large} onChange={(e) => handleLargeChange(e.target.value)} className={inputCls}>
            {tree.map((n) => (
              <option key={n.id} value={n.name}>
                {n.name}
              </option>
            ))}
          </select>
          <select value={medium} onChange={(e) => handleMediumChange(e.target.value)} className={inputCls}>
            {(largeNode?.children ?? []).map((n) => (
              <option key={n.id} value={n.name}>
                {n.name}
              </option>
            ))}
          </select>
          <select value={small} onChange={(e) => setSmall(e.target.value)} className={inputCls}>
            {(mediumNode?.children ?? []).map((n) => (
              <option key={n.id} value={n.name}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="담당자">
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className={inputCls}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="관련 센터">
          <select value={center} onChange={(e) => setCenter(e.target.value)} className={inputCls}>
            {centers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="협업자 (복수 선택 가능 — 지정된 사람도 이 업무를 함께 관리할 수 있어요)">
        <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface-alt)] px-2.5 py-2">
          {users
            .filter((u) => u.id !== assigneeId)
            .map((u) => (
              <label key={u.id} className="flex items-center gap-1 text-[10.5px] text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={collaboratorIds.includes(u.id)}
                  onChange={() => toggleCollaborator(u.id)}
                  style={{ accentColor: "var(--accent)" }}
                />
                {u.name}
              </label>
            ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="목표일(마감일)">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="우선순위">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className={inputCls}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="캘린더 색상 (미지정 시 자동 배정)">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setColor(undefined)}
            title="자동"
            className="flex h-6 items-center rounded-[3px] border px-2 text-[10px] font-semibold"
            style={
              color === undefined
                ? { borderColor: "var(--accent)", background: "var(--accent-soft-bg)", color: "var(--accent-soft-fg)" }
                : { borderColor: "var(--border-strong)", color: "var(--text-muted)" }
            }
          >
            자동
          </button>
          {CALENDAR_PALETTE.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              title={c.name}
              className="h-6 w-6 flex-none rounded-full border"
              style={{
                background: c.value,
                borderColor: color === c.value ? "var(--text)" : "transparent",
                boxShadow: color === c.value ? "0 0 0 1px var(--text)" : "none",
              }}
            />
          ))}
          {task && (
            <span className="ml-1 flex items-center gap-1 text-[10px] text-[var(--text-faintest)]">
              <span
                className="h-2.5 w-2.5 flex-none rounded-full"
                style={{ background: color ?? taskColor(task) }}
              />
              {color === undefined ? "자동 배정된 색상 미리보기" : ""}
            </span>
          )}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="진행상태">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className={inputCls}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="업무레벨 (숫자가 낮을수록 더 많은 사람이 조회 가능)">
          <input
            type="number"
            min={1}
            value={level}
            onChange={(e) => setLevel(Math.max(1, Number(e.target.value) || 1))}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="text-[9.5px] text-[var(--text-faintest)]">
        진행률은 직접 입력하지 않아요. 아래 &lsquo;필요 업무&rsquo; 항목들의 진행률 평균으로 자동
        계산되며, 100%가 되면 상태가 자동으로 &lsquo;완료&rsquo;로 바뀝니다.
      </div>

      {mode === "create" && (
        <Field label="필요 업무 (선택)">
          <div className="flex flex-col gap-1.5">
            {checklistDraft.map((label, i) => (
              <div
                key={i}
                className="flex items-center gap-2 border border-[var(--divider)] bg-[var(--surface-alt)] px-2 py-1"
              >
                <span className="flex-1 text-[11px] text-[var(--text-secondary)]">{label}</span>
                <button
                  onClick={() =>
                    setChecklistDraft((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="text-[var(--text-faintest)] hover:text-[var(--danger)]"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="flex gap-1.5">
              <input
                value={newChecklistLabel}
                onChange={(e) => setNewChecklistLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addChecklistDraftItem();
                  }
                }}
                placeholder="예: 사고 사실 확인"
                className="h-6 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[10.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
              <button
                onClick={addChecklistDraftItem}
                className="h-6 rounded-[2px] border border-[var(--border-strong)] px-2 text-[10.5px] font-semibold text-[var(--text-muted)]"
              >
                추가
              </button>
            </div>
            <div className="text-[9.5px] text-[var(--text-faintest)]">
              업무를 세부 항목으로 나눠 각각 진척도를 관리하고 싶을 때 사용하세요. 등록 후
              상세 화면에서 하위 항목을 더 추가하거나 트리 형태로 펼쳐볼 수 있습니다.
            </div>
          </div>
        </Field>
      )}

      {mode === "create" && (
        <div className="text-[9.5px] text-[var(--text-faintest)]">
          등록 이후 진행 내용은 업무 상세 화면의 &lsquo;진행 일지&rsquo;에서 계속
          기록합니다.
        </div>
      )}

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
