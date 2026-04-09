import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// D&D 5e Items Library - Comprehensive item database
const itemIcons = {
  "Club": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/2bbbf582f_2.png",
  "Dagger": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/b9b10c0b6_75.png",
  "Greatclub": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/e181c5a02_8.png",
  "Handaxe": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/56adc2044_6.png",
  "Javelin": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/ee091b851_3.png",
  "Light Hammer": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/bfdffca4d_39.png",
  "Mace": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/6dd43d4ff_17.png",
  "Quarterstaff": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/9405b3fd8_3.png",
  "Sickle": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/9bd585ec0_29.png",
  "Spear": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/65ca04514_62.png",
  "Light Crossbow": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/d9bd348be_34.png",
  "Dart": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/2fff5789f_15.png",
  "Shortbow": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/ddfd54307_3.png",
  "Battleaxe": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/a943ad99c_41.png",
  "Flail": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/9cf1255fc_6.png",
  "Glaive": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/5fbb3e9a4_16.png",
  "Greataxe": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/ca3d2ddc8_48.png",
  "Sling": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/8ead95583_ChatGPTImageNov23202506_41_49PM.png",
  "Greatsword": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/a4f90fb36_13.png",
  "Lance": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/a8000b674_392.png",
  "Longsword": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/4544800a5_10.png",
  "Maul": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/46ae9a8e3_33.png",
  "Morningstar": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/de11bb69b_18.png",
  "Pike": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/48e76a858_47.png",
  "Rapier": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/40de4fb67_8.png",
  "Scimitar": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/26c7adb23_9.png",
  "Shortsword": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/48ccd3d89_1.png",
  "Trident": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/f87a0b7ea_38.png",
  "War Pick": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/b06cd1778_26.png",
  "Warhammer": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/c3035e244_47.png",
  "Whip": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/7d36cfe51_33.png",
  "Halberd": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/6975294e7_ChatGPTImageNov23202506_48_03PM.png",
  "Hand Crossbow": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/8cb465fd3_38.png",
  "Heavy Crossbow": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/02c94c830_36.png",
  "Longbow": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/0b6793ed2_16.png",
  "Padded Armor": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/3102b0c64_18.png",
  "Leather Armor": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/faebe8827_18.png",
  "Studded Leather Armor": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/720dadbfb_15.png",
  "Hide Armor": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/2a1c5544a_19.png",
  "Chain Shirt": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/95ecc8459_ChatGPTImageNov23202510_43_24PM.png",
  "Scale Mail": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/0822a9aca_34.png",
  "Breastplate": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/dd42107e8_31.png",
  "Half Plate Armor": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/ad30b5c58_21.png",
  "Blowgun": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/4bc4e3ff8_ChatGPTImageNov23202506_51_37PM.png",
  "Net": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/21d28d511_ChatGPTImageNov23202510_51_11PM.png",
  "Ring Mail": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/8a4d8a8a4_28.png",
  "Chain Mail": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/59c024995_ChatGPTImageNov23202510_46_07PM.png",
  "Splint Armor": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/247d86965_36.png",
  "Plate Armor": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/8ba174655_22.png",
  "Shield": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/69f6a6eca_1.png",
  "Blanket": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/b600e1846_Blanket.png",
  "Bell": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/84a9fbc1f_Bell.png",
  "Bedroll": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/1bbeaa59a_Bedroll.png",
  "Basket": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/a1dd271f4_Basket.png",
  "Barrel": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/877cd4cc4_Barrel.png",
  "Backpack": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/1071981c9_Backpack.png",
  "Ammunition (Sling Bullets, 20)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/f5c1d8fce_AmmunitionSlingBullets20.png",
  "Ammunition (Crossbow Bolts, 20)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/7ab2ca128_AmmunitionCrossbowBolts20.png",
  "Ammunition (Blowgun Needles, 50)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/6c9cc6a8e_AmmunitionBlowgunNeedles50.png",
  "Ammunition (Arrows, 20)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/624430ed4_AmmunitionArrows20.png",
  "Abacus": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/c02bf73c0_Abacus.png",
  "Acid (vial)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/0d722f82e_22.png",
  "Alchemist's Fire (flask)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/573121f1b_34.png",
  "Ball Bearings (bag of 1,000)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/1f1595e04_BallBearings.png",
  "Antitoxin (vial)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/fd930a0bf_47.png",
  "Book": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/87f3de690_12.png",
  "Shield +1": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/ab598942f_32.png",
  "Shield +2": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/c4a17c82c_2.png",
  "Shield +3": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/84f5d2d76_27.png",
  "Bottle, Glass": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/9b7a6e374_BottleGlass.png",
  "Longbow +1": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/375343954_5.png",
  "Longbow +2": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/cf9e2a586_4.png",
  "Longbow +3": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/b0273522a_9.png",
  "Heavy Crossbow +1": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/4552403a3_31.png",
  "Heavy Crossbow +2": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/f624ebc5f_32.png",
  "Heavy Crossbow +3": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/6f5ac4258_48.png",
  "Hand Crossbow +1": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/4102459a1_50.png",
  "Hand Crossbow +2": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/98d4b53a0_41.png",
  "Hand Crossbow +3": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/da2441b82_35.png",
  "Bucket": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/c76f998e7_Bucket.png"
};

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
      return Response.json({ error: 'Only the GM can preload items' }, { status: 403 });
    }

    if (campaign.system !== 'D&D 5e' && campaign.system !== 'Dungeons and Dragons 5e') {
      return Response.json({ error: 'This function only works for D&D 5e campaigns' }, { status: 400 });
    }

    // Map items to CampaignItem structure and inject icons
    const itemsToCreate = allItemsWithEnchanted.map(item => {
        const iconUrl = itemIcons[item.name] || null;
        
        return {
            campaign_id: campaign_id,
            name: item.name,
            description: item.description,
            image_url: iconUrl,
            type: item.type,
            rarity: item.type.includes('Legendary') ? 'legendary' :
                    item.type.includes('Very Rare') ? 'very_rare' :
                    item.type.includes('Rare') ? 'rare' :
                    item.type.includes('Uncommon') ? 'uncommon' :
                    'common',
            stats: {
                damage: item.damage,
                weight: item.weight,
                cost: item.cost,
                properties: item.properties,
                armorClass: item.armorClass
            }
        };
    });

    // Insert in chunks to avoid hitting limits if any
    const CHUNK_SIZE = 50;
    for (let i = 0; i < itemsToCreate.length; i += CHUNK_SIZE) {
        const chunk = itemsToCreate.slice(i, i + CHUNK_SIZE);
        await base44.asServiceRole.entities.CampaignItem.bulkCreate(chunk);
    }

    return Response.json({ 
      success: true, 
      items_created: itemsToCreate.length 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});