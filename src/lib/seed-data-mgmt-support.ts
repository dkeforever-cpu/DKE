import { CategoryLarge, Comment, Task, User } from "./types";

// 실제 업무 이관 데이터(담당자 이름, 업무 카테고리, 업무 기록)가 여기에
// 있었으나, 배포되는 앱 코드(Function.html)에 실제 직원 이름과 업무
// 내용이 그대로 노출되는 문제로 전부 제거했다. 구글 시트 연동 시
// bootstrap()이 실제 데이터를 가져와 이 자리를 대체하므로, 로컬 저장
// 모드(연동 전)에서만 쓰이는 이 시드는 비어 있어도 실제 사용에는
// 지장이 없다.
export const MGMT_SUPPORT_USERS: User[] = [];
export const MGMT_SUPPORT_CATEGORIES: CategoryLarge[] = [];
export const MGMT_SUPPORT_TASKS: Task[] = [];
export const MGMT_SUPPORT_COMMENTS: Comment[] = [];
