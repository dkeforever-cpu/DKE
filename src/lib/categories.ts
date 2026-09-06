import { CategoryLarge } from "./types";

export const CENTERS = [
  "본사",
  "서울센터",
  "부산센터",
  "인천센터",
  "대전센터",
  "광주센터",
  "대구센터",
  "울산센터",
  "수원센터",
  "청주센터",
  "전주센터",
  "창원센터",
  "제주센터",
];

let seq = 0;
function nid(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}

function large(code: string, name: string, children: ReturnType<typeof medium>[]): CategoryLarge {
  return { id: nid("cl"), name, code, children };
}
function medium(code: string, name: string, children: string[]) {
  return {
    id: nid("cm"),
    name,
    code,
    children: children.map((n) => ({ id: nid("cs"), name: n })),
  };
}

/** 업무번호에 쓸 다음 대분류 코드(A, B, C...): 이미 쓰인 코드는 건너뛴다. */
export function nextLargeCode(used: Iterable<string>): string {
  const usedSet = new Set(used);
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!usedSet.has(letter)) return letter;
  }
  let i = 1;
  while (usedSet.has(`X${i}`)) i++;
  return `X${i}`;
}

/** 업무번호에 쓸 다음 중분류 코드(01, 02...): 이미 쓰인 코드는 건너뛴다. */
export function nextMediumCode(used: Iterable<string>): string {
  const usedSet = new Set(used);
  for (let i = 1; i <= 99; i++) {
    const code = String(i).padStart(2, "0");
    if (!usedSet.has(code)) return code;
  }
  let i = 100;
  while (usedSet.has(String(i))) i++;
  return String(i);
}

/**
 * Seed category taxonomy per team, admin-editable afterward. 관리팀은 이제
 * seed-data-mgmt-support.ts에서 만든 실제 카테고리(MGMT_SUPPORT_CATEGORIES)를
 * 쓰므로 여기서는 빈 배열로 시작한다 — 예전 예시용 카테고리는 삭제됨.
 */
export function seedCategoriesByTeam(): Record<string, CategoryLarge[]> {
  return {
    관리팀: [],
    재경팀: [
      large("A", "예산관리", [
        medium("01", "연간예산", ["센터별예산", "인건비예산"]),
        medium("02", "추경/조정", ["예산조정", "이월관리"]),
      ]),
      large("B", "지출결의", [
        medium("01", "경비집행", ["법인카드", "출장비"]),
        medium("02", "대금지급", ["매입대금", "용역대금"]),
      ]),
      large("C", "정산/마감", [
        medium("01", "월마감", ["매출마감", "비용마감"]),
        medium("02", "분기마감", ["부가세신고", "결산보고"]),
      ]),
      large("D", "거래처관리", [
        medium("01", "신규등록", ["공급업체등록", "계약조건검토"]),
        medium("02", "정산관리", ["미수금관리", "미지급금관리"]),
      ]),
      large("E", "세무/신고", [
        medium("01", "부가세", ["신고서작성", "증빙관리"]),
        medium("02", "원천세", ["급여원천세", "사업소득원천세"]),
      ]),
    ],
  };
}
