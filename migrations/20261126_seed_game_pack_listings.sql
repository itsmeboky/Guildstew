-- Seed three game pack listings: D&D 5e, Mörk Borg, Blades in the Dark.
--
-- This migration is idempotent: it ensures the corresponding game_packs
-- rows exist (D&D 5e was seeded by 20261119; Mörk Borg and Blades are
-- inserted as minimal placeholders here), then upserts the listings.

-- 1. Ensure the parent game_packs rows exist.
INSERT INTO game_packs (slug, name, description, price_usd, is_free, sort_order, is_active)
VALUES
  ('dnd5e', 'D&D 5e', 'The default Guildstew system. Included for every account — full races, classes, monsters, and spells.', 0.00, true, 1, true),
  ('mork-borg', 'Mörk Borg', 'Doom metal apocalypse fantasy. Sweden''s answer to the end of the world.', 7.99, false, 2, true),
  ('blades-in-the-dark', 'Blades in the Dark', 'Industrial heist storytelling in the haunted city of Doskvol.', 7.99, false, 3, true)
ON CONFLICT (slug) DO NOTHING;

-- 2. Seed the listing rows. Use ON CONFLICT (slug) DO UPDATE so re-running
--    the migration during dev refreshes the copy without duplicating rows.

-- D&D 5e
INSERT INTO game_pack_listings (
  game_pack_id, slug, display_name, subtitle, genre_tag,
  publisher_name, publisher_origin, status, price_cents, stripe_price_id,
  hero_image_path, pack_feature_1_image_path, pack_feature_2_image_path,
  theme_dice_image_path, book_cover_image_path,
  hero_pull_quote, about_paragraphs,
  pack_feature_1_title, pack_feature_1_body,
  pack_feature_2_title, pack_feature_2_body,
  theme_section_header, theme_section_tagline, theme_section_body,
  book_section_header, book_section_tagline, book_section_body,
  book_cta_label, book_purchase_url,
  cta_primary_label, cta_secondary_label,
  theme_tokens
)
SELECT
  gp.id, 'dnd-5e', 'Dungeons & Dragons', 'Fifth Edition', 'Heroic fantasy',
  'Wizards of the Coast', 'OGL 1.0a content', 'published', NULL, NULL,
  'pack-listings/dnd-5e/hero.jpg',
  'pack-listings/dnd-5e/feature-1.jpg',
  'pack-listings/dnd-5e/feature-2.jpg',
  'pack-listings/dnd-5e/theme-dice.jpg',
  'pack-listings/dnd-5e/book-cover.jpg',
  'A door creaks open in a forgotten tomb. Torchlight catches gold. Behind you, something massive shifts in the dark.',
  '["For half a century, D&D has been where the world''s stories begin. Forge a hero. Find your party. Discover what waits beyond the next door — through cunning, steel, spellwork, and the occasional disastrous roll.", "The game everyone''s heard of, finally playable in a place that does it justice."]'::jsonb,
  'The Game, Built In',
  'All 12 classes. Every race. Every spell. Initiative tracker, character sheets, world lore, homebrew tools — all wired to D&D''s rules. Roll a 20, advantage applies, the math just works.',
  'DM Quick-Reference Sheet',
  'A folded half-page DM screen. Conditions, DCs, action economy, exhaustion table — all the rules you reach for mid-session, on one printable PDF. Designed in-house by Guildstew.',
  '— A little extra',
  'A Guildstew gift: theme & dice, on the house.',
  'Parchment-and-ink interface. Brass-edged dice with a deep wooden roll sound. Heraldic flourishes on every card and panel. Free with the pack — your table looks the part.',
  '— The book',
  'Hold it. Smell it. Crack the spine.',
  'The Player''s Handbook is a beautiful object — gilt-edged, hardbound, the kind of book you keep on your table between sessions. There''s nothing like flipping through the spell list while your party debates what to do next.',
  'BUY THE PLAYER''S HANDBOOK →',
  'https://dnd.wizards.com/products/players-handbook',
  'PLAY NOW', 'PREVIEW',
  '{
    "bg_primary": "#1a0e08",
    "bg_secondary": "rgba(0,0,0,0.25)",
    "bg_tertiary": "rgba(0,0,0,0.3)",
    "text_primary": "#e8d9b5",
    "text_secondary": "#b8a676",
    "accent": "#d8a95a",
    "accent_text": "#1a0e08",
    "heading_font": "Georgia, serif",
    "body_font": "Georgia, serif",
    "accent_font": "Georgia, serif",
    "border_style": "subtle",
    "hero_overlay_style": "dark-fade",
    "layout_flavor": "elegant"
  }'::jsonb
FROM game_packs gp WHERE gp.slug = 'dnd5e'
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  subtitle = EXCLUDED.subtitle,
  genre_tag = EXCLUDED.genre_tag,
  publisher_name = EXCLUDED.publisher_name,
  publisher_origin = EXCLUDED.publisher_origin,
  status = EXCLUDED.status,
  hero_pull_quote = EXCLUDED.hero_pull_quote,
  about_paragraphs = EXCLUDED.about_paragraphs,
  theme_tokens = EXCLUDED.theme_tokens;

-- Mörk Borg
INSERT INTO game_pack_listings (
  game_pack_id, slug, display_name, subtitle, genre_tag,
  publisher_name, publisher_origin, status, price_cents, stripe_price_id,
  hero_image_path, pack_feature_1_image_path, pack_feature_2_image_path,
  theme_dice_image_path, book_cover_image_path,
  hero_pull_quote, about_paragraphs,
  pack_feature_1_title, pack_feature_1_body,
  pack_feature_2_title, pack_feature_2_body,
  theme_section_header, theme_section_tagline, theme_section_body,
  book_section_header, book_section_tagline, book_section_body,
  book_cta_label, book_purchase_url,
  cta_primary_label, cta_secondary_label,
  theme_tokens
)
SELECT
  gp.id, 'mork-borg', 'MÖRK BORG', '', 'DOOM METAL · APOCALYPSE · 3RD PARTY',
  'Free League Publishing', 'Stockholm', 'published', 799, 'price_PLACEHOLDER_MORK_BORG',
  'pack-listings/mork-borg/hero.jpg',
  'pack-listings/mork-borg/feature-1.jpg',
  'pack-listings/mork-borg/feature-2.jpg',
  'pack-listings/mork-borg/theme-dice.jpg',
  'pack-listings/mork-borg/book-cover.jpg',
  'The world has died. The two-headed basilisks devour the corpses of saints. Your god has gone silent. You owe a man six gold and you''re going to die in a ditch trying to pay him back.',
  '["Mörk Borg is not a heroic fantasy. It is a doom metal album in book form — Sweden''s answer to \"what if the apocalypse was already happening, and your character is one of the people too poor to escape it.\"", "Sessions are short. Deaths are common. The world ends — for real, mechanically, with a ticking clock. You are not here to save anything. You are here to scrape another miserable day out of the dirt before the inevitable.", "It''s the most fun you''ll ever have losing."]'::jsonb,
  '01 The Game',
  'All four classes. The Misery Table. Death rolls. Scrolls that backfire. Combat resolves in Guildstew''s tracker — broken bodies and all. Homebrew supported.',
  '02 GM Cheat Sheet',
  'A black-and-yellow ritual page. Every Misery, every test, every stat. Print it. Crumple it. Stain it. Designed by Guildstew. PDF.',
  '// the gift',
  'YOU ALSO GET:',
  'The whole damn UI goes black-and-yellow. Skull cursor. Dice that look like teeth. Roll sound: a single church bell tolling. Free with the pack — because we cared enough to make it ugly on purpose.',
  '// the artifact',
  'OWN THE BOOK.',
  'Mörk Borg the book is itself a doom metal album. 96 pages of bleak, gold-foiled, ink-spattered art that doesn''t look like anything else on your shelf. It''s worth owning even if you never run a game.',
  'BUY FROM FREE LEAGUE →',
  'https://freeleaguepublishing.com/games/morkborg/',
  'DESCEND →', 'PEEK',
  '{
    "bg_primary": "#000000",
    "bg_secondary": "#f4e926",
    "bg_tertiary": "#f4e926",
    "text_primary": "#f4e926",
    "text_secondary": "#f4e926",
    "accent": "#f4e926",
    "accent_text": "#000000",
    "heading_font": "Impact, ''Arial Black'', sans-serif",
    "body_font": "''Times New Roman'', serif",
    "accent_font": "''Courier New'', monospace",
    "border_style": "thick",
    "hero_overlay_style": "yellow-fade",
    "layout_flavor": "brutal"
  }'::jsonb
FROM game_packs gp WHERE gp.slug = 'mork-borg'
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  subtitle = EXCLUDED.subtitle,
  genre_tag = EXCLUDED.genre_tag,
  publisher_name = EXCLUDED.publisher_name,
  publisher_origin = EXCLUDED.publisher_origin,
  status = EXCLUDED.status,
  hero_pull_quote = EXCLUDED.hero_pull_quote,
  about_paragraphs = EXCLUDED.about_paragraphs,
  theme_tokens = EXCLUDED.theme_tokens;

-- Blades in the Dark
INSERT INTO game_pack_listings (
  game_pack_id, slug, display_name, subtitle, genre_tag,
  publisher_name, publisher_origin, status, price_cents, stripe_price_id,
  hero_image_path, pack_feature_1_image_path, pack_feature_2_image_path,
  theme_dice_image_path, book_cover_image_path,
  hero_pull_quote, about_paragraphs,
  pack_feature_1_title, pack_feature_1_body,
  pack_feature_2_title, pack_feature_2_body,
  theme_section_header, theme_section_tagline, theme_section_body,
  book_section_header, book_section_tagline, book_section_body,
  book_cta_label, book_purchase_url,
  cta_primary_label, cta_secondary_label,
  theme_tokens
)
SELECT
  gp.id, 'blades-in-the-dark', 'Blades in the Dark', '', 'Industrial heist · 3rd party',
  'Evil Hat Productions', 'Powered by Forged in the Dark', 'published', 799, 'price_PLACEHOLDER_BLADES',
  'pack-listings/blades-in-the-dark/hero.jpg',
  'pack-listings/blades-in-the-dark/feature-1.jpg',
  'pack-listings/blades-in-the-dark/feature-2.jpg',
  'pack-listings/blades-in-the-dark/theme-dice.jpg',
  'pack-listings/blades-in-the-dark/book-cover.jpg',
  'The Spirit Wardens are coming. Three streets behind, maybe two. Your fence wants the score by midnight. You haven''t even broken in yet.',
  '["Doskvol is a haunted city. Steam-lit and ghost-cracked. The aristocracy run the rackets, the lower wards run the streets, and you and your crew are scoundrels — out of luck, out of options, and increasingly out of time.", "Blades is heist-first storytelling. You don''t plan the job for an hour and then execute it — you cut to the action and flash back to the planning when it''s interesting. Things go sideways. Things compound. By session three, your crew has a reputation, and the wrong kind of people remember your face.", "It''s a game about what you''ll do for one more shot at getting out clean."]'::jsonb,
  '// 01 The Game',
  'Action rolls, position & effect, the clock system, devil''s bargains, flashbacks. Crews, scores, factions. All of it wired into Guildstew. Clocks tick automatically.',
  '// 02 GM Reference',
  'A folded half-page reference. Position/effect grid, harm levels, faction tracker, score templates. Designed by Guildstew. The thing you reach for mid-job.',
  '/ ON THE HOUSE',
  'A small thank you, on us.',
  'Lamp-lit interface. Coal-and-rust palette. Dice etched with the symbols of the crews. Roll sound: a striking match. Free with the pack — because the table should feel like Doskvol the moment you load it.',
  '/ THE BOOK',
  'Have it on the table for the long sessions.',
  'John Harper''s masterwork in print. Hardcover, beautifully laid out, the kind of rulebook you flip through between sessions just to soak in the lore. Doskvol''s bones, in your hands.',
  'Buy from Evil Hat →',
  'https://evilhat.com/product/blades-in-the-dark/',
  'Pull a job', 'Case the joint',
  '{
    "bg_primary": "#1a1c20",
    "bg_secondary": "#15171b",
    "bg_tertiary": "#0f1114",
    "text_primary": "#e8e2d4",
    "text_secondary": "#9a948a",
    "accent": "#b43c32",
    "accent_text": "#f4ebd9",
    "heading_font": "''Didot'', ''Bodoni 72'', serif",
    "body_font": "''Helvetica Neue'', sans-serif",
    "accent_font": "''Courier New'', monospace",
    "border_style": "thin-line",
    "hero_overlay_style": "gradient-bottom",
    "layout_flavor": "industrial"
  }'::jsonb
FROM game_packs gp WHERE gp.slug = 'blades-in-the-dark'
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  subtitle = EXCLUDED.subtitle,
  genre_tag = EXCLUDED.genre_tag,
  publisher_name = EXCLUDED.publisher_name,
  publisher_origin = EXCLUDED.publisher_origin,
  status = EXCLUDED.status,
  hero_pull_quote = EXCLUDED.hero_pull_quote,
  about_paragraphs = EXCLUDED.about_paragraphs,
  theme_tokens = EXCLUDED.theme_tokens;
