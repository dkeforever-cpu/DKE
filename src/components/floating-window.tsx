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
  // The app's own 화면 배율 (screen scale, 80~200%) is applied as
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

  // 포인터가 빠르게 움직이면 브라우저는 화면 새로고침 빈도(보통 60Hz)보다
  // 훨씬 잦은 빈도로 pointermove를 쏠 수 있다(트랙패드·고폴링레이트 마우스
  // 등). 이 창은 화면 배율 상쇄를 위해 zoom CSS 속성을 쓰는데(위 주석
  // 참고), zoom은 transform과 달리 레이아웃을 다시 계산시키는 무거운
  // 속성이라, pointermove가 올 때마다 매번 setState → 리렌더 → zoom
  // 레이아웃 재계산을 반복하면 프레임을 못 따라가 눈에 띄게 끊겨 보인다.
  // 프레임당 최대 한 번만 실제로 반영되도록 requestAnimationFrame으로
  // 묶어서(coalesce), 같은 프레임 안에 여러 번 들어온 pointermove는
  // 마지막 값 하나로만 커밋한다.
  const pendingUpdateRef = useRef<(() => void) | null>(null);
  const rafRef = useRef<number | null>(null);
  function scheduleUpdate(fn: () => void) {
    pendingUpdateRef.current = fn;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      pendingUpdateRef.current?.();
      pendingUpdateRef.current = null;
    });
  }
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

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
    scheduleUpdate(() => {
      setPos({ x: nx, y: ny });
      setMaximized(false);
    });
  }

  // 마우스를 빠르게 움직이면 브라우저가 pointerup 대신 pointercancel을 보낼
  // 수 있다(포인터 캡처가 브라우저 내부적으로 끊기는 경우 — 트랙패드
  // 제스처로 재해석되거나, 다른 시스템 레벨 동작과 충돌할 때 등). 이 경우도
  // pointerup과 똑같이 처리하지 않으면 "드래그/리사이즈 중" 상태가 풀리지
  // 않은 채로 남아있을 수 있다.
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
    // 창을 화면 왼쪽/위 가장자리 밖으로 드래그해둔 상태(pos.x/y가
    // EDGE_MARGIN보다 작음, 심지어 음수)에서는 이 값이 실제 뷰포트보다
    // 커질 수 있는데, 그러면 JS가 허용하는 크기와 아래 style의
    // maxWidth/maxHeight(뷰포트 기준 고정값)가 서로 어긋나 리사이즈 도중
    // 계산과 실제 렌더링 크기가 따로 놀 수 있다 — 뷰포트 기준 상한과
    // 같이 min을 취해 항상 실제 렌더링 크기와 일치하게 한다.
    const maxW = Math.min(window.innerWidth - pos.x - EDGE_MARGIN, window.innerWidth - EDGE_MARGIN * 2);
    const maxH = Math.min(window.innerHeight - pos.y - EDGE_MARGIN, window.innerHeight - EDGE_MARGIN * 2);
    const w = Math.max(minWidth, Math.min(resizeState.current.origW + dx, maxW));
    const h = Math.max(minHeight, Math.min(resizeState.current.origH + dy, maxH));
    scheduleUpdate(() => {
      setSize({ width: w, height: h });
      setMaximized(false);
    });
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
            onPointerCancel={handleDragEnd}
            onDoubleClick={toggleMaximize}
            onDragStart={(e) => e.preventDefault()}
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
            onPointerCancel={handleResizeEnd}
            onDragStart={(e) => e.preventDefault()}
            title="크기 조절"
            className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize touch-none"
          >
            {/* SVG는 브라우저 기본값으로 마우스 드래그 시 네이티브 이미지
                드래그(고스트 이미지)가 시작될 수 있다 — 빠르게 움직일 때
                이 네이티브 드래그가 우리 포인터 리사이즈 로직과 충돌해서
                창이 갑자기 튀는 것처럼 보이는 원인일 수 있어, 위 부모 div의
                onDragStart(preventDefault)로 명시적으로 막는다(dragstart는
                이 svg에서 시작돼도 부모로 버블링되므로 거기서 막으면 된다). */}
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
