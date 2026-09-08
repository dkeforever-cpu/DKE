"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAdmin } from "@/lib/use-require-auth";
import { useDashboardState } from "@/lib/dashboard-state";

// 관리자 설정은 더 이상 별도 화면이 아니라, 대시보드 사이드바 하단의
// "관리자설정" 아코디언에서 바로 전환된다 — 이 라우트는 예전 /admin
// 주소로 남아있을 수 있는 북마크·링크를 위한 리다이렉트만 담당한다.
export default function AdminRedirectPage() {
  const { ready, currentUser } = useRequireAdmin();
  const { setView } = useDashboardState();
  const router = useRouter();

  useEffect(() => {
    if (ready && currentUser?.isAdmin) {
      setView("admin");
      router.replace("/");
    }
  }, [ready, currentUser, setView, router]);

  return null;
}
