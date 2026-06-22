// Admin allowlist — anyone in ADMIN_EMAILS plus any staff-domain
// email (@aetherianstudios.com or @guildstew.com) is treated as
// an admin. Used by Admin.jsx, AdminTools.jsx, and any
// pre-launch / restricted route.
//
// Lifted out of pages/Admin.jsx and pages/AdminTools.jsx so the
// list lives in exactly one place. Add staff explicitly to
// ADMIN_EMAILS; never add `endsWith` rules for non-staff domains.

export const ADMIN_EMAILS = [
  'itsmeboky@aetherianstudios.com',
];

export function isAdminUser(user) {
  const email = (user?.email || '').toLowerCase();
  if (!email) return false;
  if (ADMIN_EMAILS.includes(email)) return true;
  return email.endsWith('@aetherianstudios.com')
    || email.endsWith('@guildstew.com');
}
