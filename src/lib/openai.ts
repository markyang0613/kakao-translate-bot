import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

export const openai = new OpenAI({ apiKey });

export async function translateText(
  text: string,
  target: "ko" | "en",
  model = process.env.OPENAI_MODEL || "gpt-4o-mini"
): Promise<string> {
  // 타겟 언어를 시스템 프롬프트로 강제
  const system =
    target === "ko"
      ? "You are a professional translator. Translate the user's text into natural, idiomatic Korean. Return ONLY the translation. Do not explain."
      : "You are a professional translator. Translate the user's text into fluent, idiomatic English. Return ONLY the translation. Do not explain.";

  const resp = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: text }
    ],
    temperature: 0.2
  });

  const out = resp.choices?.[0]?.message?.content?.trim() ?? "";
  if (!out) throw new Error("OpenAI returned empty translation");

  // 안전 클린업: 코드블록/따옴표 제거 성향 방지
  return out.replace(/^```[\s\S]*?```$/g, "").replace(/^["'`]|["'`]$/g, "").trim();
}
