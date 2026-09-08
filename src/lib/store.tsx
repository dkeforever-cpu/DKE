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
import {
  ActivityLog,
  AppSettings,
  Board,
  CalendarEvent,
  CategoryLarge,
  ChecklistItem,
  Comment,
  CommentTargetType,
  CustomFieldDef,
  LogEntry,
  Notification,
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
import { CENTERS as SEED_CENTERS, nextLargeCode, nextMediumCode, seedCategoriesByTeam } from "./categories";
import { addNode, applyChecklist, computeProgress, findNode, flatten, removeNode, updateNode } from "./checklist";
import { generateTaskNumber } from "./format";
import { DEFAULT_PASSWORD_HASH, sha256Hex } from "./auth";
import {
  gas,
  GasApiError,
  getInviteToken,
  getSelfHostedBackendUrl,
  hasBackendConfig,
  setBackendConfig,
} from "./gas-client";

const STORAGE_KEY = "dke-task-system-v2";
const SESSION_KEY = "dke-task-system-current-user";
const DEFAULT_APP_TITLE = "물류센터 업무관리 시스템";
const DEFAULT_SETTINGS: AppSettings = { id: "app", appTitle: DEFAULT_APP_TITLE };

interface StoreData {
  teams: Team[];
  centers: string[];
  categoriesByTeam: Record<string, CategoryLarge[]>;
  boards: Board[];
  customFields: CustomFieldDef[];
  users: User[];
  tasks: Task[];
  logEntries: LogEntry[];
  comments: Comment[];
  resources: ResourceDoc[];
  notifications: Notification[];
  settings: AppSettings;
  calendarEvents: CalendarEvent[];
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

// 댓글이 어느 업무에 달렸는지 찾는다 — 진행 일지 댓글은 LogEntry.taskId로
// 바로 알 수 있고, 체크리스트 댓글은 그 항목을 담고 있는 업무를 트리에서
// 찾아야 한다.
function findTaskIdForCommentTarget(
  targetType: CommentTargetType,
  targetId: string,
  tasks: Task[],
  logEntries: LogEntry[]
): string | null {
  if (targetType === "log") {
    return logEntries.find((l) => l.id === targetId)?.taskId ?? null;
  }
  for (const task of tasks) {
    if (findNode(task.checklist ?? [], targetId)) return task.id;
  }
  return null;
}

function errorMessage(err: unknown): string {
  return err instanceof GasApiError ? err.message : "동기화 중 오류가 발생했습니다.";
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

// Backfills CategoryLarge/Medium.code for data saved before 업무번호 코드
// 체계가 도입되기 전 — 이미 배정된 코드는 그대로 두고, 없는 것만 채운다.
function normalizeCategories(
  byTeam: Record<string, CategoryLarge[]>
): Record<string, CategoryLarge[]> {
  const out: Record<string, CategoryLarge[]> = {};
  for (const [teamId, larges] of Object.entries(byTeam)) {
    const usedLarge = new Set(larges.map((l) => l.code).filter(Boolean));
    out[teamId] = larges.map((l) => {
      let code = l.code;
      if (!code) {
        code = nextLargeCode(usedLarge);
        usedLarge.add(code);
      }
      const usedMedium = new Set(l.children.map((m) => m.code).filter(Boolean));
      const children = l.children.map((m) => {
        let mcode = m.code;
        if (!mcode) {
          mcode = nextMediumCode(usedMedium);
          usedMedium.add(mcode);
        }
        return { ...m, code: mcode };
      });
      return { ...l, code, children };
    });
  }
  return out;
}

// 예전 "카테고리명-YYMMDD-일련번호" 형식으로 저장된 업무번호를 새
// "대분류코드_중분류코드_YYMMDD_일련번호" 형식으로 다시 배정한다 — 이미 새
// 형식인 값은 그대로 둔다 (재배정 시 일련번호가 순서대로 다시 매겨진다).
const TASK_NUMBER_RE = /^[^_]+_[^_]+_\d{6}_\d{2}$/;

function migrateTaskNumbers(tasks: Task[], categoriesByTeam: Record<string, CategoryLarge[]>): Task[] {
  const migrated: Task[] = [];
  for (const t of tasks) {
    if (TASK_NUMBER_RE.test(t.taskNumber)) {
      migrated.push(t);
      continue;
    }
    const largeCat = (categoriesByTeam[t.teamId] ?? []).find((l) => l.name === t.categoryLarge);
    const mediumCat = largeCat?.children.find((m) => m.name === t.categoryMedium);
    const taskNumber = generateTaskNumber(
      largeCat?.code ?? "",
      mediumCat?.code ?? "",
      t.createdAt,
      migrated
    );
    migrated.push({ ...t, taskNumber });
  }
  return migrated;
}

// 진행률이 이미 100%인데 completedAt이 없는 예전 데이터(종료일 기능 도입
// 전에 저장된 업무)를 위한 최선 추정치 — 필요 업무 중 가장 최근 등록일을
// 종료일로, 필요 업무가 없으면 업무 등록일을 그대로 쓴다.
function backfillCompletedAt(tasks: Task[]): Task[] {
  return tasks.map((t) => {
    if (t.progress !== 100 || t.completedAt) return t;
    const dates = flatten(t.checklist ?? [])
      .map((i) => i.createdAt?.slice(0, 10))
      .filter((d): d is string => Boolean(d))
      .sort();
    const completedAt = dates.length > 0 ? dates[dates.length - 1] : t.createdAt;
    return { ...t, completedAt };
  });
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

  const centers = data.centers && data.centers.length > 0 ? data.centers : SEED_CENTERS;

  const users = legacyUsers.map((u) => {
    const teamId = u.teamId ?? u.dept ?? teams[0]?.id ?? "";
    return {
      id: u.id,
      name: u.name,
      username: u.username ?? u.name,
      passwordHash: u.passwordHash ?? DEFAULT_PASSWORD_HASH,
      teamId,
      viewTeamIds: u.viewTeamIds && u.viewTeamIds.length > 0 ? u.viewTeamIds : [teamId],
      level: u.level ?? 1,
      isAdmin: u.isAdmin,
    };
  });

  const rawTasks = legacyTasks.map((t) => {
    const teamId = t.teamId ?? t.dept ?? teams[0]?.id ?? "";
    return {
      ...t,
      teamId,
      level: t.level ?? 1,
      collaboratorIds: t.collaboratorIds ?? [],
      checklist: normalizeChecklist(t.checklist),
      reported: t.reported ?? false,
    };
  });

  const categoriesByTeam = normalizeCategories(
    data.categoriesByTeam && Object.keys(data.categoriesByTeam).length > 0
      ? data.categoriesByTeam
      : seedCategoriesByTeam()
  );

  const tasks = backfillCompletedAt(migrateTaskNumbers(rawTasks, categoriesByTeam));

  // 이미 저장된 게시판에는 "보고" 컬럼이 없을 수 있어(추가되기 전 데이터),
  // 항상 노출되도록 뒤에 채워 넣는다.
  const boards = (
    data.boards && data.boards.length > 0
      ? data.boards
      : teams.map((t) => ({
          id: `board_${t.id}_default`,
          teamId: t.id,
          name: "전체",
          visibleColumns: BUILTIN_COLUMNS.map((c) => c.key),
        }))
  ).map((b) => ({
    ...b,
    visibleColumns: b.visibleColumns.includes("reported")
      ? b.visibleColumns
      : [...b.visibleColumns, "reported"],
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
        : {
            name: f.name,
            base64: f.base64 ?? "",
            mimeType: f.mimeType ?? "",
            size: f.size ?? 0,
            driveFileId: f.driveFileId,
            url: f.url,
          }
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

  const notifications = data.notifications ?? [];
  const calendarEvents = data.calendarEvents ?? [];

  const settings: AppSettings =
    data.settings && data.settings.appTitle ? data.settings : DEFAULT_SETTINGS;

  return {
    teams,
    centers,
    categoriesByTeam,
    boards,
    customFields,
    users,
    tasks,
    logEntries,
    comments,
    resources,
    notifications,
    settings,
    calendarEvents,
  };
}

function loadLocalData(): StoreData {
  if (typeof window === "undefined") {
    return {
      teams: SEED_TEAMS,
      centers: SEED_CENTERS,
      categoriesByTeam: SEED_CATEGORIES_BY_TEAM,
      boards: SEED_BOARDS,
      customFields: SEED_CUSTOM_FIELDS,
      users: USERS,
      tasks: SEED_TASKS,
      logEntries: SEED_LOG_ENTRIES,
      comments: SEED_COMMENTS,
      resources: [],
      notifications: [],
      settings: DEFAULT_SETTINGS,
      calendarEvents: [],
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
    centers: SEED_CENTERS,
    categoriesByTeam: SEED_CATEGORIES_BY_TEAM,
    boards: SEED_BOARDS,
    customFields: SEED_CUSTOM_FIELDS,
    users: USERS,
    tasks: SEED_TASKS,
    logEntries: SEED_LOG_ENTRIES,
    comments: SEED_COMMENTS,
    resources: [],
    notifications: [],
    settings: DEFAULT_SETTINGS,
    calendarEvents: [],
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
  centers: string[];
  categoriesByTeam: Record<string, CategoryLarge[]>;
  boards: Board[];
  customFields: CustomFieldDef[];
  users: User[];
  allTasks: Task[];
  tasks: Task[]; // tasks visible to currentUser (team + level permission applied)
  logEntries: LogEntry[];
  comments: Comment[];
  resources: ResourceDoc[];
  notifications: Notification[];
  calendarEvents: CalendarEvent[];
  appTitle: string;
  appIconUrl?: string;
  currentUser: User | null;
  ready: boolean;

  // --- 구글 시트/드라이브 백엔드 연동 ---
  backendConfigured: boolean; // 웹앱 URL·토큰이 등록되어 있는지
  backendError: string | null; // 최초 로딩(bootstrap) 실패 사유 — 있으면 데이터가 비어있을 수 있음
  syncError: string | null; // 등록 이후 개별 변경 동기화가 실패했을 때의 사유 (데이터는 화면엔 반영됨)
  retryBackend: () => void;
  dismissSyncError: () => void;
  refreshing: boolean; // 수동 새로고침이 진행 중인지 (배경 폴링은 조용히 동작해 여기 반영되지 않음)
  refreshFromBackend: (opts?: { silent?: boolean }) => Promise<boolean>;

  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<boolean>;

  addTask: (input: Omit<Task, "id" | "createdAt" | "progress" | "taskNumber" | "reported">) => string;
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

  markNotificationRead: (id: string, read: boolean) => void;

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

  addCenter: (name: string) => void;
  renameCenter: (oldName: string, newName: string) => void;
  deleteCenter: (name: string) => boolean;

  addCategoryLarge: (teamId: string, name: string) => void;
  renameCategoryLarge: (teamId: string, id: string, name: string) => void;
  deleteCategoryLarge: (teamId: string, id: string) => void;
  addCategoryMedium: (teamId: string, largeId: string, name: string) => void;
  renameCategoryMedium: (teamId: string, largeId: string, id: string, name: string) => void;
  deleteCategoryMedium: (teamId: string, largeId: string, id: string) => void;

  addBoard: (teamId: string, name: string) => void;
  updateBoard: (id: string, patch: Partial<Pick<Board, "name" | "visibleColumns">>) => void;
  deleteBoard: (id: string) => void;

  addCustomField: (label: string, type: CustomFieldDef["type"], options?: string[]) => void;
  deleteCustomField: (id: string) => void;

  addUser: (name: string, teamId: string) => void;
  updateUser: (
    id: string,
    patch: Partial<Pick<User, "teamId" | "viewTeamIds" | "level" | "isAdmin">>
  ) => void;
  deleteUser: (id: string) => boolean;
  resetUserPassword: (id: string) => void;

  resetDemoData: () => boolean;

  addCalendarEvent: (input: Omit<CalendarEvent, "id" | "createdAt">) => string;
  updateCalendarEvent: (
    id: string,
    patch: Partial<Pick<CalendarEvent, "title" | "description" | "startDate" | "endDate">>
  ) => void;
  deleteCalendarEvent: (id: string) => void;

  updateAppTitle: (title: string) => void;
  updateAppIcon: (url: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const EMPTY_DATA: StoreData = {
  teams: [],
  centers: [],
  categoriesByTeam: {},
  boards: [],
  customFields: [],
  users: [],
  tasks: [],
  logEntries: [],
  comments: [],
  resources: [],
  notifications: [],
  settings: DEFAULT_SETTINGS,
  calendarEvents: [],
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<StoreData>(EMPTY_DATA);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [backendConfigured, setBackendConfigured] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 방금 로컬에서 만든 변경(pushCreate/Update/Delete)이 서버에 아직
  // 반영되지 않았을 수 있는 짧은 구간을 기록해둔다 — 이 구간에 백그라운드
  // 새로고침(bootstrap 재조회)이 끼어들면 방금 만든 데이터가 서버 응답에는
  // 없어서 화면에서 잠깐 사라지는 것처럼 보일 수 있다. 그래서 이 구간에는
  // 새로고침 결과 적용을 건너뛰고 다음 주기(또는 다음 수동 새로고침)에
  // 맡긴다.
  const lastLocalMutationRef = useRef(0);
  const markLocalMutation = useCallback(() => {
    lastLocalMutationRef.current = Date.now();
  }, []);

  const loadFromBackend = useCallback(async () => {
    setBackendError(null);
    try {
      const result = await gas.bootstrap<Partial<StoreData>>();
      setData(normalize(result));
    } catch (err) {
      setBackendError(errorMessage(err));
    }
  }, []);

  const retryBackend = useCallback(() => {
    setReady(false);
    loadFromBackend().finally(() => setReady(true));
  }, [loadFromBackend]);

  useEffect(() => {
    async function init() {
      let configured = hasBackendConfig();
      // "초대 링크"(?t=<토큰>)로 접속한 경우 — 아직 이 브라우저에 연동 설정이
      // 없으면 URL에 심어진 토큰으로 자동 연동한다. 팀원이 링크만 열면 되고,
      // 관리자가 API 토큰을 따로 알려줄 필요가 없다. 한 번 저장한 뒤에는
      // 주소창에 토큰이 남아있지 않도록 정리한다.
      if (!configured) {
        const inviteToken = getInviteToken();
        const selfUrl = getSelfHostedBackendUrl();
        if (inviteToken && selfUrl) {
          setBackendConfig(selfUrl, inviteToken);
          configured = true;
          window.history.replaceState({}, "", window.location.pathname + window.location.hash);
        }
      }
      setBackendConfigured(configured);
      setCurrentUserId(loadCurrentUserId());
      if (configured) {
        await loadFromBackend();
      } else {
        setData(loadLocalData());
      }
      setReady(true);
    }
    init();
  }, [loadFromBackend]);

  useEffect(() => {
    if (!ready || backendConfigured) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready, backendConfigured]);

  // 개별 변경을 백엔드로 밀어넣는 fire-and-forget 도우미들. 로컬 상태는
  // 이미 setData로 즉시 반영되어 있으므로 화면은 그대로 빠르게 동작하고,
  // 이 호출들은 실패해도 syncError만 띄운다(자동 롤백은 하지 않음 —
  // 실패 시 새로고침하면 서버 기준으로 다시 맞춰진다).
  const pushCreate = useCallback(
    (entity: string, record: object) => {
      if (!backendConfigured) return;
      markLocalMutation();
      gas.create(entity, record).catch((err) => setSyncError(errorMessage(err)));
    },
    [backendConfigured, markLocalMutation]
  );
  const pushUpdate = useCallback(
    (entity: string, id: string, patch: object) => {
      if (!backendConfigured) return;
      markLocalMutation();
      gas.update(entity, id, patch).catch((err) => setSyncError(errorMessage(err)));
    },
    [backendConfigured, markLocalMutation]
  );
  const pushDelete = useCallback(
    (entity: string, id: string) => {
      if (!backendConfigured) return;
      markLocalMutation();
      gas.remove(entity, id).catch((err) => setSyncError(errorMessage(err)));
    },
    [backendConfigured, markLocalMutation]
  );

  // 관리자 설정의 "기록" 메뉴용 — 각 액션 함수 끝에서 호출한다. 이 기록
  // 자체는 로컬 state(StoreData)에 넣지 않고 서버에만 쓴다 — 계속 쌓이는
  // 데이터라 매 로그인 bootstrap에 포함시키면 갈수록 로딩이 느려지기
  // 때문에, "기록" 탭을 열 때만 gas.list로 따로 불러온다. 연동 전(로컬
  // 저장 모드)에는 기록할 서버가 없으므로 조용히 아무 일도 하지 않는다.
  const logActivity = useCallback(
    (action: string, entity: string, targetId: string, summary: string, detail?: Record<string, unknown>) => {
      if (!currentUserId) return;
      const log: ActivityLog = {
        id: genId("act"),
        userId: currentUserId,
        action,
        entity,
        targetId,
        summary,
        detail,
        createdAt: new Date().toISOString(),
      };
      pushCreate("activityLogs", log);
    },
    [currentUserId, pushCreate]
  );

  // 수동 새로고침 버튼과 30초 백그라운드 폴링이 함께 쓰는 실제 조회 로직.
  // silent(백그라운드)일 때는 로딩 표시나 에러 배너를 띄우지 않는다 —
  // 사용자가 화면을 만지는 중에 방해가 되면 안 되기 때문에, 실패해도 다음
  // 주기에 다시 시도하는 것으로 충분하다.
  const refreshFromBackend = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!backendConfigured) return false;
      if (Date.now() - lastLocalMutationRef.current < 5000) return false;
      if (!opts?.silent) setRefreshing(true);
      try {
        const result = await gas.bootstrap<Partial<StoreData>>();
        setData(normalize(result));
        if (!opts?.silent) setSyncError(null);
        return true;
      } catch (err) {
        if (!opts?.silent) setSyncError(errorMessage(err));
        return false;
      } finally {
        if (!opts?.silent) setRefreshing(false);
      }
    },
    [backendConfigured]
  );

  // 연동 중일 때만, 화면이 보이는 동안에만 30초마다 조용히 최신 데이터를
  // 받아온다(팀원이 다른 브라우저에서 만든 변경을 실시간까지는 아니어도
  // 곧 볼 수 있게). 다른 탭에 있다가 이 탭으로 돌아올 때도 한 번 더
  // 받아온다 — 30초를 다 못 채우고 돌아온 경우를 위해.
  useEffect(() => {
    if (!backendConfigured || !ready) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshFromBackend({ silent: true });
      }
    }, 30000);
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        refreshFromBackend({ silent: true });
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [backendConfigured, ready, refreshFromBackend]);

  const login = useCallback(
    async (username: string, password: string) => {
      const user = data.users.find((u) => u.username === username);
      if (!user) return false;
      const hash = await sha256Hex(password);
      if (hash !== user.passwordHash) return false;
      setCurrentUserId(user.id);
      window.localStorage.setItem(SESSION_KEY, user.id);
      return true;
    },
    [data.users]
  );

  const logout = useCallback(() => {
    setCurrentUserId(null);
    window.localStorage.removeItem(SESSION_KEY);
  }, []);

  const changePassword = useCallback(
    async (userId: string, currentPassword: string, newPassword: string) => {
      const user = data.users.find((u) => u.id === userId);
      if (!user) return false;
      const currentHash = await sha256Hex(currentPassword);
      if (currentHash !== user.passwordHash) return false;
      const newHash = await sha256Hex(newPassword);
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === userId ? { ...u, passwordHash: newHash } : u)),
      }));
      pushUpdate("users", userId, { passwordHash: newHash });
      logActivity("update", "user", userId, "비밀번호 변경 (본인)");
      return true;
    },
    [data.users, pushUpdate, logActivity]
  );

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

  const addTask = useCallback(
    (input: Omit<Task, "id" | "createdAt" | "progress" | "taskNumber" | "reported">) => {
      const id = genId("t");
      const today = new Date();
      const createdAt = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const checklist = input.checklist ?? [];
      const progress = computeProgress(checklist);
      const status = progress === 100 ? "완료" : input.status;
      const largeCat = (data.categoriesByTeam[input.teamId] ?? []).find(
        (l) => l.name === input.categoryLarge
      );
      const mediumCat = largeCat?.children.find((m) => m.name === input.categoryMedium);
      const taskNumber = generateTaskNumber(
        largeCat?.code ?? "",
        mediumCat?.code ?? "",
        createdAt,
        data.tasks
      );
      const completedAt = progress === 100 ? createdAt : undefined;
      const task: Task = {
        ...input,
        id,
        createdAt,
        progress,
        status,
        taskNumber,
        reported: false,
        completedAt,
      };
      setData((prev) => ({ ...prev, tasks: [task, ...prev.tasks] }));
      pushCreate("tasks", { ...task, checklist: undefined });
      checklist.forEach((item) => {
        pushCreate("checklistItems", {
          id: item.id,
          taskId: id,
          parentId: "",
          label: item.label,
          progress: item.progress,
          dueDate: item.dueDate ?? "",
          createdAt: item.createdAt,
          updatedAt: "",
        });
      });

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
      pushCreate("logEntries", entry);
      logActivity("create", "task", id, `업무 등록: ${input.title}`, {
        taskNumber,
        teamId: input.teamId,
        assigneeId: input.assigneeId,
        priority: input.priority,
      });
      return id;
    },
    [data.tasks, data.categoriesByTeam, pushCreate, logActivity]
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      const task = data.tasks.find((t) => t.id === id);
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
      pushUpdate("tasks", id, patch);
      logActivity("update", "task", id, `업무 수정: ${task?.title ?? id}`, patch);
    },
    [data.tasks, pushUpdate, logActivity]
  );

  const deleteTask = useCallback(
    (id: string) => {
      const task = data.tasks.find((t) => t.id === id);
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== id),
        logEntries: prev.logEntries.filter((l) => l.taskId !== id),
      }));
      pushDelete("tasks", id);
      logActivity("delete", "task", id, `업무 삭제: ${task?.title ?? id}`);
    },
    [data.tasks, pushDelete, logActivity]
  );

  const addChecklistItem = useCallback(
    (taskId: string, parentId: string | null, label: string) => {
      const task = data.tasks.find((t) => t.id === taskId);
      if (!task) return "";
      const id = genId("ci");
      const node: ChecklistItem = {
        id,
        label,
        progress: 0,
        createdAt: new Date().toISOString(),
        children: [],
      };
      const checklist = addNode(task.checklist ?? [], parentId, node);
      const derived = applyChecklist(task, checklist);
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...derived } : t)),
      }));
      pushCreate("checklistItems", {
        id,
        taskId,
        parentId: parentId ?? "",
        label,
        progress: 0,
        dueDate: "",
        createdAt: node.createdAt,
        updatedAt: "",
      });
      pushUpdate("tasks", taskId, {
        progress: derived.progress,
        status: derived.status,
        completedAt: derived.completedAt ?? "",
      });
      logActivity("create", "checklistItem", id, `필요 업무 추가: ${label} (업무: ${task.title})`, {
        taskId,
        label,
      });
      return id;
    },
    [data.tasks, pushCreate, pushUpdate, logActivity]
  );

  const updateChecklistItem = useCallback(
    (
      taskId: string,
      itemId: string,
      patch: Partial<Pick<ChecklistItem, "label" | "progress" | "dueDate">>
    ) => {
      const task = data.tasks.find((t) => t.id === taskId);
      if (!task) return;
      const item = findNode(task.checklist ?? [], itemId);
      const checklist = updateNode(task.checklist ?? [], itemId, patch);
      const derived = applyChecklist(task, checklist);
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...derived } : t)),
      }));
      pushUpdate("checklistItems", itemId, { ...patch, updatedAt: new Date().toISOString() });
      pushUpdate("tasks", taskId, {
        progress: derived.progress,
        status: derived.status,
        completedAt: derived.completedAt ?? "",
      });
      logActivity(
        "update",
        "checklistItem",
        itemId,
        `필요 업무 수정: ${item?.label ?? itemId} (업무: ${task.title})`,
        patch
      );
    },
    [data.tasks, pushUpdate, logActivity]
  );

  const deleteChecklistItem = useCallback(
    (taskId: string, itemId: string) => {
      const task = data.tasks.find((t) => t.id === taskId);
      if (!task) return;
      const removedNode = findNode(task.checklist ?? [], itemId);
      const removedIds = new Set(removedNode ? flatten([removedNode]).map((n) => n.id) : [itemId]);
      const checklist = removeNode(task.checklist ?? [], itemId);
      const derived = applyChecklist(task, checklist);
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...derived } : t)),
        comments: prev.comments.filter(
          (c) => !(c.targetType === "checklist" && removedIds.has(c.targetId))
        ),
        notifications: prev.notifications.filter(
          (n) => !(n.targetType === "checklist" && removedIds.has(n.targetId))
        ),
      }));
      pushDelete("checklistItems", itemId); // 서버가 하위 항목·관련 댓글까지 함께 정리한다
      pushUpdate("tasks", taskId, {
        progress: derived.progress,
        status: derived.status,
        completedAt: derived.completedAt ?? "",
      });
      logActivity(
        "delete",
        "checklistItem",
        itemId,
        `필요 업무 삭제: ${removedNode?.label ?? itemId} (업무: ${task.title})`
      );
    },
    [data.tasks, pushDelete, pushUpdate, logActivity]
  );

  const addLogEntry = useCallback(
    (input: Omit<LogEntry, "id" | "createdAt">) => {
      const id = genId("l");
      const entry: LogEntry = { ...input, id, createdAt: new Date().toISOString() };
      setData((prev) => ({ ...prev, logEntries: [entry, ...prev.logEntries] }));
      pushCreate("logEntries", entry);
      logActivity("create", "logEntry", id, `진행 일지 작성 (업무: ${input.taskId})`, {
        taskId: input.taskId,
        content: input.content,
      });
      return id;
    },
    [pushCreate, logActivity]
  );

  const updateLogEntry = useCallback(
    (id: string, content: string) => {
      const editedAt = new Date().toISOString();
      setData((prev) => ({
        ...prev,
        logEntries: prev.logEntries.map((l) => (l.id === id ? { ...l, content, editedAt } : l)),
      }));
      pushUpdate("logEntries", id, { content, editedAt });
      logActivity("update", "logEntry", id, "진행 일지 수정", { content });
    },
    [pushUpdate, logActivity]
  );

  const deleteLogEntry = useCallback(
    (id: string) => {
      setData((prev) => ({
        ...prev,
        logEntries: prev.logEntries.filter((l) => l.id !== id),
        comments: prev.comments.filter((c) => !(c.targetType === "log" && c.targetId === id)),
        notifications: prev.notifications.filter((n) => !(n.targetType === "log" && n.targetId === id)),
      }));
      pushDelete("logEntries", id); // 서버가 관련 댓글까지 함께 정리한다
      logActivity("delete", "logEntry", id, "진행 일지 삭제");
    },
    [pushDelete, logActivity]
  );

  const addComment = useCallback(
    (input: Omit<Comment, "id" | "createdAt">) => {
      const id = genId("c");
      const comment: Comment = { ...input, id, createdAt: new Date().toISOString() };
      setData((prev) => ({ ...prev, comments: [...prev.comments, comment] }));
      pushCreate("comments", comment);

      // 이 댓글이 달린 업무의 담당자·협업자에게 알림을 남긴다(작성자
      // 본인은 제외) — "내 업무"에 누가 신경 쓰고 있는지 놓치지 않도록.
      const taskId = findTaskIdForCommentTarget(input.targetType, input.targetId, data.tasks, data.logEntries);
      const task = taskId ? data.tasks.find((t) => t.id === taskId) : undefined;
      if (task) {
        const recipients = new Set([task.assigneeId, ...task.collaboratorIds]);
        recipients.delete(input.authorId);
        const preview = input.content.length > 80 ? `${input.content.slice(0, 80)}…` : input.content;
        const newNotifications: Notification[] = [...recipients]
          .filter((recipientId) => !!recipientId)
          .map((recipientId) => ({
            id: genId("n"),
            recipientId,
            actorId: input.authorId,
            taskId: task.id,
            targetType: input.targetType,
            targetId: input.targetId,
            commentId: id,
            contentPreview: preview,
            read: false,
            createdAt: comment.createdAt,
          }));
        if (newNotifications.length > 0) {
          setData((prev) => ({ ...prev, notifications: [...prev.notifications, ...newNotifications] }));
          newNotifications.forEach((n) => pushCreate("notifications", n));
        }
      }
      logActivity("create", "comment", id, `댓글 작성 (${input.targetType})`, {
        targetType: input.targetType,
        targetId: input.targetId,
        content: input.content,
      });
      return id;
    },
    [data.tasks, data.logEntries, pushCreate, logActivity]
  );

  const updateComment = useCallback(
    (id: string, content: string) => {
      const editedAt = new Date().toISOString();
      setData((prev) => ({
        ...prev,
        comments: prev.comments.map((c) => (c.id === id ? { ...c, content, editedAt } : c)),
      }));
      pushUpdate("comments", id, { content, editedAt });
      logActivity("update", "comment", id, "댓글 수정", { content });
    },
    [pushUpdate, logActivity]
  );

  const deleteComment = useCallback(
    (id: string) => {
      setData((prev) => ({
        ...prev,
        comments: prev.comments.filter((c) => c.id !== id),
        notifications: prev.notifications.filter((n) => n.commentId !== id),
      }));
      pushDelete("comments", id);
      logActivity("delete", "comment", id, "댓글 삭제");
    },
    [pushDelete, logActivity]
  );

  const markNotificationRead = useCallback(
    (id: string, read: boolean) => {
      setData((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read } : n)),
      }));
      pushUpdate("notifications", id, { read });
    },
    [pushUpdate]
  );

  const addResource = useCallback(
    (input: Omit<ResourceDoc, "id" | "createdAt">) => {
      const id = genId("r");
      const resource: ResourceDoc = { ...input, id, createdAt: new Date().toISOString() };
      setData((prev) => ({ ...prev, resources: [resource, ...prev.resources] }));
      pushCreate("resources", resource);
      logActivity("create", "resource", id, `자료 등록: ${input.title}`, { category: input.category });
      return id;
    },
    [pushCreate, logActivity]
  );

  const deleteResource = useCallback(
    (id: string) => {
      const resource = data.resources.find((r) => r.id === id);
      setData((prev) => ({ ...prev, resources: prev.resources.filter((r) => r.id !== id) }));
      pushDelete("resources", id);
      if (backendConfigured) {
        (resource?.files ?? []).forEach((f) => {
          if (f.driveFileId) gas.deleteFile(f.driveFileId).catch(() => {});
        });
      }
      logActivity("delete", "resource", id, `자료 삭제: ${resource?.title ?? id}`);
    },
    [data.resources, backendConfigured, pushDelete, logActivity]
  );

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

  const addTeam = useCallback(
    (name: string) => {
      const id = genId("team");
      const board = { id: `board_${id}_default`, teamId: id, name: "전체", visibleColumns: BUILTIN_COLUMNS.map((c) => c.key) };
      setData((prev) => ({
        ...prev,
        teams: [...prev.teams, { id, name }],
        categoriesByTeam: { ...prev.categoriesByTeam, [id]: [] },
        boards: [...prev.boards, board],
      }));
      pushCreate("teams", { id, name });
      pushCreate("boards", board);
      logActivity("create", "team", id, `팀 추가: ${name}`);
    },
    [pushCreate, logActivity]
  );

  const renameTeam = useCallback(
    (id: string, name: string) => {
      setData((prev) => ({
        ...prev,
        teams: prev.teams.map((t) => (t.id === id ? { ...t, name } : t)),
      }));
      pushUpdate("teams", id, { name });
      logActivity("update", "team", id, `팀 이름 변경: ${name}`);
    },
    [pushUpdate, logActivity]
  );

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
      pushDelete("teams", id); // 서버가 해당 팀의 카테고리·게시판까지 함께 정리한다
      logActivity("delete", "team", id, "팀 삭제");
      return true;
    },
    [data.tasks, data.users, pushDelete, logActivity]
  );

  // --- Admin: centers ---

  const addCenter = useCallback(
    (name: string) => {
      setData((prev) => (prev.centers.includes(name) ? prev : { ...prev, centers: [...prev.centers, name] }));
      pushCreate("centers", { name });
      logActivity("create", "center", name, `센터 추가: ${name}`);
    },
    [pushCreate, logActivity]
  );

  const renameCenter = useCallback(
    (oldName: string, newName: string) => {
      const affectedTaskIds = data.tasks.filter((t) => t.center === oldName).map((t) => t.id);
      setData((prev) => ({
        ...prev,
        centers: prev.centers.map((c) => (c === oldName ? newName : c)),
        tasks: prev.tasks.map((t) => (t.center === oldName ? { ...t, center: newName } : t)),
      }));
      pushUpdate("centers", oldName, { name: newName });
      affectedTaskIds.forEach((taskId) => pushUpdate("tasks", taskId, { center: newName }));
      logActivity("update", "center", newName, `센터 이름 변경: ${oldName} → ${newName}`);
    },
    [data.tasks, pushUpdate, logActivity]
  );

  const deleteCenter = useCallback(
    (name: string) => {
      const inUse = data.tasks.some((t) => t.center === name);
      if (inUse) return false;
      setData((prev) => ({ ...prev, centers: prev.centers.filter((c) => c !== name) }));
      pushDelete("centers", name);
      logActivity("delete", "center", name, `센터 삭제: ${name}`);
      return true;
    },
    [data.tasks, pushDelete, logActivity]
  );

  // --- Admin: categories ---

  const addCategoryLarge = useCallback(
    (teamId: string, name: string) => {
      const siblings = data.categoriesByTeam[teamId] ?? [];
      const code = nextLargeCode(siblings.map((l) => l.code));
      const id = genId("cl");
      setData((prev) => ({
        ...prev,
        categoriesByTeam: {
          ...prev.categoriesByTeam,
          [teamId]: [...(prev.categoriesByTeam[teamId] ?? []), { id, name, code, children: [] }],
        },
      }));
      pushCreate("categoryLarge", { id, teamId, name, code });
      logActivity("create", "categoryLarge", id, `대분류 추가: ${name}`, { teamId, code });
    },
    [data.categoriesByTeam, pushCreate, logActivity]
  );

  const renameCategoryLarge = useCallback(
    (teamId: string, id: string, name: string) => {
      setData((prev) => ({
        ...prev,
        categoriesByTeam: {
          ...prev.categoriesByTeam,
          [teamId]: (prev.categoriesByTeam[teamId] ?? []).map((l) =>
            l.id === id ? { ...l, name } : l
          ),
        },
      }));
      pushUpdate("categoryLarge", id, { name });
      logActivity("update", "categoryLarge", id, `대분류 이름 변경: ${name}`);
    },
    [pushUpdate, logActivity]
  );

  const deleteCategoryLarge = useCallback(
    (teamId: string, id: string) => {
      setData((prev) => ({
        ...prev,
        categoriesByTeam: {
          ...prev.categoriesByTeam,
          [teamId]: (prev.categoriesByTeam[teamId] ?? []).filter((l) => l.id !== id),
        },
      }));
      pushDelete("categoryLarge", id); // 서버가 하위 중분류까지 함께 정리한다
      logActivity("delete", "categoryLarge", id, "대분류 삭제");
    },
    [pushDelete, logActivity]
  );

  const addCategoryMedium = useCallback(
    (teamId: string, largeId: string, name: string) => {
      const large = (data.categoriesByTeam[teamId] ?? []).find((l) => l.id === largeId);
      const code = nextMediumCode((large?.children ?? []).map((m) => m.code));
      const id = genId("cm");
      setData((prev) => ({
        ...prev,
        categoriesByTeam: {
          ...prev.categoriesByTeam,
          [teamId]: (prev.categoriesByTeam[teamId] ?? []).map((l) =>
            l.id === largeId ? { ...l, children: [...l.children, { id, name, code }] } : l
          ),
        },
      }));
      pushCreate("categoryMedium", { id, largeId, name, code });
      logActivity("create", "categoryMedium", id, `중분류 추가: ${name}`, { largeId, code });
    },
    [data.categoriesByTeam, pushCreate, logActivity]
  );

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
      pushUpdate("categoryMedium", id, { name });
      logActivity("update", "categoryMedium", id, `중분류 이름 변경: ${name}`);
    },
    [pushUpdate, logActivity]
  );

  const deleteCategoryMedium = useCallback(
    (teamId: string, largeId: string, id: string) => {
      setData((prev) => ({
        ...prev,
        categoriesByTeam: {
          ...prev.categoriesByTeam,
          [teamId]: (prev.categoriesByTeam[teamId] ?? []).map((l) =>
            l.id === largeId ? { ...l, children: l.children.filter((m) => m.id !== id) } : l
          ),
        },
      }));
      pushDelete("categoryMedium", id);
      logActivity("delete", "categoryMedium", id, "중분류 삭제");
    },
    [pushDelete, logActivity]
  );

  // --- Admin: boards ---

  const addBoard = useCallback(
    (teamId: string, name: string) => {
      const id = genId("board");
      const board = { id, teamId, name, visibleColumns: BUILTIN_COLUMNS.map((c) => c.key) };
      setData((prev) => ({ ...prev, boards: [...prev.boards, board] }));
      pushCreate("boards", board);
      logActivity("create", "board", id, `게시판 추가: ${name}`, { teamId });
    },
    [pushCreate, logActivity]
  );

  const updateBoard = useCallback(
    (id: string, patch: Partial<Pick<Board, "name" | "visibleColumns">>) => {
      setData((prev) => ({
        ...prev,
        boards: prev.boards.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      }));
      pushUpdate("boards", id, patch);
      logActivity("update", "board", id, "게시판 수정", patch);
    },
    [pushUpdate, logActivity]
  );

  const deleteBoard = useCallback(
    (id: string) => {
      setData((prev) => ({ ...prev, boards: prev.boards.filter((b) => b.id !== id) }));
      pushDelete("boards", id);
      logActivity("delete", "board", id, "게시판 삭제");
    },
    [pushDelete, logActivity]
  );

  // --- Admin: custom fields ---

  const addCustomField = useCallback(
    (label: string, type: CustomFieldDef["type"], options?: string[]) => {
      const id = genId("field");
      setData((prev) => ({ ...prev, customFields: [...prev.customFields, { id, label, type, options }] }));
      pushCreate("customFields", { id, label, type, options: options ?? [] });
      logActivity("create", "customField", id, `커스텀 필드 추가: ${label}`, { type, options });
    },
    [pushCreate, logActivity]
  );

  const deleteCustomField = useCallback(
    (id: string) => {
      const affectedBoards = data.boards
        .filter((b) => b.visibleColumns.includes(id))
        .map((b) => ({ id: b.id, visibleColumns: b.visibleColumns.filter((c) => c !== id) }));
      setData((prev) => ({
        ...prev,
        customFields: prev.customFields.filter((f) => f.id !== id),
        boards: prev.boards.map((b) => ({
          ...b,
          visibleColumns: b.visibleColumns.filter((c) => c !== id),
        })),
      }));
      pushDelete("customFields", id);
      affectedBoards.forEach((b) => pushUpdate("boards", b.id, { visibleColumns: b.visibleColumns }));
      logActivity("delete", "customField", id, "커스텀 필드 삭제");
    },
    [data.boards, pushDelete, pushUpdate, logActivity]
  );

  // --- Admin: users ---

  const addUser = useCallback(
    (name: string, teamId: string) => {
      const id = genId("u");
      const user: User = {
        id,
        name,
        username: name,
        passwordHash: DEFAULT_PASSWORD_HASH,
        teamId,
        viewTeamIds: [teamId],
        level: 1,
        isAdmin: false,
      };
      setData((prev) => ({ ...prev, users: [...prev.users, user] }));
      pushCreate("users", user);
      logActivity("create", "user", id, `사용자 추가: ${name}`, { teamId });
    },
    [pushCreate, logActivity]
  );

  const updateUser = useCallback(
    (id: string, patch: Partial<Pick<User, "teamId" | "viewTeamIds" | "level" | "isAdmin">>) => {
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      }));
      pushUpdate("users", id, patch);
      logActivity("update", "user", id, "사용자 권한 수정", patch);
    },
    [pushUpdate, logActivity]
  );

  // 관리자 전용: 본인 인증 없이 지정한 사용자의 비밀번호를 기본값(초기
  // 비밀번호)으로 되돌린다 — 계정을 잠근 사용자를 관리자가 구제할 때 사용.
  const resetUserPassword = useCallback(
    (id: string) => {
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === id ? { ...u, passwordHash: DEFAULT_PASSWORD_HASH } : u)),
      }));
      pushUpdate("users", id, { passwordHash: DEFAULT_PASSWORD_HASH });
      logActivity("update", "user", id, "비밀번호 초기화 (관리자)");
    },
    [pushUpdate, logActivity]
  );

  const deleteUser = useCallback(
    (id: string) => {
      if (currentUser?.id === id) return false; // can't delete the account you're logged in as
      const referenced =
        data.tasks.some(
          (t) => t.assigneeId === id || t.createdBy === id || t.collaboratorIds.includes(id)
        ) ||
        data.logEntries.some((l) => l.authorId === id) ||
        data.comments.some((c) => c.authorId === id) ||
        data.resources.some((r) => r.uploadedBy === id);
      if (referenced) return false;
      const target = data.users.find((u) => u.id === id);
      const remainingAdmins = data.users.filter((u) => u.isAdmin && u.id !== id).length;
      if (target?.isAdmin && remainingAdmins === 0) return false; // keep at least one admin
      setData((prev) => ({ ...prev, users: prev.users.filter((u) => u.id !== id) }));
      pushDelete("users", id);
      logActivity("delete", "user", id, `사용자 삭제: ${target?.name ?? id}`);
      return true;
    },
    [data.tasks, data.logEntries, data.comments, data.resources, data.users, currentUser, pushDelete, logActivity]
  );

  // 구글 시트에 연동된 상태에서는 여기서 되돌리면 팀 전체가 공유하는
  // 데이터가 데모값으로 지워질 위험이 있어, 연동 중에는 동작하지 않는다.
  const resetDemoData = useCallback(() => {
    if (backendConfigured) return false;
    const seeded: StoreData = {
      teams: SEED_TEAMS,
      centers: SEED_CENTERS,
      categoriesByTeam: SEED_CATEGORIES_BY_TEAM,
      boards: SEED_BOARDS,
      customFields: SEED_CUSTOM_FIELDS,
      users: USERS,
      tasks: SEED_TASKS,
      logEntries: SEED_LOG_ENTRIES,
      comments: SEED_COMMENTS,
      resources: [],
      notifications: [],
      settings: DEFAULT_SETTINGS,
      calendarEvents: [],
    };
    setData(seeded);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return true;
  }, [backendConfigured]);

  // --- 캘린더 일정: 업무와 별개로 팀 구분 없이 누구나 등록 ---

  const addCalendarEvent = useCallback(
    (input: Omit<CalendarEvent, "id" | "createdAt">) => {
      const id = genId("ev");
      const event: CalendarEvent = { ...input, id, createdAt: new Date().toISOString().slice(0, 10) };
      setData((prev) => ({ ...prev, calendarEvents: [event, ...prev.calendarEvents] }));
      pushCreate("calendarEvents", event);
      logActivity("create", "calendarEvent", id, `일정 등록: ${input.title}`, {
        startDate: input.startDate,
        endDate: input.endDate,
      });
      return id;
    },
    [pushCreate, logActivity]
  );

  const updateCalendarEvent = useCallback(
    (id: string, patch: Partial<Pick<CalendarEvent, "title" | "description" | "startDate" | "endDate">>) => {
      setData((prev) => ({
        ...prev,
        calendarEvents: prev.calendarEvents.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)),
      }));
      pushUpdate("calendarEvents", id, patch);
      logActivity("update", "calendarEvent", id, "일정 수정", patch);
    },
    [pushUpdate, logActivity]
  );

  const deleteCalendarEvent = useCallback(
    (id: string) => {
      const event = data.calendarEvents.find((ev) => ev.id === id);
      setData((prev) => ({ ...prev, calendarEvents: prev.calendarEvents.filter((ev) => ev.id !== id) }));
      pushDelete("calendarEvents", id);
      logActivity("delete", "calendarEvent", id, `일정 삭제: ${event?.title ?? id}`);
    },
    [data.calendarEvents, pushDelete, logActivity]
  );

  // 관리자 전용(관리자 설정 화면에서만 노출) — 로그인 화면·상단바에 표시될
  // 프로그램 제목을 바꾼다.
  const updateAppTitle = useCallback(
    (title: string) => {
      const appTitle = title.trim() || DEFAULT_APP_TITLE;
      setData((prev) => ({ ...prev, settings: { ...prev.settings, appTitle } }));
      pushUpdate("settings", "app", { appTitle });
      logActivity("update", "settings", "app", `프로그램 제목 변경: ${appTitle}`);
    },
    [pushUpdate, logActivity]
  );

  // 로그인 화면·상단바 로고에 쓸 아이콘. 빈 문자열을 주면 기본 내장
  // 아이콘으로 되돌린다.
  const updateAppIcon = useCallback(
    (url: string) => {
      setData((prev) => ({ ...prev, settings: { ...prev.settings, appIconUrl: url } }));
      pushUpdate("settings", "app", { appIconUrl: url });
      logActivity("update", "settings", "app", url ? "프로그램 아이콘 변경" : "프로그램 아이콘을 기본값으로 되돌림");
    },
    [pushUpdate, logActivity]
  );

  const value: StoreContextValue = {
    teams: data.teams,
    centers: data.centers,
    categoriesByTeam: data.categoriesByTeam,
    boards: data.boards,
    customFields: data.customFields,
    users: data.users,
    allTasks: data.tasks,
    tasks: visibleTasks,
    logEntries: data.logEntries,
    comments: data.comments,
    resources: data.resources,
    notifications: data.notifications,
    calendarEvents: data.calendarEvents,
    appTitle: data.settings.appTitle,
    appIconUrl: data.settings.appIconUrl,
    currentUser,
    ready,
    backendConfigured,
    backendError,
    syncError,
    retryBackend,
    dismissSyncError: () => setSyncError(null),
    refreshing,
    refreshFromBackend,
    login,
    logout,
    changePassword,
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
    markNotificationRead,
    addResource,
    deleteResource,
    getUser,
    canEdit,
    canEditTask,
    canViewTask,
    addTeam,
    renameTeam,
    deleteTeam,
    addCenter,
    renameCenter,
    deleteCenter,
    addCategoryLarge,
    renameCategoryLarge,
    deleteCategoryLarge,
    addCategoryMedium,
    renameCategoryMedium,
    deleteCategoryMedium,
    addBoard,
    updateBoard,
    deleteBoard,
    addCustomField,
    deleteCustomField,
    addUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    resetDemoData,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    updateAppTitle,
    updateAppIcon,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
