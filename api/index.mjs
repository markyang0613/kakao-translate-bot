// Vercel API route for KakaoTalk bot - ES Module version
import express from 'express';

// Create Express app
const app = express();

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
    
    // Simple translation logic (placeholder - replace with actual OpenAI call)
    let translated = cleaned;
    if (target === "en") {
      // Simple Korean to English mapping
      const koreanToEnglish = {
        "안녕하세요": "Hello",
        "안녕": "Hi",
        "감사합니다": "Thank you",
        "고마워요": "Thanks"
      };
      translated = koreanToEnglish[cleaned] || `${cleaned} (translated to English)`;
    } else if (target === "ko") {
      // Simple English to Korean mapping
      const englishToKorean = {
        "hello": "안녕하세요",
        "hi": "안녕",
        "thank you": "감사합니다",
        "thanks": "고마워요"
      };
      translated = englishToKorean[cleaned.toLowerCase()] || `${cleaned} (translated to Korean)`;
    }

    console.log('Sending response:', translated);
    return res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: translated } }]
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
