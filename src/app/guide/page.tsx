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
            좌측 로고를 누르면 대시보드로 바로 이동하고, 그 옆의 <b>자동/모바일/데스크탑</b> 버튼으로
            화면 형태를 직접 고를 수 있습니다. 우측 아이콘은 순서대로 새로고침(구글 시트 연동
            중일 때만 표시, 30초마다 자동으로도 최신 데이터를 받아옵니다), 다크·라이트 모드 전환,
            화면 설정(강조색·화면 배율)이고, 그 옆에 &lsquo;비밀번호 변경&rsquo;·&lsquo;로그아웃&rsquo;
            버튼이 있습니다.
          </Item>
          <Item title="좌측 메뉴">
            내 업무 / 전체 업무 / 캘린더 / 알림 / NEW / 프로그램 사용설명서 / 자료실과, 팀을 선택하면
            나타나는 게시판·카테고리 목록입니다. 메뉴 상단의 화살표 아이콘으로 접었다 펼 수 있고,
            업무 상세로 들어가도 그대로 유지됩니다.
          </Item>
        </Section>

        <Section title="알림">
          <Item title="언제 오나요">
            내가 담당자이거나 협업자로 지정된 업무의 필요 업무(체크리스트)나 업무 메모에 다른 사람이
            댓글을 남기면 알림이 옵니다. 본인이 자기 업무에 남긴 댓글로는 알림이 오지 않습니다.
          </Item>
          <Item title="확인하는 법">
            좌측 메뉴 &lsquo;알림&rsquo; 옆에 안 읽은 개수가 빨간 배지로 표시됩니다. 들어가면 누가
            어떤 댓글을 남겼는지, 어느 업무인지 목록으로 보이고, 클릭하면 해당 업무로 바로
            이동하면서 자동으로 읽음 처리됩니다. 항목 오른쪽의 &lsquo;읽음/안 읽음&rsquo; 버튼으로
            이동하지 않고도 상태만 직접 바꿀 수 있습니다.
          </Item>
        </Section>

        <Section title="NEW">
          <Item title="&lsquo;알림&rsquo;과의 차이">
            &lsquo;알림&rsquo;은 내가 담당자·협업자인 업무에만 오는 개인 알림이고, &lsquo;NEW&rsquo;는
            같은 팀에 새로 등록된 업무·필요 업무(체크리스트)·댓글·일정을 팀원 전체에게 알려주는
            메뉴입니다. 본인이 직접 등록·작성한 것은 스스로에게는 뜨지 않습니다.
          </Item>
          <Item title="확인하는 법">
            좌측 메뉴 &lsquo;NEW&rsquo; 옆에 아직 확인하지 않은 개수가 빨간 배지로 표시됩니다. 항목을
            클릭하면 해당 업무나 캘린더로 이동하고, 항목 오른쪽의 &lsquo;확인&rsquo; 버튼을 누르면
            그 항목이 내 NEW 목록에서만 사라집니다 — 같은 팀의 다른 사람 화면에서는 각자 확인하기
            전까지 계속 보입니다.
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
          <Item title="요약 건수로 빠르게 걸러보기">
            목록 위쪽의 &lsquo;진행중·검토중·완료·마감 연체&rsquo; 건수를 누르면 그 상태의 업무만
            걸러서 보여주고(상태 필터 드롭다운과 값이 함께 바뀝니다), 다시 누르면 해제됩니다.
          </Item>
        </Section>

        <Section title="업무 상세">
          <Item title="필요 업무(체크리스트)">
            하위 항목을 무제한으로 추가할 수 있고, 진행률은 5% 단위 슬라이더로 조절합니다. 항목별로
            기한을 따로 지정하고 댓글도 달 수 있습니다.
          </Item>
          <Item title="업무 메모">
            업무를 진행하며 있었던 일을 자유로운 텍스트로 시간순 기록합니다. 파일 첨부가 가능하며,
            본인이 작성한 메모는 언제든 수정·삭제할 수 있습니다(관리자는 전체 수정·삭제 가능).
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
          <Item title="일정 등록">
            업무와 별개로 날짜에만 기록해두고 싶은 일정은 우측 상단 &lsquo;일정 등록&rsquo;
            버튼으로 등록합니다. 시작일~종료일·제목·상세내용을 입력하면 그 기간 동안 캘린더에
            막대 형태로 표시되며, 클릭하면 상세내용과 작성자를 확인할 수 있습니다. 등록한
            본인 또는 관리자만 수정·삭제할 수 있습니다.
          </Item>
          <Item title="업무일정포함 / 등록일정만">
            상단의 토글 버튼으로 캘린더에 업무 시작일·마감일까지 함께 표시할지, 직접 등록한
            일정만 표시할지 전환할 수 있습니다.
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
          <Item title="테마">우측 상단 톱니바퀴 아이콘에서 메뉴 강조색, 다크/라이트 모드, 화면 배율(80~200%)을 조정합니다.</Item>
          <Item title="모바일/데스크탑">
            상단바의 3단 버튼으로 화면 너비에 따른 자동 전환 대신 원하는 화면을 고정해서 쓸 수
            있습니다. 휴대폰 기종에 따라 자동 감지가 어긋날 때 유용합니다.
          </Item>
        </Section>

        {currentUser.isAdmin && (
          <Section title="관리자 기능 (관리자 계정 전용)">
            <Item title="위치">
              좌측 메뉴 맨 아래의 &lsquo;관리자설정&rsquo; 탭을 누르면 하위 메뉴가 아래로
              펼쳐집니다(다시 누르면 접힙니다). 메인 메뉴는 그대로 남아있어 업무 목록·캘린더로
              바로 이동할 수 있습니다.
            </Item>
            <Item title="일반 설정">
              로그인 화면과 상단바에 표시되는 프로그램 이름(제목)을 바꿀 수 있고, 기본 아이콘 대신
              쓸 이미지(최대 30KB)를 등록하거나 다시 기본 아이콘으로 되돌릴 수 있습니다.
            </Item>
            <Item title="팀 관리">
              팀을 추가하거나 이름을 바꿀 수 있습니다. 소속 사용자나 업무가 남아있는 팀은 삭제할 수
              없습니다.
            </Item>
            <Item title="센터 관리">
              업무 등록 시 고르는 센터 목록을 관리합니다. 이름을 바꾸면 그 센터로 등록된 업무에도
              새 이름이 함께 반영되고, 업무가 남아있는 센터는 삭제할 수 없습니다.
            </Item>
            <Item title="카테고리 관리">
              팀별로 대분류·중분류를 추가·수정·삭제합니다. 각 분류 옆의 코드(예: A, 01)는 업무번호를
              만드는 데 쓰이며 새로 추가할 때 자동으로 배정됩니다. &lsquo;전체 펼치기/전체
              접기&rsquo;로 한 번에 펴고 접을 수 있습니다.
            </Item>
            <Item title="게시판/열 관리">
              팀별로 게시판(뷰)을 추가하고, 게시판마다 업무 목록에 노출할 열을 선택합니다. 필요하면
              텍스트·숫자·선택·날짜 타입의 커스텀 필드도 만들 수 있습니다.
            </Item>
            <Item title="사용자 권한 관리">
              이름만 입력하면 사용자가 추가되고, 로그인 아이디는 이름과 동일하게, 초기 비밀번호는
              blp00487로 자동 설정됩니다. 사용자별로 소속 팀·조회 가능한 팀·업무레벨·관리자 권한을
              바꿀 수 있고, 비밀번호를 잊어버린 사용자는 &lsquo;비밀번호 초기화&rsquo; 버튼으로
              초기 비밀번호(blp00487)로 되돌려 줄 수 있습니다. 업무·기록이 남아있는 사용자, 로그인
              중인 계정, 마지막 남은 관리자는 삭제할 수 없습니다.
            </Item>
            <Item title="데이터(DB) 구조">
              현재 저장된 데이터를 팀·사용자·업무 등 테이블별로 확인하고 JSON 파일로 내보낼 수
              있습니다.
            </Item>
            <Item title="백엔드 연동 (구글 시트)">
              구글 시트 웹 앱 URL·API 토큰을 등록해 팀 전체가 데이터를 실시간으로 공유하도록
              연동합니다. 연동 후에는 팀원이 API 토큰을 직접 입력하지 않아도 되는 &lsquo;초대
              링크&rsquo;를 만들어 전달할 수 있습니다.
            </Item>
            <Item title="기록">
              누가 언제 어떤 작업(등록·수정·삭제)을 했는지 시간순으로 볼 수 있습니다. 사용자별로
              걸러볼 수 있고, 행을 누르면 상세 내용을 확인할 수 있습니다.
            </Item>
          </Section>
        )}
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
