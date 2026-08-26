import { Dept } from "./types";

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

export interface CategoryNode {
  name: string;
  children: { name: string; children: string[] }[];
}

export const CATEGORY_TREE: Record<Dept, CategoryNode[]> = {
  관리팀: [
    {
      name: "시설/자산관리",
      children: [
        { name: "설비점검", children: ["소방안전점검", "전기안전점검", "냉동설비점검"] },
        { name: "자산관리", children: ["비품관리", "차량관리"] },
      ],
    },
    {
      name: "계약관리",
      children: [
        { name: "임차계약", children: ["갱신협상", "신규계약"] },
        { name: "용역계약", children: ["경비/미화", "물류대행"] },
      ],
    },
    {
      name: "인사지원",
      children: [
        { name: "채용지원", children: ["면접일정", "서류심사"] },
        { name: "근태/복지", children: ["연차관리", "복지몰"] },
      ],
    },
    {
      name: "문서/공문관리",
      children: [
        { name: "공문발송", children: ["대외공문", "대내공문"] },
        { name: "문서보관", children: ["계약서보관", "인허가서류"] },
      ],
    },
    {
      name: "센터운영관리",
      children: [
        { name: "실사/점검", children: ["재고실사", "안전점검"] },
        { name: "예산취합", children: ["센터별예산", "인력운영계획"] },
      ],
    },
  ],
  재경팀: [
    {
      name: "예산관리",
      children: [
        { name: "연간예산", children: ["센터별예산", "인건비예산"] },
        { name: "추경/조정", children: ["예산조정", "이월관리"] },
      ],
    },
    {
      name: "지출결의",
      children: [
        { name: "경비집행", children: ["법인카드", "출장비"] },
        { name: "대금지급", children: ["매입대금", "용역대금"] },
      ],
    },
    {
      name: "정산/마감",
      children: [
        { name: "월마감", children: ["매출마감", "비용마감"] },
        { name: "분기마감", children: ["부가세신고", "결산보고"] },
      ],
    },
    {
      name: "거래처관리",
      children: [
        { name: "신규등록", children: ["공급업체등록", "계약조건검토"] },
        { name: "정산관리", children: ["미수금관리", "미지급금관리"] },
      ],
    },
    {
      name: "세무/신고",
      children: [
        { name: "부가세", children: ["신고서작성", "증빙관리"] },
        { name: "원천세", children: ["급여원천세", "사업소득원천세"] },
      ],
    },
  ],
};
