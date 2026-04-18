/**
 * Placeholder for the in-session achievements grant panel. The
 * full flow (fetch available achievements, pick a player, write a
 * grant row) will replace this — shipped as a stub so the sidebar
 * menu renders without a dead route.
 */
export default function GMSidebarAchievements() {
  return (
    <div>
      <h3 className="text-white font-semibold text-sm mb-2">Grant Achievement</h3>
      <p className="text-slate-500 text-xs">
        Pick an achievement and a player to grant it mid-session.
        Achievement granting will land in a follow-up commit.
      </p>
    </div>
  );
}
