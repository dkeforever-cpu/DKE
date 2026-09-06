import { CategoryLarge } from "./types";

export const CENTERS = [
  "군포네이버",
  "동탄온라인",
  "동탄저온",
  "성남씨푸드",
  "안성올리브영",
  "양지올리브영",
  "오산삼양",
  "오산투썸",
  "오산BGF",
  "용인네이버",
  "용인푸드빌",
  "평택사조",
];

let seq = 0;
function nid(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}

function large(code: string, name: string, children: ReturnType<typeof medium>[]): CategoryLarge {
  return { id: nid("cl"), name, code, children };
}
function medium(code: string, name: string) {
  return { id: nid("cm"), name, code };
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
      large("A", "예산관리", [medium("01", "연간예산"), medium("02", "추경/조정")]),
      large("B", "지출결의", [medium("01", "경비집행"), medium("02", "대금지급")]),
      large("C", "정산/마감", [medium("01", "월마감"), medium("02", "분기마감")]),
      large("D", "거래처관리", [medium("01", "신규등록"), medium("02", "정산관리")]),
      large("E", "세무/신고", [medium("01", "부가세"), medium("02", "원천세")]),
    ],
  };
}
