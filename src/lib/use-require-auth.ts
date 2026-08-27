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

export function useRequireAdmin() {
  const { currentUser, ready } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) {
      router.replace("/login");
    } else if (!currentUser.isAdmin) {
      router.replace("/");
    }
  }, [ready, currentUser, router]);

  return { currentUser, ready };
}
