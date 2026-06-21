# Axiom Cloud

Think. Research. Build. Deploy.

Axiom Cloud is an AI-native platform that researches ideas, teaches you what you don't know, builds a real working project, and lets you pitch it to an AI Board Room — all inside one workspace.

This README covers everything you need to run, configure, and deploy it. Read it top to bottom once before you touch anything.

---

## 1. What you need before starting

The app is designed to **start and stay running even if some of these are missing**. Pages that need a missing credential show a friendly "not configured yet" message instead of crashing. That said, here's the full list for a fully working setup:

| # | What | Where to get it | Required? |
|---|------|------------------|------------|
| 1 | 0G API Key | Supplied to you separately — see section 3 | For AI features |
| 2 | MongoDB Atlas URI | https://cloud.mongodb.com → free M0 cluster | For login & saved data |
| 3 | Google OAuth Client ID + Secret | https://console.cloud.google.com | Optional (enables "Sign in with Google") |
| 4 | Gmail App Password | Gmail → Security → App Passwords | Optional (enables email verification) |
| 5 | Session Secret | Any random 64-character string | Recommended |

Detailed steps for each one are written directly inside `.env.example` — open that file and follow the comments above each variable.

---

## 2. Setup steps (do these in order)

### Step 1 — Install Node.js
If you don't have it: https://nodejs.org (download the LTS version)

### Step 2 — Extract this ZIP
Unzip it anywhere on your computer. You'll get a folder called `axiom-cloud`.

### Step 3 — Install dependencies
Open a terminal inside the `axiom-cloud` folder and run:

```
npm install
```

### Step 4 — Create your .env file
1. Find the file called `.env.example` inside the `axiom-cloud` folder
2. Make a **copy** of it
3. Rename the copy to exactly: `.env`
4. Open `.env` and fill in the values you have. Leave the rest blank for now — nothing will crash.

### Step 5 — Add your logo and favicon
Go to `public/images/` and read `ASSET_GUIDE.txt` inside that folder — it tells you exactly which filenames to use and what size each image should be. A default favicon is already included, so the browser tab never shows a broken icon even before you add your own.

### Step 6 — Start the server
```
npm start
```

You should see something like:
```
✅ MongoDB connected: ...
🚀 Axiom Cloud running at http://localhost:3000
```

If MongoDB or AI credentials are missing, you'll instead see clear warnings in the terminal — the app still starts.

### Step 7 — Open it in your browser
Go to: **http://localhost:3000**

---

## 3. AI Provider — read this section carefully

Axiom Cloud's entire AI layer is **provider-agnostic**. No page, route, or controller talks to an AI provider directly — every single AI feature (Research Studio, AI Tutor, Builder, Board Room, Database Studio, Marketplace agents) calls through one central file:

```
services/aiService.js          ← the ONLY file allowed to be called by routes
services/providers/
  ├── zgProvider.js              ← 0G Compute (ACTIVE BY DEFAULT)
  ├── geminiProvider.js          ← ready, just add GEMINI_API_KEY and set AI_PROVIDER=gemini
  ├── openaiProvider.js          ← ready, just add OPENAI_API_KEY and set AI_PROVIDER=openai
  └── claudeProvider.js          ← ready, just add ANTHROPIC_API_KEY and set AI_PROVIDER=claude
```

### The default provider is 0G Compute

```
AI_PROVIDER=0g
ZG_BASE_URL=https://router-api.0g.ai/v1
ZG_API_KEY=          ← you will receive this separately; paste it here when ready
```

The 0G Router API is OpenAI-compatible, so it reuses the official `openai` npm package under the hood — no special SDK required.

### Switching providers

Open `.env` and change **one line**:

```
AI_PROVIDER=0g      # or: gemini, openai, claude
```

If switching to Gemini, OpenAI, or Claude, also add that provider's API key in the matching section of `.env`. No source code changes are ever required.

### Per-feature model overrides (optional)

You can make specific features use a different model than the rest of the app — useful if you want a cheaper model for quizzes and a stronger one for the Board Room, for example:

```
RESEARCH_MODEL=
TUTOR_MODEL=
BOARDROOM_MODEL=
BUILDER_MODEL=
DATABASE_MODEL=
```

Leave any of these blank to fall back to `ZG_DEFAULT_MODEL`, or to the provider's built-in default if that's blank too. The app works fine on free or low-cost models — nothing requires a premium model to function.

### What happens if AI credentials are missing

Every AI-powered page tries the request, fails gracefully, and shows a clear message like *"AI features are not yet configured"* instead of crashing. The rest of the app (navigation, profile, workspaces) keeps working normally.

---

## 4. What's included

- ✅ Landing page with animated knowledge graph and particle background
- ✅ Sign Up / Sign In with email + password, Google OAuth, 6-digit email verification
- ✅ Dashboard with sidebar, workspace switcher, topbar, stats
- ✅ **Research Studio** — AI chat with citations (clickable source cards) and animated mind maps
- ✅ **AI Tutor** — AI chat with on-demand interactive quizzes (instant right/wrong feedback)
- ✅ **AI Builder** — AI chat + downloadable ZIP project generation
- ✅ **AI Board Room** — 3 AI personalities (Investor, CTO, PM) debate your idea with distinct visual identities, plus a final scored verdict
- ✅ **Database Studio** — describe your project, AI generates a complete visual schema; drag tables, edit fields
- ✅ **Marketplace** — 8 real, installable AI agents (Research Pro, UI Designer, SEO Intelligence, Marketing Strategist, Deployment Expert, Pitch Coach, Security Auditor, Data Architect). Each one is a genuine specialist AI call, not a placeholder — install it, run it, see real output, with run history saved
- ✅ Workspaces — create, switch, track stats per workspace
- ✅ Profile — avatar upload, bio, timezone, password change
- ✅ Analytics — real charts from real usage data
- ✅ Deployment Assistant — AI chat to help you deploy projects
- ✅ Fully mobile responsive — sidebar becomes a drawer, nav becomes a drawer
- ✅ Dark theme, glassmorphism, Lora + Geist + JetBrains Mono fonts
- ✅ Provider-agnostic AI layer (see section 3)
- ✅ Hardened against missing configuration — see section 6

---

## 5. Where to put your images

Full instructions live in `public/images/ASSET_GUIDE.txt` (open it — it's written in plain English with exact filenames and sizes). Short version:

```
public/images/logo.png       ← your logo (nav bar, sidebar, auth pages)
public/images/favicon.png    ← browser tab icon (a default is already included)
```

If `logo.png` is missing, the app shows a clean text wordmark instead — never a broken image icon. Drop the file in with the exact name and it appears everywhere automatically, no code changes needed.

---

## 6. Reliability — what happens when something isn't configured

This version was specifically hardened so the app **never crashes** due to missing configuration. Here's exactly what happens in each case:

| Missing | What happens |
|---|---|
| `ZG_API_KEY` (or any AI provider key) | The app starts normally. Any AI feature you try shows: *"AI features are not yet configured."* Everything else works. |
| `MONGODB_URI` | The app starts normally with a terminal warning. Login sessions won't persist across restarts, and saved history (research, builds, pitches) won't be available, but the app stays up and browsable. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | The "Continue with Google" button still appears but will not complete sign-in until these are added. Email sign-up works normally. |
| `SMTP_USER` / `SMTP_PASS` | Email sign-up reaches the verification step but the email won't send. Google sign-in still works (it skips email verification entirely). |

Every database query in every route is wrapped so a failed query renders an empty state (empty list, "no sessions yet", etc.) instead of an error page. Every AI call is wrapped so a missing key returns a clear message instead of a crash.

---

## 7. Troubleshooting

**"Sign in doesn't work / I get logged out immediately"**
→ Check `NODE_ENV` in your `.env` file. It must be `development` while testing on `http://localhost`. Only change it to `production` once your site is live on a real domain with HTTPS — otherwise the login cookie will not be saved by the browser.

**"MongoDB connection error" in the terminal, but the app still starts**
→ This is expected behavior now (see section 6). Double-check your `MONGODB_URI` — make sure you replaced `<password>` with your actual database user password, and that your IP is whitelisted in MongoDB Atlas (Network Access → Add IP Address → Allow access from anywhere, for testing).

**"Google sign-in doesn't work"**
→ Make sure the redirect URI in Google Cloud Console exactly matches: `http://localhost:3000/auth/google/callback`

**"Verification emails aren't arriving"**
→ Check your spam folder. Also confirm you used an **App Password**, not your regular Gmail password, and that 2-Step Verification is turned on for that Gmail account.

**"AI features are not yet configured"**
→ This means `ZG_API_KEY` (or your selected provider's key) is missing or incorrect in `.env`. Add it and restart the server.

---

## 8. What's deferred to a future phase

Deep workspace collaboration (inviting team members, shared editing, comments) is scaffolded at the data level but the UI for invites/member management is not included in this build. It can be added cleanly later without restructuring anything — the `Workspace` model already supports `members` and `pendingInvites`.

---

## 9. File Structure

```
axiom-cloud/
├── server.js
├── package.json
├── .env.example
├── config/
│   ├── database.js           ← never crashes if MongoDB is unreachable
│   └── passport.js
├── controllers/
│   └── authController.js
├── middleware/
│   └── auth.js
├── models/
│   ├── User.js
│   ├── Workspace.js
│   ├── Research.js
│   ├── Builder.js
│   ├── Boardroom.js
│   ├── Tutor.js
│   ├── DatabaseStudio.js
│   ├── InstalledAgent.js
│   └── AgentRun.js
├── routes/
│   ├── landing.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── research.js
│   ├── builder.js
│   ├── tutor.js
│   ├── boardroom.js
│   ├── workspace.js
│   ├── profile.js
│   ├── analytics.js
│   ├── deployment.js
│   ├── marketplace.js
│   └── database.js
├── services/
│   ├── aiService.js           ← the only file routes call for AI
│   └── providers/
│       ├── zgProvider.js       ← default (0G Compute)
│       ├── geminiProvider.js
│       ├── openaiProvider.js
│       └── claudeProvider.js
├── utils/
│   ├── email.js
│   └── aiErrors.js            ← shared graceful-failure helper for AI calls
├── views/
│   ├── landing.ejs
│   ├── 404.ejs
│   ├── error.ejs
│   ├── auth/
│   │   ├── signin.ejs
│   │   ├── signup.ejs
│   │   └── verify.ejs
│   ├── dashboard/
│   │   ├── index.ejs
│   │   ├── research.ejs
│   │   ├── tutor.ejs
│   │   ├── builder.ejs
│   │   ├── boardroom.ejs
│   │   ├── workspaces.ejs
│   │   ├── profile.ejs
│   │   ├── analytics.ejs
│   │   ├── deployment.ejs
│   │   ├── marketplace.ejs
│   │   ├── agent-run.ejs
│   │   └── database-studio.ejs
│   └── partials/
│       ├── sidebar.ejs
│       └── topbar.ejs
└── public/
    ├── css/
    │   ├── global.css
    │   ├── landing.css
    │   ├── auth.css
    │   ├── dashboard.css
    │   ├── chat.css
    │   └── database.css
    ├── js/
    │   ├── particles.js
    │   ├── knowledge-graph.js
    │   ├── landing.js
    │   ├── dashboard.js
    │   ├── mindmap-render.js
    │   └── quiz-render.js
    ├── images/
    │   ├── ASSET_GUIDE.txt    ← read this for exact filenames/sizes
    │   └── favicon.png         ← already included, auto-generated default
    ├── uploads/avatars/  (auto-created, stores user avatars)
    └── downloads/        (auto-created, stores generated project ZIPs)
```

---

Built for the OG Labs Vibe Coding Tournament.
# Axiom-Cloud-
