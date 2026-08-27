"use client";

import { ReactNode, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { CATEGORY_TREE, CENTERS } from "@/lib/categories";
import { ChecklistItem, Dept, Priority, Status, Task } from "@/lib/types";

const STATUSES: Status[] = ["대기", "진행중", "검토중", "완료"];
const PRIORITIES: Priority[] = ["높음", "보통", "낮음"];

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function TaskFormModal({
  mode,
  initialDept,
  task,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initialDept: Dept;
  task?: Task;
  onClose: () => void;
  onSaved: (taskId: string) => void;
}) {
  const { users, currentUser, addTask, updateTask } = useStore();

  const [dept, setDept] = useState<Dept>(task?.dept ?? initialDept);
  const tree = CATEGORY_TREE[dept];
  const [large, setLarge] = useState(task?.categoryLarge ?? tree[0].name);
  const largeNode = tree.find((n) => n.name === large) ?? tree[0];
  const [medium, setMedium] = useState(
    task?.categoryMedium ?? largeNode.children[0].name
  );
  const mediumNode =
    largeNode.children.find((n) => n.name === medium) ?? largeNode.children[0];
  const [small, setSmall] = useState(task?.categorySmall ?? mediumNode.children[0]);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? currentUser?.id ?? users[0].id);
  const [center, setCenter] = useState(task?.center ?? CENTERS[0]);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaultDueDate());
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "보통");
  const [status, setStatus] = useState<Status>(task?.status ?? "대기");
  const [progress, setProgress] = useState(task?.progress ?? 0);
  const [checklistDraft, setChecklistDraft] = useState<string[]>([]);
  const [newChecklistLabel, setNewChecklistLabel] = useState("");
  const [error, setError] = useState("");

  function addChecklistDraftItem() {
    if (!newChecklistLabel.trim()) return;
    setChecklistDraft((prev) => [...prev, newChecklistLabel.trim()]);
    setNewChecklistLabel("");
  }

  function handleDeptChange(next: Dept) {
    setDept(next);
    const t = CATEGORY_TREE[next];
    setLarge(t[0].name);
    setMedium(t[0].children[0].name);
    setSmall(t[0].children[0].children[0]);
  }

  function handleLargeChange(name: string) {
    setLarge(name);
    const node = tree.find((n) => n.name === name)!;
    setMedium(node.children[0].name);
    setSmall(node.children[0].children[0]);
  }

  function handleMediumChange(name: string) {
    setMedium(name);
    const node = largeNode.children.find((n) => n.name === name)!;
    setSmall(node.children[0]);
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
        dept,
        categoryLarge: large,
        categoryMedium: medium,
        categorySmall: small,
        assigneeId,
        center,
        priority,
        status,
        progress,
        dueDate,
        createdBy: currentUser.id,
        checklist,
      });
      onSaved(id);
    } else if (task) {
      updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        dept,
        categoryLarge: large,
        categoryMedium: medium,
        categorySmall: small,
        assigneeId,
        center,
        priority,
        status,
        progress,
        dueDate,
      });
      onSaved(task.id);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
      <div className="flex max-h-[88vh] w-full max-w-[560px] flex-col rounded-[10px] border border-[#d7dbe0] bg-white">
        <div className="flex items-center justify-between border-b border-[#eef0f2] px-6 py-5">
          <div className="text-[15px] font-bold text-[#1a1d24]">
            {mode === "create" ? "새 업무 등록" : "업무 수정"}
          </div>
          <button onClick={onClose} className="text-[#8a8f99] hover:text-[#1a1d24]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          <Field label="담당 부서">
            <div className="flex gap-2">
              {(["관리팀", "재경팀"] as Dept[]).map((d) => (
                <button
                  key={d}
                  onClick={() => handleDeptChange(d)}
                  className={`flex-1 rounded-md border px-3 py-2 text-[12.5px] font-semibold ${
                    dept === d
                      ? "border-[#23262e] bg-[#23262e] text-white"
                      : "border-[#d7dbe0] text-[#5b6068]"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>

          <Field label="업무 제목">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 부산센터 임차 계약 갱신 검토"
              className="h-[38px] rounded-md border border-[#d7dbe0] px-3 text-[13px] outline-none focus:border-[#3355d6]"
            />
          </Field>

          <Field label="업무 설명">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="업무 배경과 목적을 입력하세요"
              className="h-16 resize-none rounded-md border border-[#d7dbe0] px-3 py-2 text-[13px] outline-none focus:border-[#3355d6]"
            />
          </Field>

          <Field label="업무 분류 (대분류 · 중분류 · 소분류)">
            <div className="grid grid-cols-3 gap-2">
              <select
                value={large}
                onChange={(e) => handleLargeChange(e.target.value)}
                className="h-[38px] rounded-md border border-[#d7dbe0] px-2 text-[12px] outline-none"
              >
                {tree.map((n) => (
                  <option key={n.name} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>
              <select
                value={medium}
                onChange={(e) => handleMediumChange(e.target.value)}
                className="h-[38px] rounded-md border border-[#d7dbe0] px-2 text-[12px] outline-none"
              >
                {largeNode.children.map((n) => (
                  <option key={n.name} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>
              <select
                value={small}
                onChange={(e) => setSmall(e.target.value)}
                className="h-[38px] rounded-md border border-[#d7dbe0] px-2 text-[12px] outline-none"
              >
                {mediumNode.children.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3.5">
            <Field label="담당자">
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="h-[38px] rounded-md border border-[#d7dbe0] px-2 text-[13px] outline-none"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.dept})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="관련 센터">
              <select
                value={center}
                onChange={(e) => setCenter(e.target.value)}
                className="h-[38px] rounded-md border border-[#d7dbe0] px-2 text-[13px] outline-none"
              >
                {CENTERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Field label="목표일(마감일)">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-[38px] rounded-md border border-[#d7dbe0] px-2 text-[13px] outline-none"
              />
            </Field>
            <Field label="우선순위">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="h-[38px] rounded-md border border-[#d7dbe0] px-2 text-[13px] outline-none"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="진행상태">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="h-[38px] rounded-md border border-[#d7dbe0] px-2 text-[13px] outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label={`진행률 (${progress}%)`}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="accent-[#3355d6]"
            />
          </Field>

          {mode === "create" && (
            <Field label="필요 업무 (선택)">
              <div className="flex flex-col gap-1.5">
                {checklistDraft.map((label, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md border border-[#eef0f2] bg-[#fafafb] px-2.5 py-1.5"
                  >
                    <span className="flex-1 text-[12px] text-[#3d4148]">{label}</span>
                    <button
                      onClick={() =>
                        setChecklistDraft((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="text-[#a6abb5] hover:text-[#d92d20]"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
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
                    className="h-8 flex-1 rounded-md border border-[#d7dbe0] px-2.5 text-[12px] outline-none focus:border-[#3355d6]"
                  />
                  <button
                    onClick={addChecklistDraftItem}
                    className="h-8 rounded-md border border-[#d7dbe0] px-2.5 text-[11.5px] font-semibold text-[#5b6068]"
                  >
                    추가
                  </button>
                </div>
                <div className="text-[10.5px] text-[#a6abb5]">
                  업무를 세부 항목으로 나눠 각각 진척도를 관리하고 싶을 때 사용하세요. 등록 후
                  상세 화면에서 하위 항목을 더 추가하거나 트리 형태로 펼쳐볼 수 있습니다.
                </div>
              </div>
            </Field>
          )}

          {mode === "create" && (
            <div className="text-[10.5px] text-[#a6abb5]">
              등록 이후 진행 내용은 업무 상세 화면의 &lsquo;진행 일지&rsquo;에서 계속
              기록합니다.
            </div>
          )}

          {error && <div className="text-[11.5px] text-[#d92d20]">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#eef0f2] px-6 py-4">
          <button
            onClick={onClose}
            className="h-[38px] rounded-md border border-[#d7dbe0] px-4 text-[13px] text-[#5b6068]"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="h-[38px] rounded-md bg-[#23262e] px-[18px] text-[13px] font-semibold text-white"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-[#565b66]">{label}</label>
      {children}
    </div>
  );
}
