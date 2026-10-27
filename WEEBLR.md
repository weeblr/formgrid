# Weeblr fork

## Deployment

Dokploy deploys the `weeblr` branch with a custom compose file:
`docker/docker-compose.weeblr.yml`

It only exists in this fork, so upstream merges never touch it.

nginx in the `frontend` container serves the dashboard, forwards `/api/` to the backend, and serves uploaded files under `/uploads/` straight from the uploads volume (read-only, sandboxed so an uploaded HTML file cannot run as part of the site). The backend's own `/uploads` route reads a different folder and is not used.

## Settings

- `ENABLE_ACCOUNTS` (`true` or `false`, default `false`): account creation and deletion. When `false`, the signup and Settings pages return 403 from nginx, their API endpoints return 403, and their links are hidden. Only signing in is possible.

## Fork-only files

Files that do not exist upstream, so upstream merges never touch them.

- Account deletion API endpoint (`DELETE /api/user/me`), also deleting uploaded files: `packages/api/src/weeblr/account.routes.ts`
- Email verification: signup creates an unverified account and emails a link; login refuses unverified accounts and resends the link (at most every 5 minutes): `packages/api/src/weeblr/auth.routes.ts`
- `ENABLE_ACCOUNTS` flag and the public `GET /api/weeblr/config` endpoint exposing it, with the available form languages: `packages/api/src/weeblr/config.ts`
- Dashboard hook loading that config: `apps/dashboard/src/lib/weeblrConfig.ts`
- Route guards: no public pages, account pages only when enabled: `apps/dashboard/src/components/WeeblrRoutes.tsx`
- Signup page asking to check your email instead of logging in: `apps/dashboard/src/pages/WeeblrSignupPage.tsx`
- Profile page with editable full name and website: `apps/dashboard/src/pages/dashboard/WeeblrProfilePage.tsx`
- Settings page, only offering account deletion confirmed by typing the email address: `apps/dashboard/src/pages/dashboard/WeeblrSettingsPage.tsx`
- Honeypot with a per-form field name (default `fax`), never stored, silent success when filled: `packages/api/src/weeblr/honeypot.ts`
- Honeypot field name setting with the markup to add to the form: `apps/dashboard/src/components/WeeblrHoneypotField.tsx`
- Form languages: texts for visitors and submission emails, one file per language with the same keys (an empty text falls back to English): `packages/api/src/weeblr/i18n/en.ts`, `packages/api/src/weeblr/i18n/fr.ts`, list of languages in `packages/api/src/weeblr/i18n/index.ts`
- Per-form language, timezone, confirmation email and confirmation reply-to settings, with their validation and date formatting: `packages/api/src/weeblr/formSettings.ts`
- Notification and confirmation emails in the form's language, all values escaped. The notification shows submitted data first and replies go to the visitor; the confirmation holds no submitted data and replies go to the form's reply-to address, or `no-reply@` the domain of `EMAIL_FROM`: `packages/api/src/weeblr/emails.ts`
- Success and error pages after a public submission, in the form's language (`/api/weeblr/submission/success` and `/error`): `packages/api/src/weeblr/submissionPages.ts`
- Submission settings card (language, timezone, confirmation email and its reply-to address, multiple submissions): `apps/dashboard/src/components/WeeblrSubmissionSettings.tsx`

## Changes to upstream code

Each change is tagged `[weeblr]` in a comment, so it can be found with a search after an upstream merge. This list is generated from those comments: each entry is the comment's text and its location.

### Backend

`packages/api/prisma/schema.prisma`

- Missing upstream but used by auth.repository.ts; columns already exist in init.sql: `packages/api/prisma/schema.prisma:16`

`packages/api/src/form/form.validation.ts`

- Per-form honeypot field name: `packages/api/src/form/form.validation.ts:2`
- Language, timezone and auto-reply settings: `packages/api/src/form/form.validation.ts:4`
- Multiple submissions allowed by default: `packages/api/src/form/form.validation.ts:13`
- Language, timezone and auto-reply settings: `packages/api/src/form/form.validation.ts:15`
- Per-form honeypot field name: `packages/api/src/form/form.validation.ts:26`

`packages/api/src/queue/jobs/sendAutoReplyEmailJob.ts`

- Emails in the form's language, with escaped values: `packages/api/src/queue/jobs/sendAutoReplyEmailJob.ts:4`
- Emails in the form's language, with escaped values: `packages/api/src/queue/jobs/sendAutoReplyEmailJob.ts:40`

`packages/api/src/queue/jobs/sendNotificationEmailJob.ts`

- Emails in the form's language, with escaped values: `packages/api/src/queue/jobs/sendNotificationEmailJob.ts:4`
- Emails in the form's language, with escaped values: `packages/api/src/queue/jobs/sendNotificationEmailJob.ts:40`

`packages/api/src/server.ts`

- Fork-only routes: `packages/api/src/server.ts:24`
- Behind a single reverse proxy (nginx), which sets X-Forwarded-For to the client IP: `packages/api/src/server.ts:36`
- Email verification, mounted first to replace signup and pre-check login: `packages/api/src/server.ts:92`
- Instance settings for the dashboard: `packages/api/src/server.ts:95`
- Success and error pages in the form's language: `packages/api/src/server.ts:97`
- Account deletion: `packages/api/src/server.ts:99`

`packages/api/src/submission/submission.controller.ts`

- Our own success and error pages, in the form's language: `packages/api/src/submission/submission.controller.ts:11`
- Honeypot with a per-form field name: `packages/api/src/submission/submission.controller.ts:13`
- Honeypot: the field is never stored; caught bots get the same silent success as rate limiting: `packages/api/src/submission/submission.controller.ts:69`
- Background jobs are already queued by submissionService.submitToForm; queueing them here too sent every notification and webhook twice: `packages/api/src/submission/submission.controller.ts:155`
- Our own success page, in the form's language, instead of a hardcoded localhost URL: `packages/api/src/submission/submission.controller.ts:165`
- Our own error page, in the form's language, instead of a hardcoded localhost URL: `packages/api/src/submission/submission.controller.ts:187`
- Our own success page, in the form's language, instead of a hardcoded localhost URL: `packages/api/src/submission/submission.controller.ts:627`

`packages/api/src/submission/submission.service.ts`

- Auto-reply only when turned on for the form: `packages/api/src/submission/submission.service.ts:8`
- MySQL JSON columns re-sort object keys: jobs get the fields in the order they were submitted: `packages/api/src/submission/submission.service.ts:109`
- Notification gets the fields in submitted order: `packages/api/src/submission/submission.service.ts:115`
- Webhook gets the fields in submitted order: `packages/api/src/submission/submission.service.ts:125`
- Allowed unless explicitly turned off: `packages/api/src/submission/submission.service.ts:302`
- Only when turned on for the form: it emails any address a visitor types in: `packages/api/src/submission/submission.service.ts:342`

`packages/api/src/submission/submission.validation.ts`

- Per-form honeypot field name: `packages/api/src/submission/submission.validation.ts:2`
- Language, timezone and auto-reply settings: `packages/api/src/submission/submission.validation.ts:4`
- Multiple submissions allowed by default: `packages/api/src/submission/submission.validation.ts:29`
- Language, timezone and auto-reply settings: `packages/api/src/submission/submission.validation.ts:31`
- Per-form honeypot field name: `packages/api/src/submission/submission.validation.ts:44`

### Dashboard

`apps/dashboard/src/App.tsx`

- Fork-only signup page, requiring email verification: `apps/dashboard/src/App.tsx:6`
- Fork-only Profile and Settings pages: `apps/dashboard/src/App.tsx:16`
- Private instance routing: `apps/dashboard/src/App.tsx:19`
- No landing page, signup only when accounts are enabled: `apps/dashboard/src/App.tsx:31`
- Settings page: `apps/dashboard/src/App.tsx:85`
- Any other page goes to the dashboard or the sign-in page: `apps/dashboard/src/App.tsx:96`

`apps/dashboard/src/components/Navbar.tsx`

- No Sign Up button, signup is only linked from the sign-in page: `apps/dashboard/src/components/Navbar.tsx:107`

`apps/dashboard/src/components/dashboard/DashboardSidebar.tsx`

- Settings only when accounts are enabled: `apps/dashboard/src/components/dashboard/DashboardSidebar.tsx:4`
- Settings page: `apps/dashboard/src/components/dashboard/DashboardSidebar.tsx:15`

`apps/dashboard/src/components/dashboard/UserAvatarDropdown.tsx`

- Settings only when accounts are enabled: `apps/dashboard/src/components/dashboard/UserAvatarDropdown.tsx:5`

`apps/dashboard/src/pages/FormDetailsPage.tsx`

- Per-form honeypot field name: `apps/dashboard/src/pages/FormDetailsPage.tsx:8`
- Per-form submission settings: multiple submissions, language, timezone, confirmation email: `apps/dashboard/src/pages/FormDetailsPage.tsx:10`
- Per-form honeypot field name: `apps/dashboard/src/pages/FormDetailsPage.tsx:36`
- Open a given tab with ?tab=, used by the Edit icon of the forms list: `apps/dashboard/src/pages/FormDetailsPage.tsx:71`
- Per-form submission settings: multiple submissions, language, timezone, confirmation email: `apps/dashboard/src/pages/FormDetailsPage.tsx:87`
- Pending value of Enable Notifications; upstream changed the saved form instead, so it could never be saved: `apps/dashboard/src/pages/FormDetailsPage.tsx:89`
- Per-form honeypot field name, empty means the default: `apps/dashboard/src/pages/FormDetailsPage.tsx:103`
- Per-form submission settings: `apps/dashboard/src/pages/FormDetailsPage.tsx:136`
- Detect Enable Notifications changes: `apps/dashboard/src/pages/FormDetailsPage.tsx:138`
- Per-form honeypot field name: `apps/dashboard/src/pages/FormDetailsPage.tsx:143`
- Re-check changes for the fork's settings and Enable Notifications: `apps/dashboard/src/pages/FormDetailsPage.tsx:151`
- Multiple submissions allowed by default: `apps/dashboard/src/pages/FormDetailsPage.tsx:179`
- Per-form submission settings: `apps/dashboard/src/pages/FormDetailsPage.tsx:200`
- Load Enable Notifications: `apps/dashboard/src/pages/FormDetailsPage.tsx:202`
- A URL of the built-in page is shown as empty: the page now follows the form's language: `apps/dashboard/src/pages/FormDetailsPage.tsx:206`
- Empty: the built-in page in the form's language is used: `apps/dashboard/src/pages/FormDetailsPage.tsx:211`
- Older forms have no honeypot field name: `apps/dashboard/src/pages/FormDetailsPage.tsx:220`
- Per-form honeypot field name, empty means the default: `apps/dashboard/src/pages/FormDetailsPage.tsx:229`
- Real API URL instead of a hardcoded localhost one: `apps/dashboard/src/pages/FormDetailsPage.tsx:250`
- Save Enable Notifications: `apps/dashboard/src/pages/FormDetailsPage.tsx:435`
- Per-form submission settings: `apps/dashboard/src/pages/FormDetailsPage.tsx:438`
- An empty honeypot field name is not saved, the default applies: `apps/dashboard/src/pages/FormDetailsPage.tsx:442`
- Keep the saved settings, otherwise the page still sees unsaved changes after saving: `apps/dashboard/src/pages/FormDetailsPage.tsx:456`
- Pending value, saved with Save Changes like the other settings: `apps/dashboard/src/pages/FormDetailsPage.tsx:1419`
- Per-form submission settings: multiple submissions, language, timezone, confirmation email: `apps/dashboard/src/pages/FormDetailsPage.tsx:1469`
- Empty means the built-in page in the form's language: `apps/dashboard/src/pages/FormDetailsPage.tsx:1482`
- Hidden: needs a reCAPTCHA key this instance does not set, and upstream drops the token before checking it: `apps/dashboard/src/pages/FormDetailsPage.tsx:1503`
- Hidden: this field is never saved nor used: `apps/dashboard/src/pages/FormDetailsPage.tsx:1535`
- Per-form honeypot field name: `apps/dashboard/src/pages/FormDetailsPage.tsx:1570`
- CAPTCHA toggle is hidden: `apps/dashboard/src/pages/FormDetailsPage.tsx:1608`
- CORS field is hidden: `apps/dashboard/src/pages/FormDetailsPage.tsx:1611`
- Real uploads URL instead of a hardcoded localhost one: `apps/dashboard/src/pages/FormDetailsPage.tsx:1776`
- Real uploads URL instead of a hardcoded localhost one: `apps/dashboard/src/pages/FormDetailsPage.tsx:1787`

`apps/dashboard/src/pages/FormsPage.tsx`

- Real API URL for form endpoints: `apps/dashboard/src/pages/FormsPage.tsx:7`
- Real API URL instead of a hardcoded localhost one: `apps/dashboard/src/pages/FormsPage.tsx:52`
- The /edit page is an abandoned draft that wipes settings, open the form's Settings tab instead: `apps/dashboard/src/pages/FormsPage.tsx:227`

`apps/dashboard/src/pages/LoginPage.tsx`

- Signup link only when accounts are enabled: `apps/dashboard/src/pages/LoginPage.tsx:8`

`apps/dashboard/src/pages/dashboard/ProfilePage.tsx`

- Missing /api prefix upstream: `apps/dashboard/src/pages/dashboard/ProfilePage.tsx:28`
- API wraps the payload as { success, message, data }: `apps/dashboard/src/pages/dashboard/ProfilePage.tsx:30`
