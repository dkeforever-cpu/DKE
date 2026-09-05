"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";

const EDGE_MARGIN = 16; // px of the window that must always stay reachable on-screen
const HEADER_H = 40; // must match the header row's rendered height below

interface Size {
  width: number;
  height: number;
}

interface Pos {
  x: number;
  y: number;
}

// A draggable, resizable window used for modal-style dialogs (task form,
// theme settings) — content that used to be a fixed-size centered box could
// get its footer buttons pushed off-screen on short viewports or with the
// app's own zoom/scale feature applied. Letting people move and resize the
// window themselves sidesteps that instead of chasing every viewport case.
export function FloatingWindow({
  title,
  onClose,
  children,
  footer,
  defaultWidth = 520,
  defaultHeight = 640,
  minWidth = 340,
  minHeight = 260,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
}) {
  // The app's own 화면 배율 (screen scale, 80~130%) is applied as
  // `document.body.style.zoom`, which visually scales this window along
  // with everything else but leaves window.innerWidth/innerHeight (and
  // pointer clientX/clientY) unzoomed — every clamp and drag calculation
  // below assumes those are real on-screen pixels. Cancel the ancestor
  // zoom for this window's own subtree so it always renders and drags at
  // a true 1:1 scale regardless of the user's chosen 화면 배율.
  const { scale } = useTheme();
  const counterZoom = 100 / (scale || 100);

  const [size, setSize] = useState<Size>({ width: defaultWidth, height: defaultHeight });
  const [pos, setPos] = useState<Pos | null>(null);
  const [maximized, setMaximized] = useState(false);
  const savedGeometry = useRef<{ size: Size; pos: Pos } | null>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
  const sizeRef = useRef(size);
  const posRef = useRef(pos);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  useEffect(() => {
    const w = Math.min(defaultWidth, window.innerWidth - EDGE_MARGIN * 2);
    const h = Math.min(defaultHeight, window.innerHeight - EDGE_MARGIN * 2);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSize({ width: w, height: h });
    setPos({ x: (window.innerWidth - w) / 2, y: (window.innerHeight - h) / 2 });
    // Only center once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A size/position picked for the viewport at open time can leave the
  // footer buttons off-screen once the viewport later shrinks (browser
  // resize, split-screen, zoom). Re-clamp on every resize so the window
  // — and its footer — stays fully visible.
  useEffect(() => {
    function handleResize() {
      const prevPos = posRef.current;
      if (!prevPos) return;
      const w = Math.min(sizeRef.current.width, window.innerWidth - EDGE_MARGIN * 2);
      const h = Math.min(sizeRef.current.height, window.innerHeight - EDGE_MARGIN * 2);
      setSize({ width: w, height: h });
      setPos({
        x: Math.max(0, Math.min(prevPos.x, window.innerWidth - w)),
        y: Math.max(0, Math.min(prevPos.y, window.innerHeight - h)),
      });
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function toggleMaximize() {
    if (!pos) return;
    if (maximized) {
      const restored = savedGeometry.current;
      if (restored) {
        setSize(restored.size);
        setPos(restored.pos);
      }
      setMaximized(false);
      return;
    }
    savedGeometry.current = { size, pos };
    setSize({
      width: window.innerWidth - EDGE_MARGIN * 2,
      height: window.innerHeight - EDGE_MARGIN * 2,
    });
    setPos({ x: EDGE_MARGIN, y: EDGE_MARGIN });
    setMaximized(true);
  }

  function handleDragStart(e: React.PointerEvent) {
    if (!pos) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  }

  function handleDragMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const nx = Math.max(
      EDGE_MARGIN - size.width,
      Math.min(dragState.current.origX + dx, window.innerWidth - EDGE_MARGIN)
    );
    const ny = Math.max(0, Math.min(dragState.current.origY + dy, window.innerHeight - HEADER_H));
    setPos({ x: nx, y: ny });
    setMaximized(false);
  }

  function handleDragEnd() {
    dragState.current = null;
  }

  function handleResizeStart(e: React.PointerEvent) {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    resizeState.current = { startX: e.clientX, startY: e.clientY, origW: size.width, origH: size.height };
    e.stopPropagation();
  }

  function handleResizeMove(e: React.PointerEvent) {
    if (!resizeState.current || !pos) return;
    const dx = e.clientX - resizeState.current.startX;
    const dy = e.clientY - resizeState.current.startY;
    const maxW = window.innerWidth - pos.x - EDGE_MARGIN;
    const maxH = window.innerHeight - pos.y - EDGE_MARGIN;
    const w = Math.max(minWidth, Math.min(resizeState.current.origW + dx, maxW));
    const h = Math.max(minHeight, Math.min(resizeState.current.origH + dy, maxH));
    setSize({ width: w, height: h });
    setMaximized(false);
    e.stopPropagation();
  }

  function handleResizeEnd(e: React.PointerEvent) {
    resizeState.current = null;
    e.stopPropagation();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30" style={{ zoom: counterZoom }}>
      {pos && (
        <div
          className="fixed flex flex-col overflow-hidden border border-[var(--border-strong)] bg-[var(--surface)]"
          style={{
            left: pos.x,
            top: pos.y,
            width: size.width,
            height: size.height,
            maxWidth: `calc(100vw - ${EDGE_MARGIN * 2}px)`,
            maxHeight: `calc(100vh - ${EDGE_MARGIN * 2}px)`,
            boxShadow: "var(--shadow-menu)",
          }}
        >
          <div
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onDoubleClick={toggleMaximize}
            className="flex h-10 flex-none cursor-move select-none items-center justify-between border-b border-[var(--divider)] px-5 touch-none"
            title="드래그해서 이동 (더블클릭: 화면에 꽉 채우기)"
          >
            <div className="text-[13px] font-bold text-[var(--text)]">{title}</div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={toggleMaximize}
                onPointerDown={(e) => e.stopPropagation()}
                title={maximized ? "원래 크기로 복원" : "화면에 꽉 채우기"}
                className="text-[var(--text-faint)] hover:text-[var(--text)]"
              >
                {maximized ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
                  </svg>
                )}
              </button>
              <button
                onClick={onClose}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-[var(--text-faint)] hover:text-[var(--text)]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">{children}</div>

          {footer && (
            <div className="flex flex-none justify-end gap-1.5 border-t border-[var(--divider)] px-5 py-3">
              {footer}
            </div>
          )}

          <div
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            title="크기 조절"
            className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize touch-none"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              className="absolute bottom-0 right-0 text-[var(--text-disabled)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M21 15l-6 6M21 8l-13 13" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
