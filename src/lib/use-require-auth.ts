"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "./store";

export function useRequireAuth() {
  const { currentUser, ready } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && !currentUser) {
      router.replace("/login");
    }
  }, [ready, currentUser, router]);

  return { currentUser, ready };
}
