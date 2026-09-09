import type * as ExcelJSNamespace from "exceljs";

// Excel 내보내기 버튼을 실제로 누르기 전까지는 이 무거운(최소화해도
// 수백 KB) 서식 라이브러리를 받아오지 않는다 — 대시보드를 여는 모든
// 사용자에게 매번 딸려가지 않도록 동적으로만 불러온다.
//
// 구글 앱스스크립트 배포판(App.html 하나로 합쳐 배포하는 정적 번들)에서는
// 이 파일 자체가 다른 구현으로 치환된다 — 번들에 직접 포함시키는 대신
// Code.gs의 doGet(?resource=exceljs)에서 별도로 내려주는 스크립트를
// <script src>로 불러온다. 자세한 이유는 apps-script/Code.gs 주석 참고.
export type ExcelJSModule = typeof ExcelJSNamespace;

declare global {
  interface Window {
    ExcelJS?: ExcelJSModule;
  }
}

let cached: Promise<ExcelJSModule> | null = null;

export function loadExcelJS(): Promise<ExcelJSModule> {
  if (typeof window !== "undefined" && window.ExcelJS) return Promise.resolve(window.ExcelJS);
  if (!cached) {
    cached = import("exceljs").then((mod) => {
      const lib = ((mod as unknown as { default?: ExcelJSModule }).default ?? mod) as ExcelJSModule;
      if (typeof window !== "undefined") window.ExcelJS = lib;
      return lib;
    });
  }
  return cached;
}
