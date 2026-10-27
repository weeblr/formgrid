# Weeblr fork

## Deployment

Dokploy deploys the `weeblr` branch with a custom compose file:
`docker/docker-compose.weeblr.yml`

It only exists in this fork, so upstream merges never touch it.

## Fork-only files

Files that do not exist upstream, so upstream merges never touch them.

- Account deletion API endpoint (`DELETE /api/user/me`), also deleting uploaded files: `packages/api/src/weeblr/account.routes.ts`
- Email verification: signup creates an unverified account and emails a link; login refuses unverified accounts and resends the link (at most every 5 minutes): `packages/api/src/weeblr/auth.routes.ts`
- Signup page asking to check your email instead of logging in: `apps/dashboard/src/pages/WeeblrSignupPage.tsx`
- Profile page with editable full name and website: `apps/dashboard/src/pages/dashboard/WeeblrProfilePage.tsx`
- Settings page, only offering account deletion confirmed by typing the email address: `apps/dashboard/src/pages/dashboard/WeeblrSettingsPage.tsx`
- Public form submission success and error pages: `apps/dashboard/public/submission-success.html`, `apps/dashboard/public/submission-error.html`

## Changes to upstream code

Each change is tagged `[weeblr]` in a comment, so it can be found with a search after an upstream merge.

- Add the `verificationToken` and `verificationTokenExpires` fields that the auth code uses: `packages/api/prisma/schema.prisma:16`
- Import the fork-only routes: `packages/api/src/server.ts:24`
- Trust one reverse proxy hop so `req.ip` is the real client IP: `packages/api/src/server.ts:34`
- Mount the fork-only auth routes before the upstream ones: `packages/api/src/server.ts:90`
- Mount the fork-only account routes: `packages/api/src/server.ts:93`
- Import `env` for the submission redirects: `packages/api/src/submission/submission.controller.ts:11`
- Redirect to our success page after a public submission: `packages/api/src/submission/submission.controller.ts:158`
- Redirect to our error page after a failed public submission: `packages/api/src/submission/submission.controller.ts:180`
- Redirect to our success page after a silently rate-limited submission: `packages/api/src/submission/submission.controller.ts:620`
- Use the fork-only signup page: `apps/dashboard/src/App.tsx:6`
- Use the fork-only Profile and Settings pages: `apps/dashboard/src/App.tsx:16`
- Add the Settings page route: `apps/dashboard/src/App.tsx:82`
- Add Settings to the dashboard sidebar: `apps/dashboard/src/components/dashboard/DashboardSidebar.tsx:13`
- Add the missing `/api` prefix to the profile request (page no longer routed): `apps/dashboard/src/pages/dashboard/ProfilePage.tsx:28`
- Read the profile from the API's `data` field (page no longer routed): `apps/dashboard/src/pages/dashboard/ProfilePage.tsx:30`
