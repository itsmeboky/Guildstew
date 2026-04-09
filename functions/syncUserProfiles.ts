import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only sync the current user's profile
    const existingProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id });
    
    // Fallback to defaults if auth data is missing
    const profileData = {
      user_id: user.id,
      username: user.username || existingProfiles[0]?.username || `User ${user.id.slice(0, 4)}`,
      email: user.email || existingProfiles[0]?.email || '',
      avatar_url: user.avatar_url || existingProfiles[0]?.avatar_url || '',
      age: user.age || existingProfiles[0]?.age || 0,
      tagline: user.tagline || existingProfiles[0]?.tagline || '',
      country: user.country || existingProfiles[0]?.country || '',
      pronouns: user.pronouns || existingProfiles[0]?.pronouns || '',
      bio: user.bio || existingProfiles[0]?.bio || '',
      social_links: user.social_links || existingProfiles[0]?.social_links || [],
      favorite_genres: user.favorite_genres || existingProfiles[0]?.favorite_genres || [],
      profile_color_1: user.profile_color_1 || existingProfiles[0]?.profile_color_1 || '#FF5722',
      profile_color_2: user.profile_color_2 || existingProfiles[0]?.profile_color_2 || '#37F2D1',
      banner_url: user.banner_url || existingProfiles[0]?.banner_url || '',
      role: user.role || existingProfiles[0]?.role || 'user'
    };
    
    if (existingProfiles.length === 0) {
      // Create new profile
      await base44.asServiceRole.entities.UserProfile.create(profileData);
      return Response.json({ 
        success: true, 
        action: 'created'
      });
    } else {
      // Update existing profile - only update fields that are present in auth user object to avoid overwriting with defaults
      // But since we want to ensure colors are synced if set in dashboard, we use the merged object
      // Be careful not to clear existing data if auth data is missing
      
      const { user_id, ...updateData } = profileData;
      await base44.asServiceRole.entities.UserProfile.update(existingProfiles[0].id, updateData);
      return Response.json({ 
        success: true, 
        action: 'updated'
      });
    }
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});