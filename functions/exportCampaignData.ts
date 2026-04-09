import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaign_id } = await req.json();

    // Fetch campaign data
    const campaign = await base44.asServiceRole.entities.Campaign.filter({ id: campaign_id }).then(c => c[0]);
    if (!campaign) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Verify user is GM or co-GM
    if (campaign.game_master_id !== user.id && !campaign.co_dm_ids?.includes(user.id)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch all archives data
    const [npcs, items, maps] = await Promise.all([
      base44.asServiceRole.entities.CampaignNPC.filter({ campaign_id }),
      base44.asServiceRole.entities.CampaignItem.filter({ campaign_id }),
      base44.asServiceRole.entities.CampaignMap.filter({ campaign_id })
    ]);

    // Build RTF content
    let rtf = `{\\rtf1\\ansi\\deff0\n`;
    rtf += `{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}}\n`;
    rtf += `{\\colortbl;\\red255\\green255\\blue255;\\red0\\green0\\blue0;}\n`;
    rtf += `\\viewkind4\\uc1\\pard\\cf2\\f0\\fs32\\b ${campaign.title} - Campaign Archives\\b0\\fs24\\par\\par\n`;

    // Add NPCs
    if (npcs.length > 0) {
      rtf += `\\fs28\\b NPCs\\b0\\fs24\\par\n`;
      npcs.forEach(npc => {
        rtf += `\\par\\b ${npc.name}\\b0\\par\n`;
        if (npc.description) rtf += `${npc.description}\\par\n`;
        if (npc.notes) {
          const plainNotes = npc.notes.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
          rtf += `${plainNotes}\\par\n`;
        }
        rtf += `\\par\n`;
      });
    }

    // Add Items
    if (items.length > 0) {
      rtf += `\\fs28\\b Items\\b0\\fs24\\par\n`;
      items.forEach(item => {
        rtf += `\\par\\b ${item.name}\\b0 (${item.rarity})\\par\n`;
        if (item.description) rtf += `${item.description}\\par\n`;
        if (item.notes) {
          const plainNotes = item.notes.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
          rtf += `${plainNotes}\\par\n`;
        }
        rtf += `\\par\n`;
      });
    }

    // Add Maps
    if (maps.length > 0) {
      rtf += `\\fs28\\b Maps\\b0\\fs24\\par\n`;
      maps.forEach(map => {
        rtf += `\\par\\b ${map.name}\\b0\\par\n`;
        if (map.notes) {
          const plainNotes = map.notes.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
          rtf += `${plainNotes}\\par\n`;
        }
        rtf += `\\par\n`;
      });
    }

    // Add World Lore
    if (campaign.world_lore) {
      rtf += `\\fs28\\b World Lore\\b0\\fs24\\par\n`;
      const plainLore = campaign.world_lore.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
      rtf += `${plainLore}\\par\\par\n`;
    }

    // Add Homebrew
    if (campaign.homebrew_rules) {
      try {
        const rules = JSON.parse(campaign.homebrew_rules);
        if (rules.length > 0) {
          rtf += `\\fs28\\b Homebrew Rules\\b0\\fs24\\par\n`;
          rules.forEach(rule => {
            rtf += `\\par\\b ${rule.name}\\b0\\par\n`;
            if (rule.description) rtf += `${rule.description}\\par\n`;
            rtf += `\\par\n`;
          });
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    rtf += `}\n`;

    return new Response(rtf, {
      status: 200,
      headers: {
        'Content-Type': 'application/rtf',
        'Content-Disposition': `attachment; filename="${campaign.title.replace(/[^a-z0-9]/gi, '_')}_archives.rtf"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});