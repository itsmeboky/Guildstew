-- Gallery: multi-media support.
--
-- gallery_pieces shipped with a single image_url. This adds an ordered
-- `media` array so one piece can hold several images and/or videos
-- (progression carousels), while keeping image_url as the COVER.
--
--   media : jsonb, each element { "url": text, "type": "image"|"video", "sort": int }
--
-- media is the canonical source the app reads; image_url is kept in sync
-- with media[0].url on every save so existing single-image consumers and
-- the grid cover keep working. No two-model split — the app always reads
-- `media` (falling back to [image_url] only for rows not yet backfilled).
--
-- Idempotent & additive: safe to re-run; nothing is dropped.

alter table public.gallery_pieces
  add column if not exists media jsonb not null default '[]'::jsonb;

-- Backfill: any piece still on the empty default but with an image_url gets
-- a one-element array using that image as the cover.
update public.gallery_pieces
set media = jsonb_build_array(
              jsonb_build_object('url', image_url, 'type', 'image', 'sort', 0))
where (media is null or media = '[]'::jsonb)
  and image_url is not null;
