"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Board,
  CategoryLarge,
  ChecklistItem,
  Comment,
  CustomFieldDef,
  LogEntry,
  ResourceDoc,
  ResourceFile,
  Task,
  Team,
  User,
  BUILTIN_COLUMNS,
} from "./types";
import {
  SEED_BOARDS,
  SEED_CATEGORIES_BY_TEAM,
  SEED_COMMENTS,
  SEED_CUSTOM_FIELDS,
  SEED_LOG_ENTRIES,
  SEED_TASKS,
  SEED_TEAMS,
  USERS,
} from "./seed-data";
import { seedCategoriesByTeam } from "./categories";
import { addNode, findNode, flatten, removeNode, updateNode } from "./checklist";

const STORAGE_KEY = "dke-task-system-v2";
const SESSION_KEY = "dke-task-system-current-user";

interface StoreData {
  teams: Team[];
  categoriesByTeam: Record<string, CategoryLarge[]>;
  boards: Board[];
  customFields: CustomFieldDef[];
  users: User[];
  tasks: Task[];
  logEntries: LogEntry[];
  comments: Comment[];
  resources: ResourceDoc[];
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
  // Legacy shape (pre-team-system) stored a single `dept` string on users
  // and tasks instead of `teamId`; carry that value over so old browsers
  // don't lose their data.
  const legacyUsers = (data.users ?? USERS) as (User & { dept?: string })[];
  const legacyTasks = (data.tasks ?? []) as (Task & { dept?: string })[];

  const teams =
    data.teams && data.teams.length > 0
      ? data.teams
      : SEED_TEAMS;
  const teamIds = new Set(teams.map((t) => t.id));

  const users = legacyUsers.map((u) => {
    const teamId = u.teamId ?? u.dept ?? teams[0]?.id ?? "";
    return {
      id: u.id,
      name: u.name,
      teamId,
      viewTeamIds: u.viewTeamIds && u.viewTeamIds.length > 0 ? u.viewTeamIds : [teamId],
      level: u.level ?? 1,
      isAdmin: u.isAdmin,
    };
  });

  const tasks = legacyTasks.map((t) => {
    const teamId = t.teamId ?? t.dept ?? teams[0]?.id ?? "";
    return {
      ...t,
      teamId,
      level: t.level ?? 1,
      collaboratorIds: t.collaboratorIds ?? [],
      checklist: normalizeChecklist(t.checklist),
    };
  });

  const categoriesByTeam =
    data.categoriesByTeam && Object.keys(data.categoriesByTeam).length > 0
      ? data.categoriesByTeam
      : seedCategoriesByTeam();

  const boards =
    data.boards && data.boards.length > 0
      ? data.boards
      : teams.map((t) => ({
          id: `board_${t.id}_default`,
          teamId: t.id,
          name: "전체",
          visibleColumns: BUILTIN_COLUMNS.map((c) => c.key),
        }));

  const customFields = data.customFields ?? [];

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

  // Older builds stored files as bare name strings with no real bytes; keep
  // those visible (with an empty base64) rather than crashing on old data.
  const legacyResources = (data.resources ?? []) as (ResourceDoc & {
    files: (string | ResourceFile)[];
  })[];
  const resources = legacyResources.map((r) => ({
    ...r,
    files: r.files.map((f) =>
      typeof f === "string"
        ? { name: f, base64: "", mimeType: "", size: 0 }
        : { name: f.name, base64: f.base64 ?? "", mimeType: f.mimeType ?? "", size: f.size ?? 0 }
    ),
  }));

  // Drop references to teams that no longer exist (shouldn't normally
  // happen since deleteTeam blocks when still referenced, but keeps the
  // UI from crashing if storage is edited by hand).
  users.forEach((u) => {
    if (!teamIds.has(u.teamId) && teams[0]) u.teamId = teams[0].id;
    u.viewTeamIds = u.viewTeamIds.filter((id) => teamIds.has(id));
    if (u.viewTeamIds.length === 0 && teams[0]) u.viewTeamIds = [teams[0].id];
  });

  return { teams, categoriesByTeam, boards, customFields, users, tasks, logEntries, comments, resources };
}

function loadData(): StoreData {
  if (typeof window === "undefined") {
    return {
      teams: SEED_TEAMS,
      categoriesByTeam: SEED_CATEGORIES_BY_TEAM,
      boards: SEED_BOARDS,
      customFields: SEED_CUSTOM_FIELDS,
      users: USERS,
      tasks: SEED_TASKS,
      logEntries: SEED_LOG_ENTRIES,
      comments: SEED_COMMENTS,
      resources: [],
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw) as Partial<StoreData>);
  } catch {
    // fall through to seed
  }
  const seeded: StoreData = {
    teams: SEED_TEAMS,
    categoriesByTeam: SEED_CATEGORIES_BY_TEAM,
    boards: SEED_BOARDS,
    customFields: SEED_CUSTOM_FIELDS,
    users: USERS,
    tasks: SEED_TASKS,
    logEntries: SEED_LOG_ENTRIES,
    comments: SEED_COMMENTS,
    resources: [],
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function loadCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

interface StoreContextValue {
  teams: Team[];
  categoriesByTeam: Record<string, CategoryLarge[]>;
  boards: Board[];
  customFields: CustomFieldDef[];
  users: User[];
  allTasks: Task[];
  tasks: Task[]; // tasks visible to currentUser (team + level permission applied)
  logEntries: LogEntry[];
  comments: Comment[];
  resources: ResourceDoc[];
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

  addResource: (input: Omit<ResourceDoc, "id" | "createdAt">) => string;
  deleteResource: (id: string) => void;

  getUser: (id: string) => User | undefined;
  canEdit: (authorId: string) => boolean;
  canEditTask: (task: Task) => boolean;
  canViewTask: (task: Task) => boolean;

  // --- Admin ---
  addTeam: (name: string) => void;
  renameTeam: (id: string, name: string) => void;
  deleteTeam: (id: string) => boolean;

  addCategoryLarge: (teamId: string, name: string) => void;
  renameCategoryLarge: (teamId: string, id: string, name: string) => void;
  deleteCategoryLarge: (teamId: string, id: string) => void;
  addCategoryMedium: (teamId: string, largeId: string, name: string) => void;
  renameCategoryMedium: (teamId: string, largeId: string, id: string, name: string) => void;
  deleteCategoryMedium: (teamId: string, largeId: string, id: string) => void;
  addCategorySmall: (teamId: string, largeId: string, mediumId: string, name: string) => void;
  renameCategorySmall: (
    teamId: string,
    largeId: string,
    mediumId: string,
    id: string,
    name: string
  ) => void;
  deleteCategorySmall: (teamId: string, largeId: string, mediumId: string, id: string) => void;

  addBoard: (teamId: string, name: string) => void;
  updateBoard: (id: string, patch: Partial<Pick<Board, "name" | "visibleColumns">>) => void;
  deleteBoard: (id: string) => void;

  addCustomField: (label: string, type: CustomFieldDef["type"], options?: string[]) => void;
  deleteCustomField: (id: string) => void;

  updateUser: (
    id: string,
    patch: Partial<Pick<User, "teamId" | "viewTeamIds" | "level" | "isAdmin">>
  ) => void;

  resetDemoData: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<StoreData>({
    teams: [],
    categoriesByTeam: {},
    boards: [],
    customFields: [],
    users: [],
    tasks: [],
    logEntries: [],
    comments: [],
    resources: [],
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

  const currentUser = useMemo(
    () => data.users.find((u) => u.id === currentUserId) ?? null,
    [data.users, currentUserId]
  );

  const canViewTask = useCallback(
    (task: Task) => {
      if (!currentUser) return false;
      if (currentUser.isAdmin) return true;
      return currentUser.viewTeamIds.includes(task.teamId) && task.level >= currentUser.level;
    },
    [currentUser]
  );

  const visibleTasks = useMemo(
    () => data.tasks.filter((t) => canViewTask(t)),
    [data.tasks, canViewTask]
  );

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

  const addResource = useCallback((input: Omit<ResourceDoc, "id" | "createdAt">) => {
    const id = genId("r");
    const resource: ResourceDoc = { ...input, id, createdAt: new Date().toISOString() };
    setData((prev) => ({ ...prev, resources: [resource, ...prev.resources] }));
    return id;
  }, []);

  const deleteResource = useCallback((id: string) => {
    setData((prev) => ({ ...prev, resources: prev.resources.filter((r) => r.id !== id) }));
  }, []);

  const getUser = useCallback((id: string) => data.users.find((u) => u.id === id), [data.users]);

  const canEdit = useCallback(
    (authorId: string) => {
      if (!currentUser) return false;
      return currentUser.id === authorId || currentUser.isAdmin;
    },
    [currentUser]
  );

  const canEditTask = useCallback(
    (task: Task) => {
      if (!currentUser) return false;
      if (currentUser.isAdmin) return true;
      return (
        task.createdBy === currentUser.id ||
        task.assigneeId === currentUser.id ||
        task.collaboratorIds.includes(currentUser.id)
      );
    },
    [currentUser]
  );

  // --- Admin: teams ---

  const addTeam = useCallback((name: string) => {
    const id = genId("team");
    setData((prev) => ({
      ...prev,
      teams: [...prev.teams, { id, name }],
      categoriesByTeam: { ...prev.categoriesByTeam, [id]: [] },
      boards: [...prev.boards, { id: `board_${id}_default`, teamId: id, name: "전체", visibleColumns: BUILTIN_COLUMNS.map((c) => c.key) }],
    }));
  }, []);

  const renameTeam = useCallback((id: string, name: string) => {
    setData((prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (t.id === id ? { ...t, name } : t)),
    }));
  }, []);

  const deleteTeam = useCallback(
    (id: string) => {
      const inUse =
        data.tasks.some((t) => t.teamId === id) ||
        data.users.some((u) => u.teamId === id);
      if (inUse) return false;
      setData((prev) => {
        const restCategories = Object.fromEntries(
          Object.entries(prev.categoriesByTeam).filter(([teamId]) => teamId !== id)
        );
        return {
          ...prev,
          teams: prev.teams.filter((t) => t.id !== id),
          categoriesByTeam: restCategories,
          boards: prev.boards.filter((b) => b.teamId !== id),
          users: prev.users.map((u) => ({
            ...u,
            viewTeamIds: u.viewTeamIds.filter((tid) => tid !== id),
          })),
        };
      });
      return true;
    },
    [data.tasks, data.users]
  );

  // --- Admin: categories ---

  const addCategoryLarge = useCallback((teamId: string, name: string) => {
    setData((prev) => ({
      ...prev,
      categoriesByTeam: {
        ...prev.categoriesByTeam,
        [teamId]: [...(prev.categoriesByTeam[teamId] ?? []), { id: genId("cl"), name, children: [] }],
      },
    }));
  }, []);

  const renameCategoryLarge = useCallback((teamId: string, id: string, name: string) => {
    setData((prev) => ({
      ...prev,
      categoriesByTeam: {
        ...prev.categoriesByTeam,
        [teamId]: (prev.categoriesByTeam[teamId] ?? []).map((l) =>
          l.id === id ? { ...l, name } : l
        ),
      },
    }));
  }, []);

  const deleteCategoryLarge = useCallback((teamId: string, id: string) => {
    setData((prev) => ({
      ...prev,
      categoriesByTeam: {
        ...prev.categoriesByTeam,
        [teamId]: (prev.categoriesByTeam[teamId] ?? []).filter((l) => l.id !== id),
      },
    }));
  }, []);

  const addCategoryMedium = useCallback((teamId: string, largeId: string, name: string) => {
    setData((prev) => ({
      ...prev,
      categoriesByTeam: {
        ...prev.categoriesByTeam,
        [teamId]: (prev.categoriesByTeam[teamId] ?? []).map((l) =>
          l.id === largeId
            ? { ...l, children: [...l.children, { id: genId("cm"), name, children: [] }] }
            : l
        ),
      },
    }));
  }, []);

  const renameCategoryMedium = useCallback(
    (teamId: string, largeId: string, id: string, name: string) => {
      setData((prev) => ({
        ...prev,
        categoriesByTeam: {
          ...prev.categoriesByTeam,
          [teamId]: (prev.categoriesByTeam[teamId] ?? []).map((l) =>
            l.id === largeId
              ? { ...l, children: l.children.map((m) => (m.id === id ? { ...m, name } : m)) }
              : l
          ),
        },
      }));
    },
    []
  );

  const deleteCategoryMedium = useCallback((teamId: string, largeId: string, id: string) => {
    setData((prev) => ({
      ...prev,
      categoriesByTeam: {
        ...prev.categoriesByTeam,
        [teamId]: (prev.categoriesByTeam[teamId] ?? []).map((l) =>
          l.id === largeId ? { ...l, children: l.children.filter((m) => m.id !== id) } : l
        ),
      },
    }));
  }, []);

  const addCategorySmall = useCallback(
    (teamId: string, largeId: string, mediumId: string, name: string) => {
      setData((prev) => ({
        ...prev,
        categoriesByTeam: {
          ...prev.categoriesByTeam,
          [teamId]: (prev.categoriesByTeam[teamId] ?? []).map((l) =>
            l.id === largeId
              ? {
                  ...l,
                  children: l.children.map((m) =>
                    m.id === mediumId
                      ? { ...m, children: [...m.children, { id: genId("cs"), name }] }
                      : m
                  ),
                }
              : l
          ),
        },
      }));
    },
    []
  );

  const renameCategorySmall = useCallback(
    (teamId: string, largeId: string, mediumId: string, id: string, name: string) => {
      setData((prev) => ({
        ...prev,
        categoriesByTeam: {
          ...prev.categoriesByTeam,
          [teamId]: (prev.categoriesByTeam[teamId] ?? []).map((l) =>
            l.id === largeId
              ? {
                  ...l,
                  children: l.children.map((m) =>
                    m.id === mediumId
                      ? { ...m, children: m.children.map((s) => (s.id === id ? { ...s, name } : s)) }
                      : m
                  ),
                }
              : l
          ),
        },
      }));
    },
    []
  );

  const deleteCategorySmall = useCallback(
    (teamId: string, largeId: string, mediumId: string, id: string) => {
      setData((prev) => ({
        ...prev,
        categoriesByTeam: {
          ...prev.categoriesByTeam,
          [teamId]: (prev.categoriesByTeam[teamId] ?? []).map((l) =>
            l.id === largeId
              ? {
                  ...l,
                  children: l.children.map((m) =>
                    m.id === mediumId
                      ? { ...m, children: m.children.filter((s) => s.id !== id) }
                      : m
                  ),
                }
              : l
          ),
        },
      }));
    },
    []
  );

  // --- Admin: boards ---

  const addBoard = useCallback((teamId: string, name: string) => {
    setData((prev) => ({
      ...prev,
      boards: [
        ...prev.boards,
        { id: genId("board"), teamId, name, visibleColumns: BUILTIN_COLUMNS.map((c) => c.key) },
      ],
    }));
  }, []);

  const updateBoard = useCallback(
    (id: string, patch: Partial<Pick<Board, "name" | "visibleColumns">>) => {
      setData((prev) => ({
        ...prev,
        boards: prev.boards.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      }));
    },
    []
  );

  const deleteBoard = useCallback((id: string) => {
    setData((prev) => ({ ...prev, boards: prev.boards.filter((b) => b.id !== id) }));
  }, []);

  // --- Admin: custom fields ---

  const addCustomField = useCallback(
    (label: string, type: CustomFieldDef["type"], options?: string[]) => {
      const id = genId("field");
      setData((prev) => ({ ...prev, customFields: [...prev.customFields, { id, label, type, options }] }));
    },
    []
  );

  const deleteCustomField = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((f) => f.id !== id),
      boards: prev.boards.map((b) => ({
        ...b,
        visibleColumns: b.visibleColumns.filter((c) => c !== id),
      })),
    }));
  }, []);

  // --- Admin: users ---

  const updateUser = useCallback(
    (id: string, patch: Partial<Pick<User, "teamId" | "viewTeamIds" | "level" | "isAdmin">>) => {
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      }));
    },
    []
  );

  const resetDemoData = useCallback(() => {
    const seeded: StoreData = {
      teams: SEED_TEAMS,
      categoriesByTeam: SEED_CATEGORIES_BY_TEAM,
      boards: SEED_BOARDS,
      customFields: SEED_CUSTOM_FIELDS,
      users: USERS,
      tasks: SEED_TASKS,
      logEntries: SEED_LOG_ENTRIES,
      comments: SEED_COMMENTS,
      resources: [],
    };
    setData(seeded);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  }, []);

  const value: StoreContextValue = {
    teams: data.teams,
    categoriesByTeam: data.categoriesByTeam,
    boards: data.boards,
    customFields: data.customFields,
    users: data.users,
    allTasks: data.tasks,
    tasks: visibleTasks,
    logEntries: data.logEntries,
    comments: data.comments,
    resources: data.resources,
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
    addResource,
    deleteResource,
    getUser,
    canEdit,
    canEditTask,
    canViewTask,
    addTeam,
    renameTeam,
    deleteTeam,
    addCategoryLarge,
    renameCategoryLarge,
    deleteCategoryLarge,
    addCategoryMedium,
    renameCategoryMedium,
    deleteCategoryMedium,
    addCategorySmall,
    renameCategorySmall,
    deleteCategorySmall,
    addBoard,
    updateBoard,
    deleteBoard,
    addCustomField,
    deleteCustomField,
    updateUser,
    resetDemoData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
