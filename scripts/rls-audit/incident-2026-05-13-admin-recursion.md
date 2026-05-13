---

## Follow-up #2 — is_admin() rewrite (email domain)

After the unify-admin-checks migration (20260513170000), blog post creation
still failed. Diagnostic query revealed:

- profile_role: null
- in_admin_users: false
- is_admin_function_result: false

The admin_users table was empty all along. The platform's real admin
system is email-domain based (matching policies on community_events,
game_packs, homepage_banners, site_config that already use this pattern).

Migration 20260513180000 rewrites is_admin() to:
1. Check email domain via auth.jwt() ->> 'email' (the actual admin system)
2. Fall back to admin_users membership (so the table can be used for
   future non-team admins)

After this, is_admin() returns true for any team account, and all
admin-check policies routing through it (admin_users, user_profiles,
blog_posts, version_history) work correctly.

## Lessons consolidated

1. Don't write self-referential RLS policies. If a table's policy needs
   to check membership in that same table, wrap it in a SECURITY DEFINER
   function.

2. Centralize role/admin checks in a single function. Avoid scattering
   `auth.uid() IN (SELECT ... WHERE role = 'admin')` subqueries — they
   couple policies to a specific column on a specific table, and they
   make it harder to change the admin system.

3. When writing a new policy that references another table, audit that
   table's own policies first. Recursion bugs only fire when the
   recursive path actually gets walked.

4. For future tables: any "admin can do X" policy should use
   `public.is_admin()`. Single source of truth.
