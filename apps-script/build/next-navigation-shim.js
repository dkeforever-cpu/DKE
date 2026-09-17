// Shim for `next/navigation`, used only when bundling the app as a single
// static HTML file (no real Next.js router at runtime). Client-side routes
// are tracked via window.location.hash instead.
import { useEffect, useState } from "react";

function getHashPath() {
  const h = window.location.hash.slice(1);
  return h || "/";
}

const listeners = new Set();
if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => listeners.forEach((fn) => fn()));
}

function useHashPath() {
  const [path, setPath] = useState(getHashPath());
  useEffect(() => {
    const fn = () => setPath(getHashPath());
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return path;
}

export function useRouter() {
  return {
    push(path) {
      window.location.hash = path;
    },
    replace(path) {
      window.location.hash = path;
    },
    back() {
      window.history.back();
    },
  };
}

export function useParams() {
  const path = useHashPath();
  const taskMatch = path.match(/^\/tasks\/([^/]+)/);
  if (taskMatch) return { id: decodeURIComponent(taskMatch[1]) };
  const resourceMatch = path.match(/^\/resources\/([^/]+)/);
  if (resourceMatch) return { id: decodeURIComponent(resourceMatch[1]) };
  return {};
}

export function usePathname() {
  return useHashPath();
}
