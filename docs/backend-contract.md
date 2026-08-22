# VIRALY AI backend contract

The mobile application never stores the TikTok client secret, access token, or refresh token.

## TikTok connection

Configure `EXPO_PUBLIC_TIKTOK_CONNECT_URL` with an HTTPS backend route.

The app opens:

```text
GET /oauth/tiktok/start?return_to=viralyai%3A%2F%2Fauth%2Ftiktok&scopes=user.info.basic%2Cuser.info.profile%2Cuser.info.stats%2Cvideo.list
```

The backend must:

1. Create and persist a short-lived CSRF `state`.
2. Redirect to TikTok Login Kit using the approved client key and scopes.
3. Receive the authorization code on an HTTPS callback registered with TikTok.
4. Validate `state` and exchange the code server-side.
5. Encrypt access and refresh tokens at rest.
6. Create an opaque VIRALY AI session id.
7. Redirect to the requested mobile callback:

```text
viralyai://auth/tiktok?session=opaque_session_id&handle=%40creator
```

For Expo Go testing, set `EXPO_PUBLIC_TIKTOK_CALLBACK_URL` to a development callback supported by the test environment. Production iOS should use TikTok OpenSDK and an approved universal link.

## Account synchronization

The mobile app should fetch normalized data from VIRALY AI, never call TikTok with a refresh token.

```text
GET /v1/tiktok/account
GET /v1/tiktok/videos?cursor=...
POST /v1/tiktok/sync
```

The normalized account payload should include follower, following, likes and video counts. Video payloads should include the fields approved through TikTok Display API.

## Content analysis

Configure `EXPO_PUBLIC_CONTENT_ANALYSIS_URL` to accept multipart uploads.

```text
POST /v1/content/analyze
Content-Type: multipart/form-data

type=video|carousel
assets[]=file
goal=reach|traffic|lead|affiliate|shop
```

Return a score from 0 to 100, dimension scores, detected risks, a revised hook or cover, slide or scene recommendations, and the best revenue-aligned CTA. Delete source media after analysis unless the user explicitly opts into storage.
