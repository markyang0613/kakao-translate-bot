// Vercel API route for KakaoTalk bot - ES Module version
import express from 'express';
import OpenAI from 'openai';

// Create Express app
const app = express();

// Validate OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY environment variable");
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

// Initialize OpenAI
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Middleware
app.use(express.json({ limit: "1mb" }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Health check - Simple and robust
app.get('/health', (req, res) => {
  try {
    console.log('Health check requested');
    res.status(200).send('ok');
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  try {
    console.log('Root endpoint requested');
    res.json({ 
      message: 'KakaoTalk Translate Bot is running!',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      hasVerifyToken: !!process.env.VERIFY_TOKEN,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY
    });
  } catch (error) {
    console.error('Root endpoint error:', error);
    res.status(500).json({ error: 'Root endpoint failed' });
  }
});

// KakaoTalk webhook endpoint
app.post('/kakao/webhook', async (req, res) => {
  try {
    console.log('Webhook request received');
    
    const verify = req.header("x-kakao-signature");
    if (!verify || verify !== process.env.VERIFY_TOKEN) {
      console.log('Unauthorized webhook request');
      return res.status(401).json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: "Unauthorized." } }]
        }
      });
    }

    const utter = req.body?.userRequest?.utterance || "";
    console.log('Received utterance:', utter);
    
    // Parse forced target and clean text
    const { cleaned, forced } = parseForcedTarget(utter);
    
    if (cleaned === "/help") {
      const help = "KakaoTalk Auto-Translator\n- Auto KR⇄EN based on message language.\n- Force target: `/en <text>` or `/ko <text>`\n- Example: `/en 안녕하세요` -> Hello";
      return res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: help } }]
        }
      });
    }

    if (!cleaned) {
      return res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: "Please send text to translate. (/en or /ko + sentence)" } }]
        }
      });
    }

    // Determine target language
    const target = forced ?? inferTarget(cleaned);
    console.log('Target language:', target, 'Text:', cleaned);
    
    // Use actual OpenAI API for translation
    let translated;
    try {
      const system = target === "ko"
        ? "You are a professional translator. Translate the user's text into natural, idiomatic Korean. Return ONLY the translation. Do not explain."
        : "You are a professional translator. Translate the user's text into fluent, idiomatic English. Return ONLY the translation. Do not explain.";

      console.log('Calling OpenAI API with:', { model: process.env.OPENAI_MODEL || "gpt-4o-mini", target, text: cleaned });

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: cleaned }
        ],
        temperature: 0.2
      });

      translated = response.choices?.[0]?.message?.content?.trim() ?? "";
      if (!translated) {
        throw new Error("OpenAI returned empty translation");
      }

      // Clean up output
      translated = translated.replace(/^```[\s\S]*?```$/g, "").replace(/^["'`]|["'`]$/g, "").trim();
      console.log('OpenAI translation successful:', translated);
      
    } catch (openaiError) {
      console.error('OpenAI API error details:', {
        message: openaiError.message,
        status: openaiError.status,
        code: openaiError.code,
        type: openaiError.type
      });
      
      // Fallback to simple translation if OpenAI fails
      if (target === "en") {
        const koreanToEnglish = {
          "안녕하세요": "Hello",
          "안녕": "Hi",
          "감사합니다": "Thank you",
          "고마워요": "Thanks",
          "좋아요": "Good",
          "나쁘지 않아요": "Not bad"
        };
        translated = koreanToEnglish[cleaned] || `${cleaned} (translated to English)`;
      } else if (target === "ko") {
        const englishToKorean = {
          "hello": "안녕하세요",
          "hi": "안녕",
          "thank you": "감사합니다",
          "thanks": "고마워요",
          "good": "좋아요",
          "not bad": "나쁘지 않아요"
        };
        translated = englishToKorean[cleaned.toLowerCase()] || `${cleaned} (translated to Korean)`;
      }
      console.log('Using fallback translation:', translated);
    }

    // Truncate if too long
    const trimmed = translated.length > 1000 ? translated.slice(0, 997) + "..." : translated;

    console.log('Sending response:', trimmed);
    return res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: trimmed } }]
      }
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "Translation failed. Try again." } }]
      }
    });
  }
});

// Helper functions for parsing and language detection
function parseForcedTarget(text) {
  const trimmed = text.trim();
  if (trimmed.toLowerCase().startsWith("/en ")) {
    return { cleaned: trimmed.slice(4).trim(), forced: "en" };
  }
  if (trimmed.toLowerCase().startsWith("/ko ")) {
    return { cleaned: trimmed.slice(4).trim(), forced: "ko" };
  }
  if (trimmed.toLowerCase() === "/en" || trimmed.toLowerCase() === "/ko") {
    return { cleaned: "", forced: trimmed.toLowerCase() === "/en" ? "en" : "ko" };
  }
  if (trimmed.toLowerCase() === "/help") {
    return { cleaned: "/help" };
  }
  return { cleaned: trimmed };
}

function containsHangul(text) {
  return /[가-힣]/.test(text);
}

function inferTarget(text) {
  return containsHangul(text) ? "en" : "ko";
}

// Catch-all for other routes
app.use('*', (req, res) => {
  console.log('404 for path:', req.path);
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Export for Vercel
export default app;
