// Simple test script for KakaoTalk webhook
// Run this after deployment to test your webhook

const testWebhook = async (webhookUrl, verifyToken) => {
  const testCases = [
    {
      name: "Help command",
      data: {
        userRequest: {
          utterance: "/help"
        }
      }
    },
    {
      name: "English text",
      data: {
        userRequest: {
          utterance: "Hello world"
        }
      }
    },
    {
      name: "Korean text",
      data: {
        userRequest: {
          utterance: "안녕하세요"
        }
      }
    },
    {
      name: "Forced English translation",
      data: {
        userRequest: {
          utterance: "/en 안녕하세요"
        }
      }
    }
  ];

  console.log(`Testing webhook at: ${webhookUrl}`);
  console.log("=" .repeat(50));

  for (const testCase of testCases) {
    try {
      console.log(`\nTesting: ${testCase.name}`);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-kakao-signature': verifyToken
        },
        body: JSON.stringify(testCase.data)
      });

      const result = await response.json();
      
      console.log(`Status: ${response.status}`);
      console.log(`Response:`, JSON.stringify(result, null, 2));
      
    } catch (error) {
      console.error(`Error testing ${testCase.name}:`, error.message);
    }
  }
};

// Usage instructions
console.log(`
KakaoTalk Webhook Test Script
=============================

To use this script:

1. Install Node.js if you haven't already
2. Run: node test-webhook.js

Or modify the script below with your actual webhook URL and verify token:

const WEBHOOK_URL = "https://your-deployed-url.com/kakao/webhook";
const VERIFY_TOKEN = "your_verify_token";

testWebhook(WEBHOOK_URL, VERIFY_TOKEN);
`);

// Uncomment and modify these lines with your actual values:
// const WEBHOOK_URL = "https://your-deployed-url.com/kakao/webhook";
// const VERIFY_TOKEN = "your_verify_token";
// testWebhook(WEBHOOK_URL, VERIFY_TOKEN);
