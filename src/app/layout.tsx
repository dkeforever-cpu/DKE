import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { DashboardStateProvider } from "@/lib/dashboard-state";
import { ConfirmDialogProvider } from "@/lib/confirm-dialog";

export const metadata: Metadata = {
  title: "물류센터 업무관리 시스템",
  description: "관리팀·재경팀 업무관리 시스템",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* Excel 내보내기 전용 — 관리자설정에서 실제로 쓸 때만 CDN에서 받아오도록
            <script defer>로 걸어둔다(페이지 로드를 막지 않음). 용량이 커서(exceljs
            800KB+) 앱스크립트 프로젝트 파일로 직접 담으면 저장 용량 한계에
            걸리기 때문에 CDN 로딩 방식을 쓴다. */}
        <script defer src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js" />
        <script defer src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js" />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)]">
        <ThemeProvider>
          <StoreProvider>
            <ConfirmDialogProvider>
              <DashboardStateProvider>{children}</DashboardStateProvider>
            </ConfirmDialogProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
