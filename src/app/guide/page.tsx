"use client";

import { ReactNode } from "react";
import { useRequireAuth } from "@/lib/use-require-auth";
import { AppShell } from "@/components/app-shell";

export default function GuidePage() {
  const { ready, currentUser } = useRequireAuth();
  if (!ready || !currentUser) return null;

  return (
    <AppShell>
      <div className="flex h-8 flex-none items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4">
        <span className="text-[10.5px] font-semibold text-[var(--text)]">프로그램 사용설명서</span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3">
        <Section title="기본 화면 구성">
          <Item title="상단바">
            좌측 로고 옆의 <b>자동/모바일/데스크탑</b> 버튼으로 화면 형태를 직접 고를 수 있습니다.
            우측 아이콘은 순서대로 대시보드 바로가기, 다크·라이트 모드 전환, 화면 설정(강조색·화면
            배율)입니다.
          </Item>
          <Item title="좌측 메뉴">
            내 업무 / 전체 업무 / 캘린더 / 프로그램 사용설명서 / 자료실과, 팀을 선택하면 나타나는
            게시판·카테고리 목록입니다. 메뉴 상단의 화살표 아이콘으로 접었다 펼 수 있고, 업무
            상세로 들어가도 그대로 유지됩니다.
          </Item>
        </Section>

        <Section title="업무 목록·등록">
          <Item title="팀 전환">상단의 전체/관리팀/재경팀 탭으로 팀별 업무를 구분해서 볼 수 있습니다.</Item>
          <Item title="필터·검색">
            센터·담당자·상태·우선순위로 좁혀볼 수 있고, 검색창은 업무명뿐 아니라 설명·카테고리·담당자·센터까지
            함께 찾아줍니다.
          </Item>
          <Item title="새 업무 등록">
            우측 상단 &lsquo;새 업무&rsquo; 버튼으로 등록합니다. 담당 팀·분류·담당자·목표일·우선순위와
            함께, 캘린더에 표시될 색상을 직접 고르거나 자동 배정에 맡길 수 있습니다.
          </Item>
        </Section>

        <Section title="업무 상세">
          <Item title="필요 업무(체크리스트)">
            하위 항목을 무제한으로 추가할 수 있고, 진행률은 5% 단위 슬라이더로 조절합니다. 항목별로
            기한을 따로 지정하고 댓글도 달 수 있습니다.
          </Item>
          <Item title="진행 일지">
            업무를 진행하며 있었던 일을 시간순으로 기록합니다. 파일 첨부와 댓글이 가능하며, 본인이
            작성한 일지·댓글은 언제든 수정·삭제할 수 있습니다(관리자는 전체 수정·삭제 가능).
          </Item>
          <Item title="수정·삭제">
            담당자·협업자·등록자 또는 관리자만 업무를 수정·삭제할 수 있습니다.
          </Item>
        </Section>

        <Section title="캘린더">
          <Item title="보는 법">
            좌측 메뉴의 &lsquo;캘린더&rsquo;를 누르면 업무 목록 대신 월간 캘린더가 표시됩니다.
          </Item>
          <Item title="표시 방식">
            업무를 <b>등록한 날</b>에는 제목이 담긴 색상 칩이, <b>마감일</b>에는 같은 색의
            &lsquo;■마감&rsquo; 표기가 나타납니다. 완료 처리된 업무는 캘린더에서 자동으로
            사라집니다.
          </Item>
        </Section>

        <Section title="자료실">
          <Item title="용도">
            업무 매뉴얼, 양식, 안내자료처럼 직접 만든 문서를 올리고 팀원들과 공유하는 공간입니다.
          </Item>
          <Item title="이용 방법">
            &lsquo;자료 업로드&rsquo;로 제목·분류·설명과 파일을 등록하면 목록에 바로 나타나고,
            분류 탭으로 필터링할 수 있습니다. 올린 사람 본인 또는 관리자만 삭제할 수 있습니다.
          </Item>
        </Section>

        <Section title="화면 설정">
          <Item title="테마">우측 상단 톱니바퀴 아이콘에서 메뉴 강조색, 다크/라이트 모드, 화면 배율(80~130%)을 조정합니다.</Item>
          <Item title="모바일/데스크탑">
            상단바의 3단 버튼으로 화면 너비에 따른 자동 전환 대신 원하는 화면을 고정해서 쓸 수
            있습니다. 휴대폰 기종에 따라 자동 감지가 어긋날 때 유용합니다.
          </Item>
        </Section>

        <Section title="관리자 기능 (관리자 계정만 표시)">
          <Item title="위치">우측 상단 사다리꼴 아이콘(관리자 설정)에서 들어갑니다.</Item>
          <Item title="구성">
            팀 관리, 카테고리 관리(대/중/소분류), 게시판/열 관리(게시판별 노출 열·커스텀 필드),
            사용자 권한 관리(소속 팀·조회 권한·업무레벨·관리자 여부), 데이터(DB) 구조(현재 저장된
            데이터를 테이블별로 확인하고 JSON으로 내보내기) 다섯 개 탭으로 구성되어 있습니다.
          </Item>
        </Section>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 border border-[var(--border)] bg-[var(--surface)] p-3.5">
      <div className="text-[12.5px] font-bold text-[var(--text)]">{title}</div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Item({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[11px] font-semibold text-[var(--text-secondary)]">{title}</div>
      <div className="text-[11px] leading-relaxed text-[var(--text-muted)]">{children}</div>
    </div>
  );
}
