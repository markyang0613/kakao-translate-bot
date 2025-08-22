import { Router, Request, Response } from "express";
import { KakaoRequestSchema, simpleText } from "../types/kakao.js";
import { parseForcedTarget, inferTarget } from "../lib/lang.js";
import { translateText } from "../lib/openai.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.post("/webhook", async (req: Request, res: Response) => {
  try {
    // Shared-secret header 검증
    const verify = req.header("x-kakao-signature");
    if (!verify || verify !== process.env.VERIFY_TOKEN) {
      return res.status(401).json(simpleText("Unauthorized."));
    }

    const parsed = KakaoRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn({ issues: parsed.error.issues }, "Invalid Kakao payload");
      return res.status(400).json(simpleText("Invalid request."));
    }

    const utter = parsed.data.userRequest.utterance || "";
    const { cleaned, forced } = parseForcedTarget(utter);

    if (cleaned === "/help") {
      const help =
        "KakaoTalk Auto-Translator\n" +
        "- Auto KR⇄EN based on message language.\n" +
        "- Force target: `/en <text>` or `/ko <text>`\n" +
        "- Example: `/en 안녕하세요` -> Hello";
      return res.json(simpleText(help));
    }

    if (!cleaned) {
      return res.json(simpleText("Please send text to translate. (/en or /ko + sentence)"));
    }

    const target = forced ?? inferTarget(cleaned);
    const translated = await translateText(cleaned, target);
    const trimmed = translated.length > 1000 ? translated.slice(0, 997) + "..." : translated;

    return res.json(simpleText(trimmed));
  } catch (err: any) {
    logger.error({ err }, "Handler error");
    return res.status(500).json(simpleText("Translation failed. Try again."));
  }
});

export default router;

