# VTM Asset Upload — One-Time Step

The prototype `vtm-character-creator-v6.jsx` carried ~1.1 MB of base64-encoded
JPEGs inline because the artifact preview sandbox blocks network fetches.
Phase 1 of the Guildstew port extracts each one to disk under this directory
and the rest of the game pack code references the Supabase URLs they should
end up at — so the bucket has to be populated before the creator can render
correctly.

## What's here

```
campaign-assets/VTM/clans/{brujah,toreador,ventrue,nosferatu,tremere}.jpg
campaign-assets/VTM/memory-photos/photo{1-7}.jpg
campaign-assets/VTM/maps/manhattan-hunt-map.jpg
campaign-assets/VTM/UI/anatomy-figure.jpg
campaign-assets/VTM/UI/grimoire-{jack,balanced,specialist}.jpg
```

17 files, total ~1.1 MB. The five
`campaign-assets/VTM/UI/characterbackground{1-5}.{png,jpg}` background tiles
the prototype references are **already live** in the bucket — they were
uploaded out-of-band before the port started, so this directory does not
include them.

## How to upload

The directory layout mirrors the bucket exactly. Pick whichever path is
convenient:

**Supabase Studio (browser UI):**
1. Open Studio → Storage → `campaign-assets` bucket.
2. Drag the `VTM/` folder from this directory into the bucket root.
3. When prompted about existing folders, choose **merge** (the five
   `UI/characterbackground*` tiles already live there — leave them alone).
4. Confirm public read is enabled on the bucket (it is, since the prototype
   `BACKGROUND_IMAGES` URLs already resolve to public files).

**Supabase CLI:**
```
cd vtm-assets-upload
supabase storage cp -r campaign-assets/VTM \
  supabase://campaign-assets/VTM
```

**Anything else** (rclone, custom script, etc.) — point at the same paths.

## Verify

Visit one of the URLs in a browser:
```
https://<project>.supabase.co/storage/v1/object/public/campaign-assets/VTM/clans/brujah.jpg
```
You should see Brujah's portrait. If you get a 404, the upload didn't land in
the right path — the rest of the creator will silently render blank tiles.

## After uploading

Once the bucket is populated, this directory is no longer needed:

```
git rm -r vtm-assets-upload
git commit -m "chore(vtm): drop one-time asset-upload staging"
```

The extractor script (`extract.mjs`) is kept for reproducibility — re-run it
against the prototype JSX if any of these assets ever needs to be
regenerated:

```
node vtm-assets-upload/extract.mjs path/to/vtm-character-creator-v6.jsx
```
