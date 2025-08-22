# KakaoTalk Translate Bot - Deployment Guide

## Prerequisites

1. **Node.js and npm** (if deploying locally)
2. **Git** for version control
3. **Environment variables** set up

## Environment Variables Required

Create a `.env` file in the root directory with:

```env
# KakaoTalk Bot Configuration
VERIFY_TOKEN=your_verify_token_here

# OpenAI Configuration (for translation)
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3000
```

## Deployment Options

### Option 1: Vercel (Recommended - Easiest)

1. **Install Vercel CLI** (if you have Node.js):
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel
   ```

3. **Set environment variables in Vercel dashboard**:
   - Go to your project settings
   - Add environment variables: `VERIFY_TOKEN`, `OPENAI_API_KEY`

4. **Get your webhook URL**:
   - Your webhook URL will be: `https://your-project.vercel.app/kakao/webhook`

### Option 2: Railway

1. **Connect your GitHub repo to Railway**
2. **Set environment variables in Railway dashboard**
3. **Deploy automatically**

### Option 3: Heroku

1. **Install Heroku CLI**
2. **Create Heroku app**:
   ```bash
   heroku create your-app-name
   ```

3. **Set environment variables**:
   ```bash
   heroku config:set VERIFY_TOKEN=your_token
   heroku config:set OPENAI_API_KEY=your_key
   ```

4. **Deploy**:
   ```bash
   git push heroku main
   ```

## Testing Your Webhook

1. **Set webhook URL in KakaoTalk Open Builder**:
   - URL: `https://your-deployed-url.com/kakao/webhook`
   - Method: POST

2. **Test with curl**:
   ```bash
   curl -X POST https://your-deployed-url.com/kakao/webhook \
     -H "Content-Type: application/json" \
     -H "x-kakao-signature: your_verify_token" \
     -d '{
       "userRequest": {
         "utterance": "Hello"
       }
     }'
   ```

3. **Test in KakaoTalk**:
   - Send a message to your bot
   - Try: "Hello", "안녕하세요", "/help"

## Troubleshooting

- **401 Unauthorized**: Check your `VERIFY_TOKEN` matches KakaoTalk settings
- **500 Error**: Check your `OPENAI_API_KEY` is valid
- **Webhook not receiving**: Ensure your URL is publicly accessible
