import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return Response.json({ error: 'campaign_id is required' }, { status: 400 });
    }

    const campaigns = await base44.entities.Campaign.filter({ id: campaign_id });
    const campaign = campaigns[0];

    if (!campaign) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.game_master_id !== user.id) {
      return Response.json({ error: 'Only the GM can enrich monsters' }, { status: 403 });
    }

    // Fetch all monsters
    const allMonsters = await base44.asServiceRole.entities.Monster.filter({ campaign_id });

    // Remove duplicates by name (keep the first occurrence)
    const seenNames = new Set();
    const uniqueMonsters = [];
    const duplicatesToDelete = [];

    for (const monster of allMonsters) {
      const normalizedName = monster.name.toLowerCase().trim();
      if (seenNames.has(normalizedName)) {
        duplicatesToDelete.push(monster.id);
      } else {
        seenNames.add(normalizedName);
        uniqueMonsters.push(monster);
      }
    }

    // Delete duplicates
    for (const id of duplicatesToDelete) {
      await base44.asServiceRole.entities.Monster.delete(id);
    }

    let imagesGenerated = 0;
    let dataEnriched = 0;

    // Process each unique monster
    for (const monster of uniqueMonsters) {
      const needsDescription = !monster.description || monster.description.trim() === '';
      const needsAbilities = !monster.stats?.abilities || monster.stats.abilities.length === 0;
      const needsActions = !monster.stats?.actions || monster.stats.actions.length === 0;
      const needsImage = !monster.image_url;

      // Skip if monster has everything
      if (!needsDescription && !needsAbilities && !needsActions && !needsImage) {
        continue;
      }

      let needsUpdate = false;
      const updates = {};

      // Generate image if missing
      if (needsImage) {
        try {
          const imagePrompt = `A ${monster.name} from Dungeons and Dragons, fantasy creature, high quality fantasy art style, detailed illustration, professional artwork, dramatic lighting`;
          const { url } = await base44.integrations.Core.GenerateImage({ prompt: imagePrompt });
          updates.image_url = url;
          imagesGenerated++;
          needsUpdate = true;
        } catch (error) {
          console.error(`Failed to generate image for ${monster.name}:`, error);
        }
      }

      // Enrich data if any field is missing
      if (needsDescription || needsAbilities || needsActions) {
        try {
          const llmPrompt = `Extract the exact official D&D 5e 2024 data for the creature "${monster.name}" from https://www.dndbeyond.com/sources/dnd/br-2024/creature-stat-blocks

Return ONLY valid JSON with this exact structure using the EXACT official text from D&D Beyond:
{
  "description": "The exact description/lore text from D&D Beyond",
  "abilities": [{"name": "exact ability name", "description": "exact ability description from the stat block"}],
  "actions": [{"name": "exact action name", "description": "exact action description including damage dice"}]
}

Use the official stat block text verbatim. If the creature doesn't exist in official D&D 5e, return empty arrays and a note in the description.`;

          const response = await base44.integrations.Core.InvokeLLM({
            prompt: llmPrompt,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                description: { type: "string" },
                abilities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" }
                    }
                  }
                },
                actions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" }
                    }
                  }
                }
              }
            }
          });

          if (needsDescription) {
            updates.description = response.description;
          }

          if (needsAbilities || needsActions) {
            updates.stats = {
              ...(monster.stats || {}),
              ...(needsAbilities ? { abilities: response.abilities } : {}),
              ...(needsActions ? { actions: response.actions } : {})
            };
          }

          dataEnriched++;
          needsUpdate = true;
        } catch (error) {
          console.error(`Failed to enrich data for ${monster.name}:`, error);
        }
      }

      // Update monster if changes were made
      if (needsUpdate) {
        await base44.asServiceRole.entities.Monster.update(monster.id, updates);
      }
    }

    return Response.json({ 
      success: true,
      duplicates_removed: duplicatesToDelete.length,
      images_generated: imagesGenerated,
      monsters_enriched: dataEnriched,
      total_monsters: uniqueMonsters.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});