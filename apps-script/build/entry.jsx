import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { DashboardStateProvider } from "@/lib/dashboard-state";
import { ConfirmDialogProvider } from "@/lib/confirm-dialog";
import LoginPage from "@/app/login/page";
import DashboardPage from "@/app/page";
import TaskDetailPage from "@/app/tasks/[id]/page";
import AdminPage from "@/app/admin/page";
import GuidePage from "@/app/guide/page";
import ResourcesPage from "@/app/resources/page";
import ResourceDetailPage from "@/app/resources/[id]/page";
import NotificationsPage from "@/app/notifications/page";
import NewPage from "@/app/new/page";

function getHashPath() {
  const h = window.location.hash.slice(1);
  return h || "/";
}

function Router() {
  const [path, setPath] = useState(getHashPath());
  useEffect(() => {
    const fn = () => setPath(getHashPath());
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);

  if (path === "/login") return <LoginPage />;
  if (path === "/admin") return <AdminPage />;
  if (path === "/guide") return <GuidePage />;
  if (path === "/notifications") return <NotificationsPage />;
  if (path === "/new") return <NewPage />;
  if (path.startsWith("/resources/")) return <ResourceDetailPage />;
  if (path === "/resources") return <ResourcesPage />;
  if (path.startsWith("/tasks/")) return <TaskDetailPage />;
  return <DashboardPage />;
}

createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <StoreProvider>
      <ConfirmDialogProvider>
        <DashboardStateProvider>
          <Router />
        </DashboardStateProvider>
      </ConfirmDialogProvider>
    </StoreProvider>
  </ThemeProvider>
);
