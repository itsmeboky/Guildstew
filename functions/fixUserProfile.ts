import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { email, username } = body;

    if (!email || !username) {
      return Response.json({ error: 'Email and username required' }, { status: 400 });
    }

    // Find the user by email
    const allUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (allUsers.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = allUsers[0];

    // Update the User entity
    await base44.asServiceRole.entities.User.update(targetUser.id, { username });

    // Update or create UserProfile
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: targetUser.id });
    
    if (profiles.length === 0) {
      // Create new profile
      await base44.asServiceRole.entities.UserProfile.create({
        user_id: targetUser.id,
        username,
        email: targetUser.email,
        avatar_url: targetUser.avatar_url || '',
        age: targetUser.age || 0,
        tagline: targetUser.tagline || '',
        country: targetUser.country || '',
        pronouns: targetUser.pronouns || '',
        bio: targetUser.bio || '',
        social_links: targetUser.social_links || [],
        favorite_genres: targetUser.favorite_genres || [],
        profile_color_1: targetUser.profile_color_1 || '#FF5722',
        profile_color_2: targetUser.profile_color_2 || '#37F2D1',
        banner_url: targetUser.banner_url || '',
        role: targetUser.role || 'user'
      });
    } else {
      // Update existing profile
      await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, { username });
    }

    return Response.json({ 
      success: true,
      message: `Updated username to "${username}" for ${email}`
    });
  } catch (error) {
    console.error('Fix error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});