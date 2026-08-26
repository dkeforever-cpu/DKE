"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ChecklistItem, Comment, LogEntry, Task, User } from "./types";
import {
  SEED_COMMENTS,
  SEED_LOG_ENTRIES,
  SEED_TASKS,
  USERS,
} from "./seed-data";
import { addNode, findNode, flatten, removeNode, updateNode } from "./checklist";

const STORAGE_KEY = "dke-task-system-v1";
const SESSION_KEY = "dke-task-system-current-user";

interface StoreData {
  tasks: Task[];
  logEntries: LogEntry[];
  comments: Comment[];
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

// Backfills fields added to the schema after some browsers already saved
// data under STORAGE_KEY, so old localStorage records don't crash the UI
// (e.g. reading .length on a field that didn't exist yet when it was saved).
function normalizeChecklist(items: ChecklistItem[] | undefined): ChecklistItem[] {
  if (!items) return [];
  return items.map((item) => ({
    ...item,
    createdAt: item.createdAt ?? new Date().toISOString(),
    children: normalizeChecklist(item.children),
  }));
}

function normalize(data: Partial<StoreData>): StoreData {
  const tasks = (data.tasks ?? []).map((t) => ({
    ...t,
    checklist: normalizeChecklist(t.checklist),
  }));
  const logEntries = (data.logEntries ?? []).map((l) => ({
    ...l,
    attachments: l.attachments ?? [],
  }));
  const comments = (data.comments ?? []).map((c) => {
    const legacy = c as Comment & { logEntryId?: string };
    return {
      ...c,
      targetType: c.targetType ?? "log",
      targetId: c.targetId ?? legacy.logEntryId ?? "",
      attachments: c.attachments ?? [],
    };
  });
  return { tasks, logEntries, comments };
}

function loadData(): StoreData {
  if (typeof window === "undefined") {
    return { tasks: SEED_TASKS, logEntries: SEED_LOG_ENTRIES, comments: SEED_COMMENTS };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw) as Partial<StoreData>);
  } catch {
    // fall through to seed
  }
  const seeded: StoreData = {
    tasks: SEED_TASKS,
    logEntries: SEED_LOG_ENTRIES,
    comments: SEED_COMMENTS,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function loadCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

interface StoreContextValue {
  users: User[];
  tasks: Task[];
  logEntries: LogEntry[];
  comments: Comment[];
  currentUser: User | null;
  ready: boolean;

  login: (userId: string) => void;
  logout: () => void;

  addTask: (input: Omit<Task, "id" | "createdAt">) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  addChecklistItem: (taskId: string, parentId: string | null, label: string) => string;
  updateChecklistItem: (
    taskId: string,
    itemId: string,
    patch: Partial<Pick<ChecklistItem, "label" | "progress" | "dueDate">>
  ) => void;
  deleteChecklistItem: (taskId: string, itemId: string) => void;

  addLogEntry: (input: Omit<LogEntry, "id" | "createdAt">) => string;
  updateLogEntry: (id: string, content: string) => void;
  deleteLogEntry: (id: string) => void;

  addComment: (input: Omit<Comment, "id" | "createdAt">) => string;
  updateComment: (id: string, content: string) => void;
  deleteComment: (id: string) => void;

  getUser: (id: string) => User | undefined;
  canEdit: (authorId: string) => boolean;

  resetDemoData: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<StoreData>({
    tasks: [],
    logEntries: [],
    comments: [],
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // One-time client-side hydration from localStorage; SSR has no
    // localStorage, so this must run after mount rather than in render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(loadData());
    setCurrentUserId(loadCurrentUserId());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  const login = useCallback((userId: string) => {
    setCurrentUserId(userId);
    window.localStorage.setItem(SESSION_KEY, userId);
  }, []);

  const logout = useCallback(() => {
    setCurrentUserId(null);
    window.localStorage.removeItem(SESSION_KEY);
  }, []);

  const addTask = useCallback((input: Omit<Task, "id" | "createdAt">) => {
    const id = genId("t");
    const today = new Date();
    const createdAt = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const task: Task = { ...input, id, createdAt };
    setData((prev) => ({ ...prev, tasks: [task, ...prev.tasks] }));

    const logId = genId("l");
    const entry: LogEntry = {
      id: logId,
      taskId: id,
      authorId: input.createdBy,
      content: `업무 등록. ${input.description || ""}`.trim(),
      attachments: [],
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, logEntries: [entry, ...prev.logEntries] }));
    return id;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
      logEntries: prev.logEntries.filter((l) => l.taskId !== id),
    }));
  }, []);

  const addChecklistItem = useCallback(
    (taskId: string, parentId: string | null, label: string) => {
      const id = genId("ci");
      const node: ChecklistItem = {
        id,
        label,
        progress: 0,
        createdAt: new Date().toISOString(),
        children: [],
      };
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, checklist: addNode(t.checklist ?? [], parentId, node) }
            : t
        ),
      }));
      return id;
    },
    []
  );

  const updateChecklistItem = useCallback(
    (
      taskId: string,
      itemId: string,
      patch: Partial<Pick<ChecklistItem, "label" | "progress" | "dueDate">>
    ) => {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, checklist: updateNode(t.checklist ?? [], itemId, patch) }
            : t
        ),
      }));
    },
    []
  );

  const deleteChecklistItem = useCallback((taskId: string, itemId: string) => {
    setData((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId);
      const removedNode = task ? findNode(task.checklist ?? [], itemId) : undefined;
      const removedIds = new Set(
        removedNode ? flatten([removedNode]).map((n) => n.id) : [itemId]
      );
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, checklist: removeNode(t.checklist ?? [], itemId) } : t
        ),
        comments: prev.comments.filter(
          (c) => !(c.targetType === "checklist" && removedIds.has(c.targetId))
        ),
      };
    });
  }, []);

  const addLogEntry = useCallback(
    (input: Omit<LogEntry, "id" | "createdAt">) => {
      const id = genId("l");
      const entry: LogEntry = { ...input, id, createdAt: new Date().toISOString() };
      setData((prev) => ({ ...prev, logEntries: [entry, ...prev.logEntries] }));
      return id;
    },
    []
  );

  const updateLogEntry = useCallback((id: string, content: string) => {
    setData((prev) => ({
      ...prev,
      logEntries: prev.logEntries.map((l) =>
        l.id === id ? { ...l, content, editedAt: new Date().toISOString() } : l
      ),
    }));
  }, []);

  const deleteLogEntry = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      logEntries: prev.logEntries.filter((l) => l.id !== id),
      comments: prev.comments.filter((c) => !(c.targetType === "log" && c.targetId === id)),
    }));
  }, []);

  const addComment = useCallback((input: Omit<Comment, "id" | "createdAt">) => {
    const id = genId("c");
    const comment: Comment = { ...input, id, createdAt: new Date().toISOString() };
    setData((prev) => ({ ...prev, comments: [...prev.comments, comment] }));
    return id;
  }, []);

  const updateComment = useCallback((id: string, content: string) => {
    setData((prev) => ({
      ...prev,
      comments: prev.comments.map((c) =>
        c.id === id ? { ...c, content, editedAt: new Date().toISOString() } : c
      ),
    }));
  }, []);

  const deleteComment = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      comments: prev.comments.filter((c) => c.id !== id),
    }));
  }, []);

  const getUser = useCallback((id: string) => USERS.find((u) => u.id === id), []);

  const currentUser = useMemo(
    () => USERS.find((u) => u.id === currentUserId) ?? null,
    [currentUserId]
  );

  const canEdit = useCallback(
    (authorId: string) => {
      if (!currentUser) return false;
      return currentUser.id === authorId || currentUser.isAdmin;
    },
    [currentUser]
  );

  const resetDemoData = useCallback(() => {
    const seeded: StoreData = {
      tasks: SEED_TASKS,
      logEntries: SEED_LOG_ENTRIES,
      comments: SEED_COMMENTS,
    };
    setData(seeded);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  }, []);

  const value: StoreContextValue = {
    users: USERS,
    tasks: data.tasks,
    logEntries: data.logEntries,
    comments: data.comments,
    currentUser,
    ready,
    login,
    logout,
    addTask,
    updateTask,
    deleteTask,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    addLogEntry,
    updateLogEntry,
    deleteLogEntry,
    addComment,
    updateComment,
    deleteComment,
    getUser,
    canEdit,
    resetDemoData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
