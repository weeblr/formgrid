# Weeblr fork

## Deployment

Dokploy deploys the `weeblr` branch with a custom compose file:
`docker/docker-compose.weeblr.yml`

It only exists in this fork, so upstream merges never touch it.

nginx in the `frontend` container serves the dashboard, forwards `/api/` to the backend, and serves uploaded files under `/uploads/` straight from the uploads volume (read-only, sandboxed so an uploaded HTML file cannot run as part of the site). The backend's own `/uploads` route reads a different folder and is not used.

## Settings

- `ENABLE_ACCOUNTS` (`true` or `false`, default `false`): account creation and deletion. When `false`, the signup and Settings pages return 403 from nginx, their API endpoints return 403, and their links are hidden. Only signing in is possible.

- `ENABLE_UPLOADS` (`true` or `false`, default `false`): file uploads on public forms. When not `true`, any request containing a file gets a 403 before anything is written; forms posted as `multipart/form-data` without files still work (8 KB per field, 100 fields). The upload code, the uploads volume and the `/uploads/` location stay in place.
- `JEV_API_URL` (default `https://api.typesafe.ai`) and `JEV_MODEL` (default `jev-latest`): Jev endpoint and model used by spam filtering, read by the queue worker. Optional; the API key is set per form.

## Database changes

`packages/api/prisma/init.sql` only runs when the database is first created. Changes the fork made to it must be applied by hand to an existing database:

```sql
ALTER TABLE `Submission`
  ADD COLUMN `spamScore` DOUBLE NULL AFTER `status`,
  ADD COLUMN `dangerScore` DOUBLE NULL AFTER `spamScore`;
```

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
- Notification and confirmation emails in the form's language, all values escaped. The submitter's email is cleaned (spaces, stray punctuation and wrapping <> or quotes at either end) and kept only if it is then one valid address; otherwise no confirmation is sent and the notification says so. The notification shows submitted data first and replies go to the visitor; the confirmation holds no submitted data and replies go to the form's reply-to address, or `no-reply@` the domain of `EMAIL_FROM`: `packages/api/src/weeblr/emails.ts`
- Success and error pages after a public submission, in the form's language (`/api/weeblr/submission/success` and `/error`): `packages/api/src/weeblr/submissionPages.ts`
- Submission settings card (language, timezone, confirmation email and its reply-to address, multiple submissions): `apps/dashboard/src/components/WeeblrSubmissionSettings.tsx`
- Submitted values reduced to plain text (nested objects flattened as `address.city`, odd shapes stored as JSON text), 8 KB per value, 100 fields, 200 characters per field name; over the limits a submission gets a 413: `packages/api/src/weeblr/payload.ts`
- Error boundary around the submissions tab: `apps/dashboard/src/components/WeeblrErrorBoundary.tsx`
- Upload switch (`ENABLE_UPLOADS`) in front of upstream's upload handling, with text-only multipart parsing when off: `packages/api/src/weeblr/uploads.ts`
- "Save all changes" button repeated at the bottom of each form settings card: `apps/dashboard/src/components/WeeblrSaveAllButton.tsx`
- Optional per-form spam filtering with Jev (TypeSafe AI): settings and their validation (empty thresholds mean 50 / 90 %), fields excluded from what Jev receives, the Jev call, the score bands, and the queue job that classifies a submission before queueing its emails: `packages/api/src/weeblr/spamFiltering.ts`
- Spam filtering settings card, and spam and danger scores in the submission details: `apps/dashboard/src/components/WeeblrSpamFiltering.tsx`
- Submission dates in the viewer's locale and timezone (date and time, full date with seconds, relative time): `apps/dashboard/src/lib/weeblrDates.ts`

## Changes to upstream code

Each change is tagged `[weeblr]` in a comment, so it can be found with a search after an upstream merge. This list is generated from those comments: each entry is the comment's text and its location.

### Backend

`packages/api/prisma/init.sql`

- Jev spam filtering scores, null when not classified: `packages/api/prisma/init.sql:66`

`packages/api/prisma/schema.prisma`

- Missing upstream but used by auth.repository.ts; columns already exist in init.sql: `packages/api/prisma/schema.prisma:16`
- Jev spam filtering: probability (0 to 1) that the submission is spam / dangerous, null when not classified: `packages/api/prisma/schema.prisma:72`

`packages/api/src/form/form.controller.ts`

- No settings: they hold notification addresses, the honeypot field name and the Jev API key: `packages/api/src/form/form.controller.ts:261`

`packages/api/src/form/form.validation.ts`

- Per-form honeypot field name: `packages/api/src/form/form.validation.ts:2`
- Language, timezone and auto-reply settings: `packages/api/src/form/form.validation.ts:4`
- Multiple submissions allowed by default: `packages/api/src/form/form.validation.ts:13`
- Language, timezone and auto-reply settings: `packages/api/src/form/form.validation.ts:15`
- Per-form honeypot field name: `packages/api/src/form/form.validation.ts:26`

`packages/api/src/queue/jobs/dispatchWebhookJob.ts`

- Strip the Jev API key from webhook payloads: `packages/api/src/queue/jobs/dispatchWebhookJob.ts:3`
- Without the Jev API key: `packages/api/src/queue/jobs/dispatchWebhookJob.ts:74`

`packages/api/src/queue/jobs/sendAutoReplyEmailJob.ts`

- Emails in the form's language, with escaped values: `packages/api/src/queue/jobs/sendAutoReplyEmailJob.ts:4`
- Emails in the form's language, with escaped values: `packages/api/src/queue/jobs/sendAutoReplyEmailJob.ts:40`

`packages/api/src/queue/jobs/sendNotificationEmailJob.ts`

- Emails in the form's language, with escaped values: `packages/api/src/queue/jobs/sendNotificationEmailJob.ts:4`
- Emails in the form's language, with escaped values: `packages/api/src/queue/jobs/sendNotificationEmailJob.ts:40`
- Spam filtering verdict, when the form uses it: `packages/api/src/queue/jobs/sendNotificationEmailJob.ts:41`

`packages/api/src/queueWorker.ts`

- Jev spam filtering job: `packages/api/src/queueWorker.ts:8`
- Jev spam filtering, queues the notification and confirmation itself: `packages/api/src/queueWorker.ts:50`

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
- Submitted values stored as plain text, with size limits: `packages/api/src/submission/submission.controller.ts:15`
- Honeypot: the field is never stored; caught bots get the same silent success as rate limiting: `packages/api/src/submission/submission.controller.ts:71`
- No body must not throw: `packages/api/src/submission/submission.controller.ts:84`
- Plain text values only (nested objects flattened), 8 KB per value, 100 fields; real uploads are added after: `packages/api/src/submission/submission.controller.ts:110`
- Plain text values only (nested objects flattened), 8 KB per value, 100 fields: `packages/api/src/submission/submission.controller.ts:153`
- Cut to the column size: some in-app browsers send longer User-Agents, which made the submission fail: `packages/api/src/submission/submission.controller.ts:164`
- Background jobs are already queued by submissionService.submitToForm; queueing them here too sent every notification and webhook twice: `packages/api/src/submission/submission.controller.ts:173`
- Our own success page, in the form's language, instead of a hardcoded localhost URL: `packages/api/src/submission/submission.controller.ts:183`
- Our own error page, in the form's language, instead of a hardcoded localhost URL: `packages/api/src/submission/submission.controller.ts:205`
- Jev spam filtering scores, null when not classified: `packages/api/src/submission/submission.controller.ts:341`
- Jev spam filtering scores, null when not classified: `packages/api/src/submission/submission.controller.ts:406`
- Our own success page, in the form's language, instead of a hardcoded localhost URL: `packages/api/src/submission/submission.controller.ts:651`

`packages/api/src/submission/submission.routes.ts`

- Uploads off unless ENABLE_UPLOADS=true; any file part is refused with 403: `packages/api/src/submission/submission.routes.ts:5`
- Uploads off unless ENABLE_UPLOADS=true: `packages/api/src/submission/submission.routes.ts:31`
- Uploads off unless ENABLE_UPLOADS=true: `packages/api/src/submission/submission.routes.ts:38`
- Uploads off unless ENABLE_UPLOADS=true: `packages/api/src/submission/submission.routes.ts:45`

`packages/api/src/submission/submission.service.ts`

- Auto-reply only when turned on for the form: `packages/api/src/submission/submission.service.ts:8`
- Submitter email cleaned and validated before use: `packages/api/src/submission/submission.service.ts:10`
- Optional Jev spam filtering: `packages/api/src/submission/submission.service.ts:12`
- As text, cut to the column size: `packages/api/src/submission/submission.service.ts:54`
- Only one cleaned, valid address is kept: confirmations and Reply-To use it: `packages/api/src/submission/submission.service.ts:56`
- As text, cut to the column size: `packages/api/src/submission/submission.service.ts:108`
- Only one cleaned, valid address is kept: confirmations and Reply-To use it: `packages/api/src/submission/submission.service.ts:110`
- MySQL JSON columns re-sort object keys: jobs get the fields in the order they were submitted: `packages/api/src/submission/submission.service.ts:117`
- With spam filtering, a classification job queues the notification and confirmation once Jev has answered: `packages/api/src/submission/submission.service.ts:122`
- Notification gets the fields in submitted order: `packages/api/src/submission/submission.service.ts:127`
- End of the branch without spam filtering: `packages/api/src/submission/submission.service.ts:134`
- Webhook gets the fields in submitted order: `packages/api/src/submission/submission.service.ts:138`
- Allowed unless explicitly turned off: `packages/api/src/submission/submission.service.ts:315`
- A confirmation only goes to one valid address: `packages/api/src/submission/submission.service.ts:351`
- Only when turned on for the form: it emails any address a visitor types in: `packages/api/src/submission/submission.service.ts:356`

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
- Save all changes button at the bottom of each settings card: `apps/dashboard/src/pages/FormDetailsPage.tsx:12`
- Error boundary around the submissions tab: `apps/dashboard/src/pages/FormDetailsPage.tsx:14`
- Real submission dates in the viewer's locale and timezone: `apps/dashboard/src/pages/FormDetailsPage.tsx:16`
- Jev spam filtering settings and submission scores: `apps/dashboard/src/pages/FormDetailsPage.tsx:18`
- Per-form honeypot field name: `apps/dashboard/src/pages/FormDetailsPage.tsx:44`
- Open a given tab with ?tab=, used by the Edit icon of the forms list: `apps/dashboard/src/pages/FormDetailsPage.tsx:79`
- Per-form submission settings: multiple submissions, language, timezone, confirmation email: `apps/dashboard/src/pages/FormDetailsPage.tsx:95`
- Pending value of Enable Notifications; upstream changed the saved form instead, so it could never be saved: `apps/dashboard/src/pages/FormDetailsPage.tsx:97`
- Jev spam filtering settings: `apps/dashboard/src/pages/FormDetailsPage.tsx:99`
- Per-form honeypot field name, empty means the default: `apps/dashboard/src/pages/FormDetailsPage.tsx:113`
- Per-form submission settings: `apps/dashboard/src/pages/FormDetailsPage.tsx:146`
- Detect Enable Notifications changes: `apps/dashboard/src/pages/FormDetailsPage.tsx:148`
- Detect spam filtering changes: `apps/dashboard/src/pages/FormDetailsPage.tsx:150`
- Per-form honeypot field name: `apps/dashboard/src/pages/FormDetailsPage.tsx:155`
- Re-check changes for the fork's settings, Enable Notifications and spam filtering: `apps/dashboard/src/pages/FormDetailsPage.tsx:163`
- Multiple submissions allowed by default: `apps/dashboard/src/pages/FormDetailsPage.tsx:191`
- Per-form submission settings: `apps/dashboard/src/pages/FormDetailsPage.tsx:212`
- Load Enable Notifications: `apps/dashboard/src/pages/FormDetailsPage.tsx:214`
- Load spam filtering settings: `apps/dashboard/src/pages/FormDetailsPage.tsx:216`
- A URL of the built-in page is shown as empty: the page now follows the form's language: `apps/dashboard/src/pages/FormDetailsPage.tsx:220`
- Empty: the built-in page in the form's language is used: `apps/dashboard/src/pages/FormDetailsPage.tsx:225`
- Older forms have no honeypot field name: `apps/dashboard/src/pages/FormDetailsPage.tsx:234`
- Per-form honeypot field name, empty means the default: `apps/dashboard/src/pages/FormDetailsPage.tsx:243`
- Real API URL instead of a hardcoded localhost one: `apps/dashboard/src/pages/FormDetailsPage.tsx:264`
- Real date and time instead of "Just now" / "N hours ago", which only counted whole hours: `apps/dashboard/src/pages/FormDetailsPage.tsx:269`
- Submissions held by spam filtering: `apps/dashboard/src/pages/FormDetailsPage.tsx:281`
- Show what is wrong with the spam filtering settings instead of a generic save error: `apps/dashboard/src/pages/FormDetailsPage.tsx:431`
- Save Enable Notifications: `apps/dashboard/src/pages/FormDetailsPage.tsx:449`
- Save spam filtering settings: `apps/dashboard/src/pages/FormDetailsPage.tsx:451`
- Per-form submission settings: `apps/dashboard/src/pages/FormDetailsPage.tsx:454`
- An empty honeypot field name is not saved, the default applies: `apps/dashboard/src/pages/FormDetailsPage.tsx:458`
- Keep the saved settings, otherwise the page still sees unsaved changes after saving: `apps/dashboard/src/pages/FormDetailsPage.tsx:472`
- Anything but text or a number is shown as JSON: React cannot render objects: `apps/dashboard/src/pages/FormDetailsPage.tsx:929`
- Time elapsed since the submission, on hover: `apps/dashboard/src/pages/FormDetailsPage.tsx:1139`
- Every save button saves the whole page: `apps/dashboard/src/pages/FormDetailsPage.tsx:1368`
- Pending value, saved with Save Changes like the other settings: `apps/dashboard/src/pages/FormDetailsPage.tsx:1438`
- Save all changes from this card too: `apps/dashboard/src/pages/FormDetailsPage.tsx:1486`
- Per-form submission settings: multiple submissions, language, timezone, confirmation email: `apps/dashboard/src/pages/FormDetailsPage.tsx:1490`
- Save all changes from this card too: `apps/dashboard/src/pages/FormDetailsPage.tsx:1492`
- Empty means the built-in page in the form's language: `apps/dashboard/src/pages/FormDetailsPage.tsx:1506`
- Save all changes from this card too: `apps/dashboard/src/pages/FormDetailsPage.tsx:1520`
- Hidden: needs a reCAPTCHA key this instance does not set, and upstream drops the token before checking it: `apps/dashboard/src/pages/FormDetailsPage.tsx:1529`
- Hidden: this field is never saved nor used: `apps/dashboard/src/pages/FormDetailsPage.tsx:1561`
- Per-form honeypot field name: `apps/dashboard/src/pages/FormDetailsPage.tsx:1596`
- CAPTCHA toggle is hidden: `apps/dashboard/src/pages/FormDetailsPage.tsx:1634`
- CORS field is hidden: `apps/dashboard/src/pages/FormDetailsPage.tsx:1637`
- Save all changes from this card too: `apps/dashboard/src/pages/FormDetailsPage.tsx:1645`
- Jev spam filtering: `apps/dashboard/src/pages/FormDetailsPage.tsx:1649`
- A bad submission must not blank the whole page: `apps/dashboard/src/pages/FormDetailsPage.tsx:1664`
- Full date and time with seconds: `apps/dashboard/src/pages/FormDetailsPage.tsx:1765`
- Spam and danger scores, when the submission was classified: `apps/dashboard/src/pages/FormDetailsPage.tsx:1770`
- Real uploads URL instead of a hardcoded localhost one: `apps/dashboard/src/pages/FormDetailsPage.tsx:1814`
- Real uploads URL instead of a hardcoded localhost one: `apps/dashboard/src/pages/FormDetailsPage.tsx:1825`

`apps/dashboard/src/pages/FormsPage.tsx`

- Real API URL for form endpoints: `apps/dashboard/src/pages/FormsPage.tsx:7`
- Real API URL instead of a hardcoded localhost one: `apps/dashboard/src/pages/FormsPage.tsx:52`
- The /edit page is an abandoned draft that wipes settings, open the form's Settings tab instead: `apps/dashboard/src/pages/FormsPage.tsx:227`

`apps/dashboard/src/pages/LoginPage.tsx`

- Signup link only when accounts are enabled: `apps/dashboard/src/pages/LoginPage.tsx:8`

`apps/dashboard/src/pages/dashboard/ProfilePage.tsx`

- Missing /api prefix upstream: `apps/dashboard/src/pages/dashboard/ProfilePage.tsx:28`
- API wraps the payload as { success, message, data }: `apps/dashboard/src/pages/dashboard/ProfilePage.tsx:30`
