# Weeblr fork

## Deployment

Dokploy deploys the `weeblr` branch with a custom compose file:
`docker/docker-compose.weeblr.yml`

It only exists in this fork, so upstream merges never touch it.

## Changes to upstream code

Each change is tagged `[weeblr]` in a comment, so it can be found with a search after an upstream merge.

- Add the `verificationToken` and `verificationTokenExpires` fields that the auth code uses: `packages/api/prisma/schema.prisma:16`
- Trust one reverse proxy hop so `req.ip` is the real client IP: `packages/api/src/server.ts:31`
- Add the missing `/api` prefix to the profile request: `apps/dashboard/src/pages/dashboard/ProfilePage.tsx:28`
- Read the profile from the API's `data` field: `apps/dashboard/src/pages/dashboard/ProfilePage.tsx:30`
