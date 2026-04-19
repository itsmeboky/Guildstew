import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Download, Star, Check, Trash2, FlaskConical, Tag,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatCategoryLabel, categoryColorClass } from "./BreweryCard";
import { trackEvent } from "@/utils/analytics";

/**
 * Detail modal for a brewery homebrew row. Shows the full
 * description, a readable modifications breakdown, install/uninstall
 * buttons scoped to the current user's campaigns, creator metadata,
 * and a ratings + reviews panel.
 */
export default function BreweryDetailDialog({ open, onClose, brew, currentUser }) {
  const queryClient = useQueryClient();
  const brewId = brew?.id || null;
  const userId = currentUser?.id || null;

  // User's GM campaigns — the list we render under "Add to Campaign".
  const { data: campaigns = [] } = useQuery({
    queryKey: ["myGMCampaigns", userId],
    queryFn: async () => {
      if (!userId) return [];
      const owned = await base44.entities.Campaign.filter({ owner_id: userId }).catch(() => []);
      const all = await base44.entities.Campaign.list().catch(() => []);
      const coDM = all.filter((c) => Array.isArray(c.co_dms) && c.co_dms.includes(userId));
      const seen = new Map();
      for (const c of [...owned, ...coDM]) seen.set(c.id, c);
      return Array.from(seen.values());
    },
    enabled: open && !!userId,
    initialData: [],
  });

  // Which campaigns already have this brew installed.
  const { data: installedRows = [] } = useQuery({
    queryKey: ["campaignsWithBrew", brewId],
    queryFn: () => base44.entities.CampaignHomebrew.filter({ homebrew_id: brewId }),
    enabled: open && !!brewId,
    initialData: [],
  });
  const installedRowByCampaign = useMemo(() => {
    const m = new Map();
    for (const r of installedRows) m.set(r.campaign_id, r);
    return m;
  }, [installedRows]);

  // Creator profile (for the "Created by" block).
  const { data: creatorProfile } = useQuery({
    queryKey: ["userProfile", brew?.creator_id],
    queryFn: async () => {
      if (!brew?.creator_id) return null;
      const rows = await base44.entities.UserProfile.filter({ user_id: brew.creator_id }).catch(() => []);
      return rows[0] || null;
    },
    enabled: open && !!brew?.creator_id,
  });

  // Reviews for this brew. Capped at 10 on the first page; the
  // "Load More" button doubles the limit.
  const [reviewLimit, setReviewLimit] = useState(10);
  const { data: reviews = [] } = useQuery({
    queryKey: ["homebrewReviews", brewId, reviewLimit],
    queryFn: () => base44.entities.HomebrewReview.filter(
      { homebrew_id: brewId },
      "-created_at",
      reviewLimit,
    ),
    enabled: open && !!brewId,
    initialData: [],
  });

  // The current user's own review (if any), so we can prefill the
  // rating widget and let them edit instead of double-submitting.
  const myReview = useMemo(
    () => reviews.find((r) => r.user_id === userId) || null,
    [reviews, userId],
  );
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  React.useEffect(() => {
    if (!open) return;
    setRating(myReview?.rating || 0);
    setComment(myReview?.comment || "");
  }, [open, myReview, brewId]);

  // Add-to-campaign. Bumps the lifetime downloads count on the
  // homebrew_rules row too (this is an "install count", not an
  // active-install gauge, so removing later doesn't decrement it).
  const addMutation = useMutation({
    mutationFn: async (campaignId) => {
      await base44.entities.CampaignHomebrew.create({
        campaign_id: campaignId,
        homebrew_id: brewId,
        enabled: true,
        added_by: userId,
      });
      await base44.entities.HomebrewRule.update(brewId, {
        downloads: (brew.downloads || 0) + 1,
      });
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ["campaignsWithBrew", brewId] });
      queryClient.invalidateQueries({ queryKey: ["brewery"] });
      queryClient.invalidateQueries({ queryKey: ["myBrews"] });
      queryClient.invalidateQueries({ queryKey: ["campaignHomebrew", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaignHomebrewMods", campaignId] });
      trackEvent(userId, 'homebrew_downloaded', {
        homebrew_id: brewId,
        category: brew?.category,
        campaign_id: campaignId,
      });
      toast.success("Added to campaign!");
    },
    onError: (err) => toast.error(err?.message || "Failed to add"),
  });

  const removeMutation = useMutation({
    mutationFn: async (joinId) => base44.entities.CampaignHomebrew.delete(joinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignsWithBrew", brewId] });
      queryClient.invalidateQueries({ queryKey: ["campaignHomebrew"] });
      queryClient.invalidateQueries({ queryKey: ["campaignHomebrewMods"] });
      toast.success("Removed from campaign");
    },
    onError: (err) => toast.error(err?.message || "Failed to remove"),
  });

  const rateMutation = useMutation({
    mutationFn: async () => {
      if (!brewId || !userId) throw new Error("Not signed in");
      if (rating < 1) throw new Error("Pick a star rating first");
      if (myReview?.id) {
        // Update path — recompute the aggregate delta.
        const delta = rating - (myReview.rating || 0);
        await base44.entities.HomebrewReview.update(myReview.id, {
          rating,
          comment: comment.trim(),
        });
        if (delta !== 0) {
          await base44.entities.HomebrewRule.update(brewId, {
            rating_total: Math.max(0, (brew.rating_total || 0) + delta),
          });
        }
      } else {
        await base44.entities.HomebrewReview.create({
          homebrew_id: brewId,
          user_id: userId,
          rating,
          comment: comment.trim(),
        });
        await base44.entities.HomebrewRule.update(brewId, {
          rating_total: (brew.rating_total || 0) + rating,
          rating_count: (brew.rating_count || 0) + 1,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homebrewReviews", brewId] });
      queryClient.invalidateQueries({ queryKey: ["brewery"] });
      toast.success("Review posted");
    },
    onError: (err) => toast.error(err?.message || "Failed to post review"),
  });

  if (!brew) return null;

  const avgRating = brew.rating_count > 0 ? (Number(brew.rating_total) / brew.rating_count) : 0;
  const avgDisplay = brew.rating_count > 0 ? avgRating.toFixed(1) : "—";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>{brew.title}</DialogTitle>
        </DialogHeader>

        {/* Cover banner */}
        <div className="relative -mx-6 -mt-6 mb-4 aspect-[21/9] overflow-hidden rounded-t-lg bg-[#050816]">
          {brew.cover_image_url ? (
            <img src={brew.cover_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#37F2D1]/30 to-[#8B5CF6]/30">
              <FlaskConical className="w-20 h-20 text-white/80" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E2430] via-[#1E2430]/50 to-transparent" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
          {/* --- Main column --- */}
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={categoryColorClass(brew.category)}>{formatCategoryLabel(brew.category)}</Badge>
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                {(brew.game_system === "dnd5e" ? "D&D 5e" : brew.game_system) || "D&D 5e"}
              </Badge>
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                v{brew.version || "1.0.0"}
              </Badge>
            </div>
            <h1 className="text-3xl font-black">{brew.title}</h1>
            {brew.description && (
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{brew.description}</p>
            )}
            {Array.isArray(brew.tags) && brew.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                {brew.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] font-semibold uppercase tracking-wider text-[#37F2D1] bg-[#37F2D1]/10 border border-[#37F2D1]/30 rounded-full px-2 py-0.5"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Modifications preview — renders a human-readable
                summary based on the brew's category. */}
            <div className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#37F2D1] mb-2">
                Modifications
              </h2>
              <ModificationsPreview brew={brew} />
            </div>

            {/* --- Reviews --- */}
            <div className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-4 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#37F2D1]">
                Reviews
              </h2>

              {userId && (
                <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-2">
                  <p className="text-[11px] text-slate-400">
                    {myReview ? "Your review — edit below" : "Rate this brew"}
                  </p>
                  <StarSelector value={rating} onChange={setRating} />
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Leave a comment (optional)"
                    rows={2}
                    className="bg-[#0b1220] border-slate-700 text-white text-xs"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={rateMutation.isPending || rating < 1}
                      onClick={() => rateMutation.mutate()}
                      className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
                    >
                      {myReview ? "Update review" : "Submit review"}
                    </Button>
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No reviews yet. Be the first!</p>
              ) : (
                <div className="space-y-2">
                  {reviews.map((r) => (
                    <ReviewRow key={r.id} review={r} />
                  ))}
                  {reviews.length >= reviewLimit && (
                    <button
                      type="button"
                      onClick={() => setReviewLimit((v) => v + 10)}
                      className="text-xs font-semibold text-[#37F2D1] hover:text-white"
                    >
                      Load more reviews
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* --- Sidebar --- */}
          <aside className="space-y-4">
            <div className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <Download className="w-4 h-4" />
                  <strong className="text-white">{brew.downloads || 0}</strong> downloads
                </span>
                <span className="inline-flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.round(avgRating) ? "text-[#fbbf24] fill-[#fbbf24]" : "text-slate-600"}`}
                    />
                  ))}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Average rating: <strong className="text-white">{avgDisplay}</strong>
                {brew.rating_count > 0 && <span> ({brew.rating_count} review{brew.rating_count === 1 ? "" : "s"})</span>}
              </div>
            </div>

            {/* Add / Remove per campaign */}
            <div className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#37F2D1] mb-2">
                Add to campaign
              </h2>
              {!userId ? (
                <p className="text-[11px] text-slate-500 italic">Sign in to install this brew.</p>
              ) : campaigns.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">You aren't GM'ing any campaigns yet.</p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                  {campaigns.map((c) => {
                    const joinRow = installedRowByCampaign.get(c.id);
                    const isInstalled = !!joinRow;
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-2 bg-[#050816] border border-slate-800 rounded-lg px-2 py-1.5"
                      >
                        {c.banner_url ? (
                          <img src={c.banner_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-[#37F2D1]/20 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{c.title || "Untitled"}</div>
                          <div className="text-[10px] text-slate-400 truncate">{c.system || ""}</div>
                        </div>
                        {isInstalled ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={removeMutation.isPending}
                            onClick={() => removeMutation.mutate(joinRow.id)}
                            className="text-red-400 border-red-500/50 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={addMutation.isPending}
                            onClick={() => addMutation.mutate(c.id)}
                            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Install
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Creator block */}
            {(creatorProfile || brew.creator_id) && (
              <div className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-[#37F2D1] mb-2">
                  Created by
                </h2>
                <div className="flex items-center gap-3">
                  {creatorProfile?.avatar_url ? (
                    <img
                      src={creatorProfile.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#37F2D1]/20 border border-slate-700 flex items-center justify-center text-sm font-bold">
                      {(creatorProfile?.username || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {creatorProfile?.username || creatorProfile?.display_name || "Unknown"}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {brew.created_at ? new Date(brew.created_at).toLocaleDateString() : ""}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StarSelector({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const effective = hover || value;
  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="p-0.5"
          title={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star
            className={`w-5 h-5 ${n <= effective ? "text-[#fbbf24] fill-[#fbbf24]" : "text-slate-600"}`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewRow({ review }) {
  const { data: profile } = useQuery({
    queryKey: ["userProfile", review.user_id],
    queryFn: async () => {
      const rows = await base44.entities.UserProfile.filter({ user_id: review.user_id }).catch(() => []);
      return rows[0] || null;
    },
    enabled: !!review.user_id,
  });
  return (
    <div className="flex gap-3 bg-[#050816] border border-[#1e293b] rounded-lg p-2">
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-[#37F2D1]/20 flex-shrink-0 flex items-center justify-center text-xs font-bold">
          {(profile?.username || "?").slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white truncate">
            {profile?.username || profile?.display_name || "Anonymous"}
          </span>
          <span className="inline-flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i < (review.rating || 0) ? "text-[#fbbf24] fill-[#fbbf24]" : "text-slate-600"}`}
              />
            ))}
          </span>
          <span className="text-[10px] text-slate-500 ml-auto">
            {review.created_at ? new Date(review.created_at).toLocaleDateString() : ""}
          </span>
        </div>
        {review.comment && (
          <p className="text-[11px] text-slate-300 mt-1 whitespace-pre-wrap">{review.comment}</p>
        )}
      </div>
    </div>
  );
}

// Modifications preview — renders a human-readable summary for each
// content type. Falls back to a JSON pre-block for anything unknown.
function ModificationsPreview({ brew }) {
  const mods = brew.modifications || {};
  switch (brew.category) {
    case "custom_item":    return <ItemPreview mods={mods} />;
    case "custom_monster": return <MonsterPreview mods={mods} />;
    case "custom_spell":   return <SpellPreview mods={mods} />;
    case "custom_class_feature":
    case "custom_ability": return <ClassFeaturePreview mods={mods} />;
    default:               return <RuleModPreview mods={mods} />;
  }
}

function RuleModPreview({ mods }) {
  const rows = flattenObject(mods);
  if (rows.length === 0) {
    return <p className="text-[11px] text-slate-500 italic">No explicit overrides.</p>;
  }
  return (
    <ul className="space-y-1 text-[11px] font-mono">
      {rows.map(({ path, value }) => (
        <li key={path} className="flex items-start gap-2">
          <span className="text-slate-400 min-w-[160px]">{path}</span>
          <span className="text-[#37F2D1] break-all">{JSON.stringify(value)}</span>
        </li>
      ))}
    </ul>
  );
}

function flattenObject(obj, prefix = "") {
  if (!obj || typeof obj !== "object") return [];
  const out = [];
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      out.push(...flattenObject(val, path));
    } else {
      out.push({ path, value: val });
    }
  }
  return out;
}

function Row({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="text-slate-400 uppercase tracking-widest font-bold text-[10px] min-w-[100px]">{label}</span>
      <span className="text-white">{Array.isArray(value) ? value.join(", ") : String(value)}</span>
    </div>
  );
}

function ItemPreview({ mods }) {
  return (
    <div className="space-y-1">
      <Row label="Type" value={mods.type} />
      <Row label="Rarity" value={mods.rarity} />
      <Row label="Weight" value={mods.weight ? `${mods.weight} lb` : null} />
      <Row label="Cost" value={mods.cost ? `${mods.cost} gp` : null} />
      <Row label="Damage" value={mods.damage ? `${mods.damage} ${mods.damage_type || ""}`.trim() : null} />
      <Row label="Properties" value={Array.isArray(mods.properties) ? mods.properties : null} />
      <Row label="AC" value={mods.base_ac} />
      <Row label="Armor type" value={mods.armor_type} />
      <Row label="Attunement" value={mods.requires_attunement ? "Required" : null} />
      <Row label="Charges" value={mods.charges} />
      {mods.description && (
        <p className="text-xs text-slate-300 mt-2 whitespace-pre-wrap">{mods.description}</p>
      )}
    </div>
  );
}

function MonsterPreview({ mods }) {
  const abilities = mods.stats || mods.abilities || {};
  return (
    <div className="space-y-1">
      <Row label="Size / Type" value={`${mods.size || ""} ${mods.creature_type || mods.type || ""}`.trim()} />
      <Row label="Alignment" value={mods.alignment} />
      <Row label="CR" value={mods.cr || mods.challenge_rating} />
      <Row label="AC" value={mods.armor_class} />
      <Row label="HP" value={mods.hit_points} />
      <Row label="Speed" value={mods.speed} />
      {Object.keys(abilities).length > 0 && (
        <div className="grid grid-cols-6 gap-2 text-center mt-2">
          {["str","dex","con","int","wis","cha"].map((k) => (
            <div key={k} className="bg-[#050816] border border-[#1e293b] rounded p-1">
              <div className="text-[9px] uppercase tracking-widest text-slate-400">{k}</div>
              <div className="text-sm font-bold text-white">{abilities[k] ?? 10}</div>
            </div>
          ))}
        </div>
      )}
      <Row label="Resistances" value={mods.damage_resistances} />
      <Row label="Immunities" value={mods.damage_immunities} />
      <Row label="Vulnerabilities" value={mods.damage_vulnerabilities} />
      <Row label="Conditions" value={mods.condition_immunities} />
      <Row label="Senses" value={mods.senses} />
      <Row label="Languages" value={mods.languages} />
      {mods.description && (
        <p className="text-xs text-slate-300 mt-2 whitespace-pre-wrap">{mods.description}</p>
      )}
      {Array.isArray(mods.actions) && mods.actions.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest text-[#37F2D1] font-bold">Actions</div>
          {mods.actions.map((a, i) => (
            <div key={i} className="bg-[#050816] border border-[#1e293b] rounded p-2">
              <div className="text-xs font-bold text-white">{a.name || "Unnamed action"}</div>
              {(a.attack_bonus !== null && a.attack_bonus !== undefined && a.attack_bonus !== "") && (
                <div className="text-[10px] text-slate-400">+{a.attack_bonus} to hit{a.reach ? ` · ${a.reach}` : ""}</div>
              )}
              {a.damage && (
                <div className="text-[10px] text-slate-400">{a.damage} {a.damage_type || ""}</div>
              )}
              {a.description && (
                <p className="text-[11px] text-slate-300 mt-1 whitespace-pre-wrap">{a.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SpellPreview({ mods }) {
  return (
    <div className="space-y-1">
      <Row label="Level" value={`${mods.level === 0 ? "Cantrip" : `Level ${mods.level}`} ${mods.school ? `· ${mods.school}` : ""}`.trim()} />
      <Row label="Casting time" value={mods.casting_time} />
      <Row label="Range" value={mods.range} />
      <Row label="Components" value={mods.components} />
      <Row label="Duration" value={mods.duration} />
      <Row label="Classes" value={Array.isArray(mods.classes) ? mods.classes : null} />
      <Row label="Effect" value={mods.effect_type} />
      <Row label="Damage" value={mods.damage ? `${mods.damage} ${mods.damage_type || ""}`.trim() : null} />
      <Row label="Healing" value={mods.healing} />
      <Row label="Save" value={mods.save} />
      <Row label="Upcast" value={mods.upcast_per_level} />
      {mods.description && (
        <p className="text-xs text-slate-300 mt-2 whitespace-pre-wrap">{mods.description}</p>
      )}
      {mods.higher_level && (
        <div className="mt-2">
          <div className="text-[10px] uppercase tracking-widest text-[#37F2D1] font-bold mb-1">At Higher Levels</div>
          <p className="text-xs text-slate-300 whitespace-pre-wrap">{mods.higher_level}</p>
        </div>
      )}
    </div>
  );
}

function ClassFeaturePreview({ mods }) {
  return (
    <div className="space-y-1">
      <Row label="Type" value={mods.type} />
      <Row label="Class" value={mods.class} />
      <Row label="Level" value={mods.level} />
      <Row label="Cost" value={mods.cost} />
      <Row label="Uses" value={mods.uses} />
      <Row label="Recharge" value={mods.recharge} />
      <Row label="Effect" value={mods.effect_type} />
      <Row label="Resolution" value={mods.resolution} />
      <Row label="Damage" value={mods.damage_dice ? `${mods.damage_dice} ${mods.damage_type || ""}`.trim() : null} />
      <Row label="Healing" value={mods.healing_dice} />
      <Row label="Save" value={mods.save_ability || mods.condition_save} />
      <Row label="Condition" value={mods.condition_applied} />
      <Row label="Resource" value={mods.resource_restored ? `${mods.resource_restored}${mods.resource_amount ? ` (${mods.resource_amount})` : ""}` : null} />
      {mods.description && (
        <p className="text-xs text-slate-300 mt-2 whitespace-pre-wrap">{mods.description}</p>
      )}
    </div>
  );
}
