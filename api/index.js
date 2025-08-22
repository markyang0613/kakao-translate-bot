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
    
    if (utter === "/help") {
      const help = "KakaoTalk Auto-Translator\n- Auto KR⇄EN based on message language.\n- Force target: `/en <text>` or `/ko <text>`\n- Example: `/en 안녕하세요` → Hello";
      return res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: help } }]
        }
      });
    }

    if (!utter) {
      return res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: "Please send some text to translate." } }]
        }
      });
    }

    // Simple translation logic (placeholder)
    let translated = utter;
    if (utter.includes('/en ')) {
      translated = utter.replace('/en ', '') + ' (translated to English)';
    } else if (utter.includes('/ko ')) {
      translated = utter.replace('/ko ', '') + ' (translated to Korean)';
    } else {
      // Simple language detection
      const hasKorean = /[가-힣]/.test(utter);
      translated = hasKorean ? `${utter} (translated to English)` : `${utter} (translated to Korean)`;
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
        outputs: [{ simpleText: { text: "Translation failed. Please try again." } }]
      }
    });
  }
});

// Catch-all for other routes
app.use('*', (req, res) => {
  console.log('404 for path:', req.path);
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Export for Vercel
export default app;
