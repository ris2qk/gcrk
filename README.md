# Financial Education Platform — Prototype

A working, AI-powered proof of concept: a South African financial-education app with a live AI coach, POPIA consent flow, a lead-scoring engine, and an operator dashboard. Built to be deployed to a live URL you can send to one person.

The AI runs through a small serverless function (`/api/claude`) that holds your API key. The key stays on the server and is never exposed in the browser.

---

## Host it on Vercel (recommended)

You need a free Vercel account and an Anthropic API key (from https://console.anthropic.com).

### Option A — GitHub import (no command line)

1. Put this folder in a new GitHub repository (drag the files into a new repo on github.com, or push it).
2. Go to https://vercel.com, click **Add New → Project**, and import that repository.
3. Vercel auto-detects Vite. Leave the build settings as-is.
4. Before deploying, open **Environment Variables** and add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your key
5. Click **Deploy**. You get a live URL in about a minute. That's the link to send.

### Option B — Command line

```bash
npm install
npm i -g vercel          # if you don't have it
vercel                   # follow the prompts to create the project
vercel env add ANTHROPIC_API_KEY   # paste your key when asked
vercel --prod            # deploy and get the live URL
```

---

## Run it locally first (optional)

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
npm run dev
```

Note: `npm run dev` serves the front end but not the `/api/claude` function. To test the AI locally, use `vercel dev` instead of `npm run dev`.

---

## Notes

- The model is set to `claude-sonnet-4-6` in `api/claude.js`. Change that one line if you want a different model.
- Put a low monthly spend cap on the API key in the Anthropic console; this is a demo.
- The brand is intentionally left blank. Drop a name, logo, and colors in when ready.
- The seed leads in the operator view are illustrative. Anything generated live in the app appears there marked LIVE.
