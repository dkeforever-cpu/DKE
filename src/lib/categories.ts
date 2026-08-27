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

function large(name: string, children: ReturnType<typeof medium>[]): CategoryLarge {
  return { id: nid("cl"), name, children };
}
function medium(name: string, children: string[]) {
  return { id: nid("cm"), name, children: children.map((n) => ({ id: nid("cs"), name: n })) };
}

/** Seed category taxonomy for the two default teams, admin-editable afterward. */
export function seedCategoriesByTeam(): Record<string, CategoryLarge[]> {
  return {
    관리팀: [
      large("시설/자산관리", [
        medium("설비점검", ["소방안전점검", "전기안전점검", "냉동설비점검"]),
        medium("자산관리", ["비품관리", "차량관리"]),
      ]),
      large("계약관리", [
        medium("임차계약", ["갱신협상", "신규계약"]),
        medium("용역계약", ["경비/미화", "물류대행"]),
      ]),
      large("인사지원", [
        medium("채용지원", ["면접일정", "서류심사"]),
        medium("근태/복지", ["연차관리", "복지몰"]),
      ]),
      large("문서/공문관리", [
        medium("공문발송", ["대외공문", "대내공문"]),
        medium("문서보관", ["계약서보관", "인허가서류"]),
      ]),
      large("센터운영관리", [
        medium("실사/점검", ["재고실사", "안전점검"]),
        medium("예산취합", ["센터별예산", "인력운영계획"]),
      ]),
    ],
    재경팀: [
      large("예산관리", [
        medium("연간예산", ["센터별예산", "인건비예산"]),
        medium("추경/조정", ["예산조정", "이월관리"]),
      ]),
      large("지출결의", [
        medium("경비집행", ["법인카드", "출장비"]),
        medium("대금지급", ["매입대금", "용역대금"]),
      ]),
      large("정산/마감", [
        medium("월마감", ["매출마감", "비용마감"]),
        medium("분기마감", ["부가세신고", "결산보고"]),
      ]),
      large("거래처관리", [
        medium("신규등록", ["공급업체등록", "계약조건검토"]),
        medium("정산관리", ["미수금관리", "미지급금관리"]),
      ]),
      large("세무/신고", [
        medium("부가세", ["신고서작성", "증빙관리"]),
        medium("원천세", ["급여원천세", "사업소득원천세"]),
      ]),
    ],
  };
}
