// Code generator for guild invite codes.
//
// Format: `GLD-XXXX-XXXX` — eight alphanumeric chars in two groups of
// four. The alphabet excludes 0/O/1/I/L to keep verbal/text sharing
// unambiguous (a friend reading the code over voice chat shouldn't
// have to ask "is that a zero or an O?").
//
// Codes are unique across all guilds (UNIQUE constraint on
// guild_invite_codes.code). With 27^8 ≈ 2.8e11 possible codes the
// odds of a collision per generation are negligible, but the
// generator is wrapped in a small retry loop to handle the
// theoretical case without surfacing the error to the user.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function segment(len) {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

export function generateInviteCodeString() {
  return `GLD-${segment(4)}-${segment(4)}`;
}
