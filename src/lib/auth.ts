// "blp00487"의 SHA-256 해시 — 신규 사용자 기본 비밀번호. 사용자는 로그인 후
// 직접 비밀번호를 바꿀 수 있다.
export const DEFAULT_PASSWORD_HASH =
  "64509e10f96da60ea4d78388184d66f155a7ca5edd223644fb8796b2c60d3eff";

// 클라이언트에서만 동작하는 프로토타입이라 진짜 보안은 아니지만, 최소한 비밀번호를
// 평문 그대로 저장·비교하지 않도록 SHA-256 해시로 다룬다.
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
