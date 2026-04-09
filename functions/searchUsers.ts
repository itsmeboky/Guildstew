import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchQuery, excludeUserIds } = await req.json();

    // Use service role to search all profiles
    const allProfiles = await base44.asServiceRole.entities.UserProfile.list();
    
    // Filter profiles based on search query and exclusions
    const results = allProfiles
      .filter(profile => {
        const profileData = profile.data || profile;
        if (profileData.user_id === user.id) return false;
        if (excludeUserIds?.includes(profileData.user_id)) return false;
        
        const query = (searchQuery || '').toLowerCase().trim();
        if (!query) return false;
        
        const matchesUsername = profileData.username?.toLowerCase().includes(query);
        const matchesEmail = profileData.email?.toLowerCase().includes(query);
        
        return matchesUsername || matchesEmail;
      })
      .map(profile => {
        const profileData = profile.data || profile;
        // Remove email from search results for privacy
        const { email, ...safeProfile } = profileData;
        return safeProfile;
      });

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});