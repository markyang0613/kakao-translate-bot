// Simple KR/EN detector and routing.
export type TargetLang = "ko" | "en";

export function parseForcedTarget(text: string): { cleaned: string; forced?: TargetLang } {
  const trimmed = text.trim();
  if (trimmed.toLowerCase().startsWith("/en ")) {
    return { cleaned: trimmed.slice(4).trim(), forced: "en" };
  }
  if (trimmed.toLowerCase().startsWith("/ko ")) {
    return { cleaned: trimmed.slice(4).trim(), forced: "ko" };
  }
  if (trimmed.toLowerCase() === "/en" || trimmed.toLowerCase() === "/ko") {
    // 명령어만 보낸 경우: 내용 없음 처리
    return { cleaned: "", forced: trimmed.toLowerCase() === "/en" ? "en" : "ko" };
  }
  if (trimmed.toLowerCase() === "/help") {
    return { cleaned: "/help" };
  }
  return { cleaned: trimmed };
}

export function containsHangul(text: string): boolean {
  return /[가-힣]/.test(text);
}

export function inferTarget(text: string): TargetLang {
  return containsHangul(text) ? "en" : "ko";
}
