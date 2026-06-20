/**
 * Google Drive Picker + Docs export — client-side doc ingestion.
 *
 * Lets a GM pick a Google Doc they own (incl. private docs) and pulls
 * its HTML directly in the browser via the Drive API. This path needs
 * NO edge function for the fetch — the Docs/Drive API allows CORS with
 * an OAuth token — which is why it works where the paste flow (which
 * needs a server because docs.google.com/export is CORS-blocked) can't.
 *
 * Requires a Google Cloud project the app owner sets up:
 *   VITE_GOOGLE_CLIENT_ID  — OAuth 2.0 Web client id
 *   VITE_GOOGLE_API_KEY    — API key with Picker API + Drive API enabled
 * The OAuth consent screen and authorized JS origins must be configured
 * for the app's domain. When either env var is absent the picker UI
 * stays hidden and the paste flow is the only option.
 */

const CLIENT_ID = cleanEnv(import.meta.env.VITE_GOOGLE_CLIENT_ID);
const API_KEY = cleanEnv(import.meta.env.VITE_GOOGLE_API_KEY);
// drive.file = per-file access, granted only for files the user picks.
// Minimal scope that still allows exporting the chosen doc.
const SCOPE = "https://www.googleapis.com/auth/drive.file";

// Vercel/.env values sometimes arrive wrapped in quotes or with stray
// whitespace/newlines. Strip both so a paste slip doesn't get sent to
// Google verbatim and come back as "invalid_client".
function cleanEnv(v) {
  return String(v ?? "").trim().replace(/^['"]+|['"]+$/g, "").trim();
}

const GIS_SRC = "https://accounts.google.com/gsi/client";
const GAPI_SRC = "https://apis.google.com/js/api.js";

export function isPickerConfigured() {
  return Boolean(CLIENT_ID && API_KEY);
}

const scriptPromises = {};
function loadScript(src) {
  if (scriptPromises[src]) return scriptPromises[src];
  scriptPromises[src] = new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
  return scriptPromises[src];
}

let pickerApiLoaded = false;
function loadPickerApi() {
  return loadScript(GAPI_SRC).then(
    () => new Promise((resolve, reject) => {
      if (pickerApiLoaded) return resolve();
      window.gapi.load("picker", {
        callback: () => { pickerApiLoaded = true; resolve(); },
        onerror: () => reject(new Error("Failed to load the Google Picker API.")),
      });
    }),
  );
}

/** Request an OAuth access token via Google Identity Services. */
function requestAccessToken() {
  // Catch the most common misconfig before bouncing to Google's opaque
  // "invalid_client / OAuth client was not found" page. A real Web client
  // id is "<projectnumber>-<hash>.apps.googleusercontent.com" — so it must
  // start with digits + a hyphen, not just end in the right suffix.
  if (!/^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(CLIENT_ID)) {
    return Promise.reject(new Error(
      "Google sign-in is misconfigured: VITE_GOOGLE_CLIENT_ID doesn't look like a real OAuth client ID. "
      + "It must be the Web client ID from Google Cloud Console → Credentials, of the form "
      + "'<projectnumber>-<hash>.apps.googleusercontent.com'. Check for quotes/whitespace or a wrong value, then redeploy.",
    ));
  }
  return loadScript(GIS_SRC).then(
    () => new Promise((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (resp) => {
          if (resp.error) reject(new Error(resp.error));
          else resolve(resp.access_token);
        },
      });
      tokenClient.requestAccessToken({ prompt: "" });
    }),
  );
}

/**
 * Open the Drive picker (Google Docs only). Resolves with the chosen
 * { id, name, accessToken }, or null if the user cancels.
 */
export async function pickGoogleDoc() {
  if (!isPickerConfigured()) {
    throw new Error("Google Drive isn't configured for this app.");
  }
  const [accessToken] = await Promise.all([requestAccessToken(), loadPickerApi()]);

  return new Promise((resolve, reject) => {
    try {
      const google = window.google;
      const view = new google.picker.DocsView(google.picker.ViewId.DOCUMENTS)
        .setMimeTypes("application/vnd.google-apps.document");
      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(API_KEY)
        .setCallback((data) => {
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs?.[0];
            resolve(doc ? { id: doc.id, name: doc.name, accessToken } : null);
          } else if (data.action === google.picker.Action.CANCEL) {
            resolve(null);
          }
        })
        .build();
      picker.setVisible(true);
    } catch (err) {
      reject(err);
    }
  });
}

/** Export a picked Google Doc to HTML via the Drive API (CORS-friendly). */
export async function exportDocHtml(fileId, accessToken) {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=text/html`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) {
    throw new Error(`Couldn't read that document from Google Drive (HTTP ${resp.status}).`);
  }
  return resp.text();
}
