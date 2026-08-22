# TikTok Integration Plan

## First Production Architecture

The mobile app should not exchange OAuth codes or store long-lived tokens directly. Use a backend for:

- TikTok Login Kit OAuth callback;
- code exchange;
- encrypted token storage;
- token refresh;
- API calls to TikTok;
- normalization into VIRALY AI account, video, and insight models.

## Mobile Flow

1. User taps `Connect TikTok`.
2. App opens TikTok OAuth authorization.
3. TikTok redirects to `viralyai://auth/tiktok`.
4. App sends the returned code and state to the backend.
5. Backend exchanges the code, stores tokens, and returns a VIRALY AI session state.
6. App fetches normalized analytics from the backend.

## Scopes To Request Carefully

Start narrow and request more only when the product needs it:

- profile basics for account identity;
- video listing for public content;
- approved analytics or insight endpoints for performance metrics.

## Data Model

Suggested normalized objects:

- `AccountSnapshot`: handle, followers, likes, video count, avatar, account stage.
- `VideoSnapshot`: id, caption, post date, views, likes, comments, shares, saves if available.
- `InsightSignal`: metric, confidence, explanation, recommended action.
- `PostingRecommendation`: day, time, reason, priority.
- `RevenueRecommendation`: path, trigger signal, next action.

## Security Notes

- Keep client secrets only on the backend.
- Store refresh tokens encrypted.
- Rotate tokens and revoke on disconnect.
- Use state and PKCE where available.
- Keep TikTok raw data separate from derived AI recommendations for easier compliance.

## AI Analysis Layer

After TikTok data is normalized, VIRALY AI can run:

- cluster analysis for formats and niches;
- hook scoring against retention and engagement;
- idea scoring before filming;
- video file critique from uploaded gallery content;
- posting-window recommendations by account history and audience behavior.
