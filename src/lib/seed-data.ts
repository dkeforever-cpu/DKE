import {
  Board,
  CategoryLarge,
  Comment,
  CustomFieldDef,
  LogEntry,
  Task,
  Team,
  User,
  BUILTIN_COLUMNS,
} from "./types";
import { seedCategoriesByTeam } from "./categories";
import { generateTaskNumber } from "./format";
import { DEFAULT_PASSWORD_HASH } from "./auth";
import {
  MGMT_SUPPORT_CATEGORIES,
  MGMT_SUPPORT_COMMENTS,
  MGMT_SUPPORT_TASKS,
  MGMT_SUPPORT_USERS,
} from "./seed-data-mgmt-support";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function offsetDateTime(days: number, hh: number, mm: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

export const SEED_TEAMS: Team[] = [
  { id: "관리팀", name: "관리팀" },
  { id: "재경팀", name: "재경팀" },
];

export const SEED_CATEGORIES_BY_TEAM: Record<string, CategoryLarge[]> = (() => {
  const base = seedCategoriesByTeam();
  base.관리팀 = [...base.관리팀, ...MGMT_SUPPORT_CATEGORIES];
  return base;
})();

export const SEED_CUSTOM_FIELDS: CustomFieldDef[] = [];

export const SEED_BOARDS: Board[] = SEED_TEAMS.map((t) => ({
  id: `board_${t.id}_default`,
  teamId: t.id,
  name: "전체",
  visibleColumns: BUILTIN_COLUMNS.map((c) => c.key),
}));

export const USERS: User[] = [
  {
    id: "admin",
    name: "관리자",
    username: "admin",
    passwordHash: DEFAULT_PASSWORD_HASH,
    teamId: "관리팀",
    viewTeamIds: ["관리팀", "재경팀"],
    level: 1,
    isAdmin: true,
  },
  {
    id: "u6",
    name: "김재경",
    username: "김재경",
    passwordHash: DEFAULT_PASSWORD_HASH,
    teamId: "재경팀",
    viewTeamIds: ["관리팀", "재경팀"],
    level: 1,
    isAdmin: true,
  },
  {
    id: "u7",
    name: "정다은",
    username: "정다은",
    passwordHash: DEFAULT_PASSWORD_HASH,
    teamId: "재경팀",
    viewTeamIds: ["재경팀"],
    level: 1,
    isAdmin: false,
  },
  {
    id: "u8",
    name: "최수민",
    username: "최수민",
    passwordHash: DEFAULT_PASSWORD_HASH,
    teamId: "재경팀",
    viewTeamIds: ["재경팀"],
    level: 1,
    isAdmin: false,
  },
  {
    id: "u9",
    name: "노현우",
    username: "노현우",
    passwordHash: DEFAULT_PASSWORD_HASH,
    teamId: "재경팀",
    viewTeamIds: ["재경팀"],
    level: 1,
    isAdmin: false,
  },
  {
    id: "u10",
    name: "임소연",
    username: "임소연",
    passwordHash: DEFAULT_PASSWORD_HASH,
    teamId: "재경팀",
    viewTeamIds: ["재경팀"],
    level: 1,
    isAdmin: false,
  },
  ...MGMT_SUPPORT_USERS,
];

const BASE_TASKS: Omit<Task, "taskNumber">[] = [
  {
    id: "t8",
    title: "8월 법인카드 사용내역 정산",
    description: "관리팀·재경팀 법인카드 8월 사용내역 정산 및 증빙 확인.",
    teamId: "재경팀",
    categoryLarge: "지출결의",
    categoryMedium: "경비집행",
    assigneeId: "u7",
    collaboratorIds: [],
    center: "본사",
    priority: "보통",
    status: "검토중",
    reported: false,
    progress: 85,
    level: 2,
    dueDate: offsetDate(5),
    createdBy: "u7",
    createdAt: offsetDate(-16),
  },
  {
    id: "t9",
    title: "3분기 부가세 신고 준비",
    description: "3분기 부가가치세 신고서 작성 및 증빙자료 취합.",
    teamId: "재경팀",
    categoryLarge: "세무/신고",
    categoryMedium: "부가세",
    assigneeId: "u6",
    collaboratorIds: [],
    center: "본사",
    priority: "높음",
    status: "진행중",
    reported: false,
    progress: 40,
    level: 1,
    dueDate: offsetDate(9),
    createdBy: "u6",
    createdAt: offsetDate(-6),
  },
  {
    id: "t10",
    title: "신규 거래처 계약조건 검토 (물류포장재)",
    description: "물류포장재 신규 공급업체 계약조건(단가, 결제조건) 검토.",
    teamId: "재경팀",
    categoryLarge: "거래처관리",
    categoryMedium: "신규등록",
    assigneeId: "u9",
    collaboratorIds: [],
    center: "본사",
    priority: "보통",
    status: "대기",
    reported: false,
    progress: 0,
    level: 1,
    dueDate: offsetDate(-2),
    createdBy: "u9",
    createdAt: offsetDate(-3),
  },
  {
    id: "t11",
    title: "센터별 인건비 예산 조정",
    description: "하반기 센터별 인건비 예산 조정안 확정 및 배포.",
    teamId: "재경팀",
    categoryLarge: "예산관리",
    categoryMedium: "추경/조정",
    assigneeId: "u8",
    collaboratorIds: [],
    center: "본사",
    priority: "낮음",
    status: "완료",
    reported: false,
    progress: 100,
    level: 3,
    dueDate: offsetDate(-20),
    createdBy: "u8",
    createdAt: offsetDate(-35),
  },
];

function categoryCodes(teamId: string, large: string, medium: string): [string, string] {
  const l = SEED_CATEGORIES_BY_TEAM[teamId]?.find((c) => c.name === large);
  const m = l?.children.find((c) => c.name === medium);
  return [l?.code ?? "", m?.code ?? ""];
}

export const SEED_TASKS: Task[] = (() => {
  const withNumbers: Task[] = [];
  for (const t of BASE_TASKS) {
    const [largeCode, mediumCode] = categoryCodes(t.teamId, t.categoryLarge, t.categoryMedium);
    const taskNumber = generateTaskNumber(largeCode, mediumCode, t.createdAt, withNumbers);
    withNumbers.push({ ...t, taskNumber });
  }
  return [...withNumbers, ...MGMT_SUPPORT_TASKS];
})();

export const SEED_LOG_ENTRIES: LogEntry[] = [
  {
    id: "l6",
    taskId: "t8",
    authorId: "u7",
    content: "업무 등록. 8월 법인카드 명세서 다운로드 완료.",
    attachments: ["법인카드_명세서_8월.pdf"],
    createdAt: offsetDateTime(-16, 9, 0),
  },
  {
    id: "l7",
    taskId: "t8",
    authorId: "u7",
    content: "증빙 누락 3건 확인, 담당자에게 소명 요청함.",
    attachments: [],
    createdAt: offsetDateTime(-2, 13, 40),
  },
];

export const SEED_COMMENTS: Comment[] = [...MGMT_SUPPORT_COMMENTS];
