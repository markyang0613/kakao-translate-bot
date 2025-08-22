import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json({ limit: "1mb" }));

// --- Utils: Kakao response helper ---
function simpleText(text) {
  return {
    version: "2.0",
    template: { outputs: [{ simpleText: { text } }] }
  };
}

// --- Lang utils ---
const EN_CMD = /^\/en([\s\S]*)$/i; // "/en...", "/en   ...", "/en\n..."
const KO_CMD = /^\/ko([\s\S]*)$/i;

function parseForcedTarget(text) {
  const s = (text ?? "").trim();
  const mEn = s.match(EN_CMD);
  if (mEn) return { cleaned: (mEn[1] ?? "").trim(), forced: "en" };
  const mKo = s.match(KO_CMD);
  if (mKo) return { cleaned: (mKo[1] ?? "").trim(), forced: "ko" };
  if (/^\/help$/i.test(s)) return { cleaned: "/help" };
  return { cleaned: s };
}

function containsHangul(t) {
  return /[가-힣]/.test(t || "");
}
function inferTarget(t) {
  return containsHangul(t) ? "en" : "ko";
}

// --- OpenAI ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Missing OPENAI_API_KEY");
}

function sysPrompt(target) {
  return target === "ko"
    ? "Translate the user's text into natural Korean. Output ONLY the translated Korean sentence. No quotes, no code blocks, no extra words."
    : "Translate the user's text into fluent English. Output ONLY the translated English sentence. No quotes, no code blocks, no extra words.";
}

function clean(s = "") {
  return s.replace(/^```[\s\S]*?```$/g, "")
          .replace(/^["'`]|["'`]$/g, "")
          .trim();
}

async function translateText(text, target, model = process.env.OPENAI_MODEL || "gpt-4o-mini") {
  async function callOnce(extraSystem) {
    const msgs = [{ role: "system", content: sysPrompt(target) }];
    if (extraSystem) msgs.push({ role: "system", content: extraSystem });
    msgs.push({ role: "user", content: text });

    const r = await openai.chat.completions.create({ model, temperature: 0.2, messages: msgs });
    return clean(r.choices?.[0]?.message?.content ?? "");
  }

  let out = await callOnce();

  // target 강제 검증: 영어 타겟인데 한글이면, 또는 한국어 타겟인데 한글이 전혀 없으면 재시도
  const looksKo = containsHangul(out);
  const mismatch = (target === "en" && looksKo) || (target === "ko" && !looksKo);
  if (mismatch) {
    const stricter = target === "ko"
      ? "ONLY Korean. Do not include any English. Output just the translation."
      : "ONLY English. Do not include any Korean. Output just the translation.";
    const retry = await callOnce(stricter);
    if (retry) out = retry;
  }

  return out;
}

// --- Root endpoint ---
app.get("/", (_req, res) => {
  res.json({
    message: "KakaoTalk Translate Bot is running!",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
    hasVerifyToken: !!process.env.VERIFY_TOKEN,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    endpoints: {
      health: "/kakao/health",
      webhook: "/kakao/webhook"
    }
  });
});

// --- Health ---
app.get("/kakao/health", (_req, res) => res.status(200).send("ok"));

// --- Webhook ---
app.post("/kakao/webhook", async (req, res) => {
  try {
    // 1) Verify header
    const verify = req.header("x-kakao-signature");
    if (!verify || verify !== process.env.VERIFY_TOKEN) {
      return res.status(401).json(simpleText("Unauthorized."));
    }

    // 2) Parse payload
    const raw = req.body?.userRequest?.utterance ?? "";
    console.log("[DBG] raw:", JSON.stringify(raw));
    const { cleaned, forced } = parseForcedTarget(raw);
    const target = forced ?? inferTarget(cleaned);
    console.log("[DBG] parsed:", { cleaned, forced, target });

    if (cleaned === "/help") {
      const help =
        "KakaoTalk Auto-Translator\n" +
        "- Auto KR⇄EN based on message language.\n" +
        "- Force target: `/en <text>` or `/ko <text>`\n" +
        "- Example: `/en 안녕하세요` -> Hello";
      return res.json(simpleText(help));
    }

    if (!cleaned) {
      return res.json(simpleText("텍스트를 보내주세요. 예) /ko hello  또는  /en 안녕하세요"));
    }

    // 3) Translate
    const translated = await translateText(cleaned, target);
    const trimmed = translated.length > 1000 ? translated.slice(0, 997) + "..." : translated;

    // 4) Kakao response
    return res.json(simpleText(trimmed));
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json(simpleText("Translation failed. Try again."));
  }
});

// --- Catch-all route ---
app.use("*", (req, res) => {
  console.log("404 for path:", req.path);
  res.status(404).json({ 
    error: "Not found", 
    path: req.path,
    availableEndpoints: ["/", "/kakao/health", "/kakao/webhook"]
  });
});

// Vercel serverless export
export default app;
