/**
 * Profile cache invalidation — single source of truth for the set of
 * react-query keys that hold user_profiles data. Call this after any
 * mutation that writes to user_profiles so consumers across the app
 * (sidebar avatar, forum byline, party tracker, friends list, etc.)
 * re-fetch instead of rendering the pre-mutation snapshot.
 */
export function invalidateProfileQueries(queryClient) {
  if (!queryClient) return;
  queryClient.invalidateQueries({ queryKey: ["currentUser"] });
  queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
  queryClient.invalidateQueries({ queryKey: ["userProfile"] });
  queryClient.invalidateQueries({ queryKey: ["profile"] });
  queryClient.invalidateQueries({ queryKey: ["allUserProfiles"] });
}
