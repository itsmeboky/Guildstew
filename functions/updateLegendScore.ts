import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const LEGEND_BENCHMARKS = [
  { score: -100, title: "Arch-Villain", description: "The most infamous villain of the age" },
  { score: -80, title: "Infamous", description: "Known far and wide for terrible deeds" },
  { score: -60, title: "Notorious", description: "A name spoken in fear" },
  { score: -40, title: "Troublemaker", description: "Developing a dark reputation" },
  { score: -20, title: "Minor Nuisance", description: "Starting to be known for misdeeds" },
  { score: 20, title: "Slightly Known", description: "Some have heard of your deeds" },
  { score: 40, title: "Notable", description: "Your name is recognized" },
  { score: 60, title: "Famous", description: "Celebrated for heroic acts" },
  { score: 80, title: "Renowned Hero", description: "A beacon of hope and inspiration" },
  { score: 100, title: "Living Legend", description: "Tales of your deeds will live forever" }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { character_id, is_critical_success } = await req.json();

    if (!character_id || typeof is_critical_success !== 'boolean') {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch character and campaign
    const character = await base44.entities.Character.filter({ id: character_id }).then(c => c[0]);
    if (!character) {
      return Response.json({ error: 'Character not found' }, { status: 404 });
    }

    const campaign = await base44.entities.Campaign.filter({ id: character.campaign_id }).then(c => c[0]);
    if (!campaign) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get legend settings with defaults
    const legendSettings = campaign.legend_settings || { crit_success_points: 10, crit_fail_points: 10 };
    
    // Calculate score change
    const currentScore = character.legend_score || 0;
    const pointChange = is_critical_success 
      ? legendSettings.crit_success_points 
      : -legendSettings.crit_fail_points;
    
    const newScore = Math.max(-100, Math.min(100, currentScore + pointChange));

    // Check for benchmark crossings
    const benchmarksToAward = [];
    
    for (const benchmark of LEGEND_BENCHMARKS) {
      // Check if we crossed this benchmark
      const crossedBenchmark = (currentScore < benchmark.score && newScore >= benchmark.score) ||
                               (currentScore > benchmark.score && newScore <= benchmark.score);
      
      if (crossedBenchmark) {
        // Check if achievement already exists
        const existingAchievements = await base44.asServiceRole.entities.Achievement.filter({
          user_id: character.created_by,
          title: benchmark.title
        });

        if (existingAchievements.length === 0) {
          benchmarksToAward.push(benchmark);
        }
      }
    }

    // Update character score
    await base44.asServiceRole.entities.Character.update(character_id, {
      legend_score: newScore
    });

    // Award achievements
    for (const benchmark of benchmarksToAward) {
      await base44.asServiceRole.entities.Achievement.create({
        user_id: character.created_by,
        title: benchmark.title,
        description: benchmark.description,
        rarity: Math.abs(benchmark.score) >= 80 ? 'legendary' : 
                Math.abs(benchmark.score) >= 60 ? 'epic' : 
                Math.abs(benchmark.score) >= 40 ? 'rare' : 'common'
      });
    }

    return Response.json({
      success: true,
      old_score: currentScore,
      new_score: newScore,
      achievements_awarded: benchmarksToAward.map(b => b.title)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});