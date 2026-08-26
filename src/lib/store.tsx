"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChecklistItem, Comment, LogEntry, Task, User } from "./types";
import { addNode, findNode, flatten, removeNode, updateNode } from "./checklist";
import { gasClient, GasApiError, hasApiUrl } from "./gas-client";

const SESSION_KEY = "dke-task-system-current-user";
const DEBOUNCE_MS = 600;

interface StoreData {
  users: User[];
  tasks: Task[];
  logEntries: LogEntry[];
  comments: Comment[];
}

const EMPTY_DATA: StoreData = { users: [], tasks: [], logEntries: [], comments: [] };

function genTempId(prefix: string): string {
  return `${prefix}_temp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function loadCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

function errorMessage(err: unknown): string {
  return err instanceof GasApiError ? err.message : "요청 처리 중 오류가 발생했습니다.";
}

interface StoreContextValue {
  users: User[];
  tasks: Task[];
  logEntries: LogEntry[];
  comments: Comment[];
  currentUser: User | null;
  ready: boolean;
  configured: boolean;
  bootstrapError: string | null;
  syncError: string | null;
  retryBootstrap: () => void;
  dismissSyncError: () => void;

  login: (userId: string) => void;
  logout: () => void;

  addTask: (input: Omit<Task, "id" | "createdAt"> & { checklist?: ChecklistItem[] }) => Promise<string>;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  addChecklistItem: (taskId: string, parentId: string | null, label: string) => void;
  updateChecklistItem: (
    taskId: string,
    itemId: string,
    patch: Partial<Pick<ChecklistItem, "label" | "progress" | "dueDate">>
  ) => void;
  deleteChecklistItem: (taskId: string, itemId: string) => void;

  addLogEntry: (input: Omit<LogEntry, "id" | "createdAt">) => void;
  updateLogEntry: (id: string, content: string) => void;
  deleteLogEntry: (id: string) => void;

  addComment: (input: Omit<Comment, "id" | "createdAt">) => void;
  updateComment: (id: string, content: string) => void;
  deleteComment: (id: string) => void;

  getUser: (id: string) => User | undefined;
  canEdit: (authorId: string) => boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [data, setData] = useState<StoreData>(EMPTY_DATA);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Debounce timers for hot-path field edits (checklist progress/label) so
  // every keystroke/click doesn't fire its own network request. Pending
  // calls are tracked separately from the timers so they can be flushed
  // immediately on unload — a debounced write that's still waiting when the
  // tab closes would otherwise be silently lost.
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingCalls = useRef<Map<string, () => void>>(new Map());

  const scheduleDebounced = useCallback((key: string, run: () => void) => {
    const timers = debounceTimers.current;
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    pendingCalls.current.set(key, run);
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        pendingCalls.current.delete(key);
        run();
      }, DEBOUNCE_MS)
    );
  }, []);

  useEffect(() => {
    function flushPending() {
      debounceTimers.current.forEach((timer) => clearTimeout(timer));
      debounceTimers.current.clear();
      pendingCalls.current.forEach((run) => run());
      pendingCalls.current.clear();
    }
    window.addEventListener("beforeunload", flushPending);
    window.addEventListener("pagehide", flushPending);
    return () => {
      flushPending();
      window.removeEventListener("beforeunload", flushPending);
      window.removeEventListener("pagehide", flushPending);
    };
  }, []);

  const runBootstrap = useCallback(async () => {
    if (!hasApiUrl()) {
      setConfigured(false);
      setReady(true);
      return;
    }
    setConfigured(true);
    setBootstrapError(null);
    try {
      const result = await gasClient.call<StoreData>("bootstrap");
      setData(result);
      setReady(true);
    } catch (err) {
      setBootstrapError(errorMessage(err));
      setReady(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUserId(loadCurrentUserId());
    runBootstrap();
  }, [runBootstrap]);

  const login = useCallback((userId: string) => {
    setCurrentUserId(userId);
    window.localStorage.setItem(SESSION_KEY, userId);
  }, []);

  const logout = useCallback(() => {
    setCurrentUserId(null);
    window.localStorage.removeItem(SESSION_KEY);
  }, []);

  const reportSyncError = useCallback((err: unknown) => {
    setSyncError(errorMessage(err));
  }, []);

  // ---------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------

  const addTask = useCallback(
    async (input: Omit<Task, "id" | "createdAt"> & { checklist?: ChecklistItem[] }) => {
      const { checklist, ...rest } = input;
      const checklistLabels = (checklist ?? []).map((c) => c.label);
      try {
        const result = await gasClient.call<{ task: Task; logEntry: LogEntry }>("createTask", {
          ...rest,
          checklistLabels,
        });
        setData((prev) => ({
          ...prev,
          tasks: [result.task, ...prev.tasks],
          logEntries: [result.logEntry, ...prev.logEntries],
        }));
        return result.task.id;
      } catch (err) {
        reportSyncError(err);
        throw err;
      }
    },
    [reportSyncError]
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
      // Only ever called once per edit (the task edit modal's save button),
      // never from a hot-path field, so it's sent immediately rather than
      // debounced.
      gasClient.call("updateTask", { id, patch }).catch(reportSyncError);
    },
    [reportSyncError]
  );

  const deleteTask = useCallback(
    (id: string) => {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== id),
        logEntries: prev.logEntries.filter((l) => l.taskId !== id),
      }));
      gasClient.call("deleteTask", { id }).catch(reportSyncError);
    },
    [reportSyncError]
  );

  // ---------------------------------------------------------------------
  // Checklist items
  // ---------------------------------------------------------------------

  const addChecklistItem = useCallback(
    (taskId: string, parentId: string | null, label: string) => {
      const tempId = genTempId("ci");
      const node: ChecklistItem = {
        id: tempId,
        label,
        progress: 0,
        createdAt: new Date().toISOString(),
        children: [],
      };
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, checklist: addNode(t.checklist ?? [], parentId, node) } : t
        ),
      }));

      gasClient
        .call<ChecklistItem>("createChecklistItem", { taskId, parentId, label })
        .then((created) => {
          // updateNode can't rename an id, so swap the temp node for the
          // real one directly, keeping the node's position in the tree.
          setData((prev) => ({
            ...prev,
            tasks: prev.tasks.map((t) => {
              if (t.id !== taskId) return t;
              const swap = (items: ChecklistItem[]): ChecklistItem[] =>
                items.map((i) =>
                  i.id === tempId ? { ...created, children: i.children } : { ...i, children: swap(i.children) }
                );
              return { ...t, checklist: swap(t.checklist ?? []) };
            }),
          }));
        })
        .catch((err) => {
          setData((prev) => ({
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === taskId ? { ...t, checklist: removeNode(t.checklist ?? [], tempId) } : t
            ),
          }));
          reportSyncError(err);
        });
    },
    [reportSyncError]
  );

  const pendingChecklistPatches = useRef<
    Map<string, Partial<Pick<ChecklistItem, "label" | "progress" | "dueDate">>>
  >(new Map());

  const updateChecklistItem = useCallback(
    (
      taskId: string,
      itemId: string,
      patch: Partial<Pick<ChecklistItem, "label" | "progress" | "dueDate">>
    ) => {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, checklist: updateNode(t.checklist ?? [], itemId, patch) } : t
        ),
      }));

      if (itemId.includes("_temp_")) return; // still being created; the create call carries the label

      const key = `updateChecklistItem:${itemId}`;
      const merged = { ...pendingChecklistPatches.current.get(key), ...patch };
      pendingChecklistPatches.current.set(key, merged);
      scheduleDebounced(key, () => {
        pendingChecklistPatches.current.delete(key);
        gasClient
          .call("updateChecklistItem", { taskId, itemId, patch: merged })
          .catch(reportSyncError);
      });
    },
    [reportSyncError, scheduleDebounced]
  );

  const deleteChecklistItem = useCallback(
    (taskId: string, itemId: string) => {
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
      gasClient.call("deleteChecklistItem", { taskId, itemId }).catch(reportSyncError);
    },
    [reportSyncError]
  );

  // ---------------------------------------------------------------------
  // Log entries
  // ---------------------------------------------------------------------

  const addLogEntry = useCallback(
    (input: Omit<LogEntry, "id" | "createdAt">) => {
      const tempId = genTempId("l");
      const entry: LogEntry = { ...input, id: tempId, createdAt: new Date().toISOString() };
      setData((prev) => ({ ...prev, logEntries: [entry, ...prev.logEntries] }));

      gasClient
        .call<LogEntry>("createLogEntry", input)
        .then((created) => {
          setData((prev) => ({
            ...prev,
            logEntries: prev.logEntries.map((l) => (l.id === tempId ? created : l)),
          }));
        })
        .catch((err) => {
          setData((prev) => ({
            ...prev,
            logEntries: prev.logEntries.filter((l) => l.id !== tempId),
          }));
          reportSyncError(err);
        });
    },
    [reportSyncError]
  );

  const updateLogEntry = useCallback(
    (id: string, content: string) => {
      setData((prev) => ({
        ...prev,
        logEntries: prev.logEntries.map((l) =>
          l.id === id ? { ...l, content, editedAt: new Date().toISOString() } : l
        ),
      }));
      gasClient.call("updateLogEntry", { id, content }).catch(reportSyncError);
    },
    [reportSyncError]
  );

  const deleteLogEntry = useCallback(
    (id: string) => {
      setData((prev) => ({
        ...prev,
        logEntries: prev.logEntries.filter((l) => l.id !== id),
        comments: prev.comments.filter((c) => !(c.targetType === "log" && c.targetId === id)),
      }));
      gasClient.call("deleteLogEntry", { id }).catch(reportSyncError);
    },
    [reportSyncError]
  );

  // ---------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------

  const addComment = useCallback(
    (input: Omit<Comment, "id" | "createdAt">) => {
      const tempId = genTempId("c");
      const comment: Comment = { ...input, id: tempId, createdAt: new Date().toISOString() };
      setData((prev) => ({ ...prev, comments: [...prev.comments, comment] }));

      gasClient
        .call<Comment>("createComment", input)
        .then((created) => {
          setData((prev) => ({
            ...prev,
            comments: prev.comments.map((c) => (c.id === tempId ? created : c)),
          }));
        })
        .catch((err) => {
          setData((prev) => ({
            ...prev,
            comments: prev.comments.filter((c) => c.id !== tempId),
          }));
          reportSyncError(err);
        });
    },
    [reportSyncError]
  );

  const updateComment = useCallback(
    (id: string, content: string) => {
      setData((prev) => ({
        ...prev,
        comments: prev.comments.map((c) =>
          c.id === id ? { ...c, content, editedAt: new Date().toISOString() } : c
        ),
      }));
      gasClient.call("updateComment", { id, content }).catch(reportSyncError);
    },
    [reportSyncError]
  );

  const deleteComment = useCallback(
    (id: string) => {
      setData((prev) => ({
        ...prev,
        comments: prev.comments.filter((c) => c.id !== id),
      }));
      gasClient.call("deleteComment", { id }).catch(reportSyncError);
    },
    [reportSyncError]
  );

  const getUser = useCallback((id: string) => data.users.find((u) => u.id === id), [data.users]);

  const currentUser = useMemo(
    () => data.users.find((u) => u.id === currentUserId) ?? null,
    [data.users, currentUserId]
  );

  const canEdit = useCallback(
    (authorId: string) => {
      if (!currentUser) return false;
      return currentUser.id === authorId || currentUser.isAdmin;
    },
    [currentUser]
  );

  const value: StoreContextValue = {
    users: data.users,
    tasks: data.tasks,
    logEntries: data.logEntries,
    comments: data.comments,
    currentUser,
    ready,
    configured,
    bootstrapError,
    syncError,
    retryBootstrap: () => {
      setReady(false);
      runBootstrap();
    },
    dismissSyncError: () => setSyncError(null),
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
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
