import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch spells from Open5e API (free D&D 5e API) - SRD spells only (Player's Handbook)
    const response = await fetch('https://api.open5e.com/spells/?document__slug=wotc-srd&limit=1000');
    const data = await response.json();
    
    // Transform spell data to match our format
    const spells = data.results.map(spell => ({
      name: spell.name,
      level: spell.level,
      school: spell.school,
      castingTime: spell.casting_time,
      range: spell.range,
      components: spell.components,
      duration: spell.duration,
      description: spell.desc,
      higherLevel: spell.higher_level || null,
      classes: spell.dnd_class?.split(', ') || []
    }));

    return Response.json({ 
      spells,
      total: data.count 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});