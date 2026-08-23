# VIRALY AI

VIRALY AI is a mobile-first TikTok growth assistant for creators who want to turn content data into a practical publishing system.

The MVP focuses on five jobs:

- secure a VIRALY AI space with Google, run a seven-step creator diagnostic, and gate the app behind a first personalized report;
- connect a TikTok account or import a profile screenshot, then turn the available signals into daily actions;
- analyze a video selected from the phone gallery;
- score video ideas before recording;
- choose a niche with growth and revenue potential;
- build a repeatable posting, story, engagement, and monetization cycle.

## Product Angle

Most TikTok analytics tools show metrics first. VIRALY AI is designed to show the next best move first: what to post, when to post, why it can work, and how it could drive traffic or revenue.

The 5-10% improvement target is intentionally practical:

- explain insights in creator language, not dashboards only;
- combine account analytics, video critique, niche choice, and revenue paths in one flow;
- provide confidence scores and concrete next actions;
- separate generic advice from account-specific recommendations once TikTok data is connected;
- make the mobile experience feel like a creator cockpit, not a spreadsheet.

## Current Screens

- `Dashboard`: TikTok connection or profile screenshot import, account snapshot, growth score, best actions today, trend signals.
- `Video Lab`: pick a video from the gallery and run a structured review of hook, retention, saves, shares, and revenue fit.
- `Idea Lab`: analyze video ideas before filming and rank them by search pull, shareability, and monetization fit.
- `Strategy`: niche chooser, best posting slots, weekly cycle, story plays, and revenue paths.
- `Coach`: answers to common creator questions such as best posting time, stories, likes, saves, posting frequency, and engagement routines.

## Run Locally

```bash
npm install
npm run start
```

Then open the project in Expo Go or a simulator.

## TikTok Integration Notes

The app currently includes a prepared TikTok service layer and a product-ready connection flow. Production integration should use TikTok Login Kit with OAuth v2, request only the scopes needed, and keep access and refresh tokens on the server side.

Likely scope groups for the first connected version:

- profile basics: display name, avatar, username;
- video list: public videos and their ids;
- video insights: views, engagement, retention-like metrics when available;
- user insights: follower and account-level analytics when available through the approved product surface.

The app should never store TikTok tokens directly on the device in plain storage.

## Suggested Next Build Steps

1. Add a backend for TikTok OAuth callback, encrypted token storage, and refresh handling.
2. Replace demo analytics with account-specific account, video, and audience data.
3. Add AI scoring endpoints for video file analysis and script/hook generation.
4. Add a calendar planner with push notifications for posting windows.
5. Add creator revenue tracking: affiliate links, lead magnets, TikTok Shop, paid community, and brand deal readiness.
