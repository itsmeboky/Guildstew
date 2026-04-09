import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's profile
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id });

    return Response.json({ 
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name
      },
      profile: profiles[0] || null
    });
  } catch (error) {
    console.error('Debug error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});