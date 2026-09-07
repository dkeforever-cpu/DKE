import { Fragment, ReactNode } from "react";

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
const TRAILING_PUNCT_RE = /[)\]}.,;:!?'"]+$/;

// 댓글·업무 메모·업무 설명 등 사용자가 직접 입력하는 텍스트 안에 있는
// http(s) 링크를 실제로 클릭 가능한 <a>로 바꿔준다. 문장 끝에 붙은 마침표·
// 쉼표·닫는 괄호 등은 링크가 아니라 원래 텍스트로 남기고, 새 탭에서 연다.
export function linkify(text: string): ReactNode {
  if (!text) return text;
  const parts = text.split(URL_RE);
  if (parts.length <= 1) return text;

  return parts.map((part, i) => {
    if (i % 2 === 0) return part ? <Fragment key={i}>{part}</Fragment> : null;

    const trailingMatch = part.match(TRAILING_PUNCT_RE);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const url = trailing ? part.slice(0, -trailing.length) : part;
    if (!url) return <Fragment key={i}>{part}</Fragment>;

    return (
      <Fragment key={i}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent)", textDecoration: "underline", wordBreak: "break-all" }}
        >
          {url}
        </a>
        {trailing}
      </Fragment>
    );
  });
}
