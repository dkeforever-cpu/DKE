import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "물류센터 업무관리 시스템",
  description: "관리팀·재경팀 업무관리 시스템",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f5f6f8] text-[#1a1d24]">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
