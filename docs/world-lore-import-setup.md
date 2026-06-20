# World Lore Import — setup

The import wizard ("Import from Google Doc" on the World Lore page) has two
sources. They have independent setup; you can enable either or both.

## 1. Paste-a-share-link (server-side) — requires deploying the edge function

The paste flow sends the link to the `importGoogleDoc` Supabase Edge
Function, which fetches the doc server-side (the browser can't — Google's
export URL is CORS-blocked) and re-hosts images into `user-assets`.

Deploy it:

```bash
supabase functions deploy importGoogleDoc
```

Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` are
auto-injected by Supabase — no extra secrets needed. The doc must be shared
"Anyone with the link → Viewer."

> Until this is deployed, the paste flow returns "the import service didn't
> respond" — that's a 404 for the missing function, not a problem with the
> link.

## 2. Choose from Google Drive (client-side picker) — works on private docs

The picker reads the chosen doc's HTML directly in the browser via the
Drive API (CORS-allowed with an OAuth token), so it needs **no edge
function** and **no sharing change**. It appears only when both env vars
below are set.

### Frontend env

```
VITE_GOOGLE_CLIENT_ID=<oauth-web-client-id>.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=<api-key>
VITE_GOOGLE_APP_ID=<cloud-project-number>
```

`VITE_GOOGLE_APP_ID` is the **Cloud project number** (Console home / project
picker → "Project number"). The Picker passes it via `setAppId`; without it
you can pick a file but the read 403s. All three vars are required for the
"Choose from Google Drive" button to appear.

### Google Cloud setup (one-time, by the app owner)

1. Create / pick a project at https://console.cloud.google.com.
2. **Enable APIs**: *Google Picker API* and *Google Drive API*.
3. **OAuth consent screen**: configure it (External), add the scope
   `https://www.googleapis.com/auth/drive.file`, and add your testers (or
   publish).
4. **Credentials → OAuth client ID → Web application**: add your app's
   origin(s) to *Authorized JavaScript origins* (e.g. `https://yourapp.com`
   and `http://localhost:5173` for dev). Copy the client id →
   `VITE_GOOGLE_CLIENT_ID`.
5. **Credentials → API key**: copy it → `VITE_GOOGLE_API_KEY` (optionally
   restrict it to the Picker + Drive APIs and your referrers).

### Known limitation (picker path)

Images in picker-imported docs keep their original Google Drive URLs (they
aren't re-hosted into `user-assets` like the paste flow does). The wizard
flags this in the review step. Re-hosting for the picker path is a future
enhancement.
