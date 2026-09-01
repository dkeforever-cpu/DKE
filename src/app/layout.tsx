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
