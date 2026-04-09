import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import JSZip from "npm:jszip";

Deno.serve(async (req) => {
    try {
        if (req.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            });
        }

        const base44 = createClientFromRequest(req);
        const { campaign_id } = await req.json();

        if (!campaign_id) {
            return Response.json({ error: 'Campaign ID required' }, { status: 400 });
        }

        const monsters = await base44.entities.Monster.filter({ campaign_id: campaign_id });
        const zip = new JSZip();
        const folder = zip.folder("monster_images");

        // Parallel download of images
        const imagePromises = monsters.map(async (monster) => {
            const imageUrl = monster.image_url || monster.avatar_url;
            if (imageUrl) {
                try {
                    const response = await fetch(imageUrl);
                    if (response.ok) {
                        const buffer = await response.arrayBuffer();
                        // Sanitize filename
                        let safeName = monster.name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
                        if (safeName.length === 0) safeName = `monster_${monster.id}`;
                        
                        // Get extension from url or content-type, default to png
                        let ext = "png";
                        const contentType = response.headers.get("content-type");
                        if (contentType === "image/jpeg") ext = "jpg";
                        else if (contentType === "image/webp") ext = "webp";
                        else if (contentType === "image/gif") ext = "gif";
                        
                        folder.file(`${safeName}.${ext}`, buffer);
                    }
                } catch (err) {
                    console.error(`Failed to fetch image for ${monster.name}:`, err);
                }
            }
        });

        await Promise.all(imagePromises);

        // Use base64 to avoid binary corruption issues in transit
        const zipContent = await zip.generateAsync({ type: "base64" });

        return Response.json({ file_data: zipContent });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
});