// Simple test server for Vercel
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Vercel!', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

app.get('/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint working',
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    hasVerifyToken: !!process.env.VERIFY_TOKEN,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
});

module.exports = app;
