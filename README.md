# KakaoTalk Auto-Translation Bot (ChatGPT API)

## Features
- KREN auto translation using OpenAI Chat Completions (default: `gpt-4o-mini`)
- Force target: `/en <text>` or `/ko <text>`
- Kakao i Open Builder-compatible webhook

## Setup
1. `cp .env.example .env` and set `OPENAI_API_KEY`, `VERIFY_TOKEN`, optional `OPENAI_MODEL`, `PORT`.
2. `pnpm install`
3. Local dev: `pnpm dev` (use `ngrok http 3000` to expose public URL)

## Kakao i Open Builder Wiring
- Create a **Skill** of type "External server".
- Set POST URL: `https://<your-domain>/kakao/webhook`
- Add header in skill settings: `x-kakao-signature: <VERIFY_TOKEN>`
- In a simple block, connect user utterance to the external skill and map the response to message.

## Test Locally
```bash
curl -X POST http://localhost:3000/kakao/webhook \
 -H 'Content-Type: application/json' \
 -H 'x-kakao-signature: your-shared-secret' \
 -d '{
  "userRequest": { "utterance": "안녕하세요! 만나서 반가워요." }
 }'
```

## Deploy

Render/Railway/Fly.io: set env vars; run pnpm start.

Docker: docker build -t kakao-bot . && docker run -p 3000:3000 --env-file .env kakao-bot.

## Notes

Rate limits: add caching or queue if needed.

Privacy: do not log full user text in production unless necessary.
