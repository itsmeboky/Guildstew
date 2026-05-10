-- Blog post — header + decorative image columns.
--
-- Three image-shaped concepts on a blog post post-this-migration:
--   cover_image_url      — small thumbnail for blog cards on the
--                          home page / blog index. Pre-existing
--                          column, untouched.
--   header_image_url     — full-width banner displayed at the top
--                          of the reading view; new.
--   decorative_image_url — visual flair element overlapping the
--                          bottom-right of the content box on the
--                          reading view; new, optional.
--
-- The reading view falls back to cover_image_url when
-- header_image_url is null so legacy posts keep rendering with a
-- banner. New posts can have a card thumbnail and an in-page banner
-- that differ.
--
-- Apply via the Supabase SQL editor or `psql`. Idempotent —
-- re-running is safe.

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS header_image_url TEXT,
  ADD COLUMN IF NOT EXISTS decorative_image_url TEXT;
