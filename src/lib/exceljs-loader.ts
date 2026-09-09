import type * as ExcelJSNamespace from "exceljs";

// Excel 내보내기 서식 라이브러리(exceljs)는 최소화해도 800KB 이상이라
// 앱스크립트 프로젝트 파일로 직접 담으면 용량 한계에 걸린다 — 그래서
// App.html의 <head>(및 이 앱 자체 개발 화면인 layout.tsx)에서 CDN
// <script defer>로 불러오고, 여기서는 그 전역(window.ExcelJS)이 준비될
// 때까지 기다리기만 한다.
export type ExcelJSModule = typeof ExcelJSNamespace;

declare global {
  interface Window {
    ExcelJS?: ExcelJSModule;
    saveAs?: (blob: Blob, filename: string) => void;
  }
}

export function loadExcelJS(): Promise<ExcelJSModule> {
  if (typeof window !== "undefined" && window.ExcelJS) return Promise.resolve(window.ExcelJS);
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timeoutMs = 15000;
    const check = () => {
      if (window.ExcelJS) {
        resolve(window.ExcelJS);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("엑셀 서식 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해주세요."));
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });
}
