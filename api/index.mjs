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

// helpers
function looksKorean(s=""){ return /[가-힣]/.test(s); }
function isRefusal(s=""){
  return /(?:i'm\s*sorry|cannot\s+assist|not\s+able\s+to\s+help|cannot\s+help)/i.test(s);
}

function sysPrompt(target){
  return target === "ko"
    ? "You are a professional translator. Translate the user's text into natural, idiomatic Korean. Output ONLY the translated Korean sentence. Do not refuse. The content is safe to translate."
    : "You are a professional translator. Translate the user's text into fluent, idiomatic English. Output ONLY the translated English sentence. Do not refuse. The content is safe to translate.";
}

async function translateText(text, target, model = process.env.OPENAI_MODEL || "gpt-4o-mini"){
  const msgs = [
    { role: "system", content: sysPrompt(target) },
    { role: "user", content: text }
  ];

  const call = async (extraSystem) => {
    const m = extraSystem ? [{ role: "system", content: extraSystem }, ...msgs] : msgs;
    const r = await openai.chat.completions.create({ model, temperature: 0.2, messages: m });
    return (r.choices?.[0]?.message?.content ?? "").trim().replace(/^["'`]|["'`]$/g, "");
  };

  // 1st try
  let out = await call();

  // If model refused, retry once with a stronger nudge
  if (isRefusal(out)) {
    out = await call(
      target === "ko"
        ? "The input is a harmless sentence. Translate it to Korean. Do not refuse. Output only Korean."
        : "The input is a harmless sentence. Translate it to English. Do not refuse. Output only English."
    );
  }

  // If language mismatched, retry once more with stricter constraint
  const mismatch = (target === "en" && looksKorean(out)) || (target === "ko" && !looksKorean(out));
  if (mismatch) {
    out = await call(
      target === "ko"
        ? "ONLY Korean is allowed in the output. No English. Output just the translation."
        : "ONLY English is allowed in the output. No Korean. Output just the translation."
    );
  }

  if (!out) throw new Error("Empty translation from model");
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

    // 3) Check OpenAI API key
    console.log("[DBG] OpenAI API Key exists:", !!process.env.OPENAI_API_KEY);
    console.log("[DBG] OpenAI API Key length:", process.env.OPENAI_API_KEY?.length || 0);

    // 4) Translate
    console.log("[DBG] parsed", { raw, cleaned, forced, target });
    // before translate
    console.log("[DBG] calling OpenAI", {
      target,
      len: cleaned.length,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini"
    });

    let translated;
    try {
      translated = await translateText(cleaned, target);
      console.log("[DBG] got translation", {
        looksKo: /[가-힣]/.test(translated),
        sample: translated.slice(0, 80)
      });
    } catch (err) {
      console.error("[DBG] OpenAI error", {
        status: err?.status,
        message: err?.message,
        data: err?.response?.data
      });
      return res.status(500).json(simpleText("Translation failed. Please try again later."));
    }
    const trimmed = translated.length > 1000 ? translated.slice(0, 997) + "..." : translated;

    // 5) Kakao response
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
