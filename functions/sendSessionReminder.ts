import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaign_id } = await req.json();

    // Get campaign details
    const campaigns = await base44.asServiceRole.entities.Campaign.filter({ id: campaign_id });
    const campaign = campaigns[0];

    if (!campaign) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if user is GM or co-GM
    const isGM = campaign.game_master_id === user.id;
    const isCoDM = campaign.co_dm_ids?.includes(user.id);

    if (!isGM && !isCoDM) {
      return Response.json({ error: 'Only GMs can send session reminders' }, { status: 403 });
    }

    // Get all players + GM
    const allParticipants = [
      campaign.game_master_id,
      ...(campaign.co_dm_ids || []),
      ...(campaign.player_ids || [])
    ];

    // Create reminder records for each participant
    const reminderPromises = allParticipants.map(userId =>
      base44.asServiceRole.entities.SessionReminder.create({
        campaign_id: campaign_id,
        user_id: userId,
        session_time: campaign.next_session_time || new Date().toISOString(),
        read: false
      })
    );

    await Promise.all(reminderPromises);

    // Update campaign last reminder sent time
    await base44.asServiceRole.entities.Campaign.update(campaign_id, {
      last_reminder_sent: new Date().toISOString()
    });

    return Response.json({ success: true, message: 'Reminders sent to all participants' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});