# VIRALY AI

VIRALY AI is a mobile-first TikTok growth assistant for creators who want to turn content data into a practical publishing system.

The MVP focuses on these jobs:

- secure a VIRALY AI space with Google, run a seven-step creator diagnostic, and gate the app behind a first personalized report;
- import a TikTok profile screenshot, then turn visible signals into daily actions;
- analyze a video or photo carousel selected from the phone gallery;
- analyze and generate video ideas before recording;
- choose a niche with growth and revenue potential;
- build a repeatable posting, story, LIVE, and monetization cycle;
- generate and persist a seven-day content calendar.

## Product Angle

Most TikTok analytics tools show metrics first. VIRALY AI is designed to show the next best move first: what to post, when to post, why it can work, and how it could drive traffic or revenue.

The 5-10% improvement target is intentionally practical:

- explain insights in creator language, not dashboards only;
- combine account analytics, video critique, niche choice, and revenue paths in one flow;
- provide confidence scores and concrete next actions;
- separate generic advice from account-specific recommendations once TikTok data is connected;
- make the mobile experience feel like a creator cockpit, not a spreadsheet.

## Real AI Backend

The `backend/` service is a FastAPI API with SQLite persistence and structured OpenAI responses. It powers onboarding, profile screenshots, videos, carousels, ideas, coaching, strategy, revenue directions, eligibility guidance, and the calendar. It never substitutes demo values when AI is unavailable.

Model routing keeps cost and latency proportional to the task:

- visual model for profile screenshots, video frames, and carousels;
- strategy model for positioning, ideas, onboarding, and revenue plans;
- fast model for coaching and calendar generation.

All model names, limits, and upload sizes are configurable in `backend/.env`.

## Current Screens

- `Dashboard`: TikTok connection or profile screenshot import and evidence-based account analysis.
- `Video Lab`: analyze a video or carousel, including hook, structure, likely retention signals, and revenue fit.
- `Idea Lab`: analyze or generate ideas, scripts, risks, and monetization paths.
- `Strategy`: niches, posting tests, weekly cycle, stories, LIVE, eligibility, revenue, and persistent calendar.
- `Coach`: answers to common creator questions such as best posting time, stories, likes, saves, posting frequency, and engagement routines.

## Run Locally

1. Copy `.env.example` to `.env` and point `EXPO_PUBLIC_API_BASE_URL` to the backend.
2. Copy `backend/.env.example` to `backend/.env` and set `OPENAI_API_KEY`.
3. For local preview only, set the same non-empty random value in `VIRALY_DEV_TOKEN` and `EXPO_PUBLIC_VIRALY_DEV_TOKEN`.

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
PYTHONPATH=. .venv/bin/uvicorn app.main:app --reload --port 8000
```

In another terminal:

```bash
npm install
npm run start
```

The backend container can be deployed with `backend/Dockerfile`. In production, leave both development token variables empty and provide sessions through the Google OAuth service.

Production backend: `https://viraly-ai.onrender.com` (`/api/health` reports deployment and AI configuration status).

## TikTok Integration Notes

The app includes the TikTok client connection flow. Production connection still requires an approved TikTok developer app and a server-side OAuth service; profile screenshots remain the immediate alternative. Access and refresh tokens must stay encrypted on the server.

Likely scope groups for the first connected version:

- profile basics: display name, avatar, username;
- video list: public videos and their ids;
- video insights: views, engagement, retention-like metrics when available;
- user insights: follower and account-level analytics when available through the approved product surface.

The app should never store TikTok tokens directly on the device in plain storage.

## Verification

```bash
npm run typecheck
cd backend && PYTHONPATH=. .venv/bin/pytest -q
```

Next production integrations are Google OAuth session issuance, approved TikTok OAuth with encrypted token storage, a managed PostgreSQL database, and calendar notifications.
