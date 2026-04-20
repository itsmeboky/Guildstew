import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Flame, Star, ChefHat, Award, Check, MessageSquare,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import {
  getItem, getItemRatings, rateItem,
} from "@/lib/tavernClient";
import { listEntitlements } from "@/lib/tavernEntitlements";
import { getWalletBalance, getGuildWalletBalance } from "@/lib/spiceWallet";
import { formatSpice, applyDiscount } from "@/config/spiceConfig";
import { CATEGORY_LABEL, categoryIcon } from "@/config/tavernCategories";
import PurchaseConfirmDialog from "@/components/tavern/PurchaseConfirmDialog";

/**
 * Item detail + purchase + rating dialog.
 *
 * Shows:
 *   - gallery (preview + extras),
 *   - creator / category / rating badges,
 *   - price with applied subscriber discount (original shown struck
 *     through so the discount is visible),
 *   - Buy button OR "Owned" indicator,
 *   - Rate & Review section once the item is owned, and
 *   - the existing reviews list.
 *
 * Guild members additionally get a "Buy with Guild Spice" path when
 * the guild wallet has enough and the wallet isn't spending-restricted
 * (or they're the guild leader / subscriber).
 */
export default function TavernItemDetailDialog({ item: itemProp, open, onClose, creatorName }) {
  const { user } = useAuth();
  const sub = useSubscription();
  const queryClient = useQueryClient();
  const [activeImage, setActiveImage] = useState(0);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: item } = useQuery({
    queryKey: ["tavernItem", itemProp?.id],
    queryFn: () => getItem(itemProp.id),
    enabled: !!itemProp?.id && open,
    initialData: itemProp,
  });

  const { data: wallet } = useQuery({
    queryKey: ["spiceWallet", user?.id],
    queryFn: () => getWalletBalance(user.id),
    enabled: !!user?.id,
  });

  const { data: guildWallet } = useQuery({
    queryKey: ["guildSpiceWallet", sub.guildOwnerId],
    queryFn: () => getGuildWalletBalance(sub.guildOwnerId),
    enabled: !!sub.guildOwnerId,
  });

  const { data: entitlements = [] } = useQuery({
    queryKey: ["tavernEntitlements", user?.id, sub.guildOwnerId],
    queryFn: () => listEntitlements(user.id, { currentGuildId: sub.guildOwnerId }),
    enabled: !!user?.id,
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ["tavernRatings", item?.id],
    queryFn: () => getItemRatings(item.id),
    enabled: !!item?.id && open,
  });

  const entitlement = useMemo(() => {
    if (!item) return null;
    return entitlements.find((e) => e.item_id === item.id) || null;
  }, [entitlements, item]);
  const owned = !!entitlement;
  const ownedSource = entitlement?.source; // 'personal' | 'guild'

  const myRating = useMemo(() => {
    if (!item || !user) return null;
    return ratings.find((r) => r.user_id === user.id) || null;
  }, [ratings, item, user]);

  // Seed the rating form with the user's last submission so
  // re-rating is a tweak, not a restart.
  React.useEffect(() => {
    if (myRating) {
      setRatingValue(myRating.rating);
      setReviewText(myRating.review || "");
    } else {
      setRatingValue(5);
      setReviewText("");
    }
  }, [myRating?.id]);

  const discounted = item ? applyDiscount(item.price, sub.tier) : 0;
  const hasDiscount = item ? discounted < item.price : false;
  const avgRating = item?.rating_count > 0 ? item.rating_sum / item.rating_count : 0;

  const submitRating = useMutation({
    mutationFn: async () => {
      const r = await rateItem({
        userId: user.id,
        itemId: item.id,
        rating: ratingValue,
        review: reviewText.trim(),
      });
      if (!r.success) throw new Error(r.reason || "Rating failed");
    },
    onSuccess: () => {
      toast.success("Thanks for the review!");
      queryClient.invalidateQueries({ queryKey: ["tavernRatings", item.id] });
      queryClient.invalidateQueries({ queryKey: ["tavernItem", item.id] });
      queryClient.invalidateQueries({ queryKey: ["tavernItems"] });
    },
    onError: (err) => toast.error(err?.message || "Rating failed"),
  });

  if (!item) return null;

  const gallery = [item.preview_image_url, ...(item.preview_images || [])].filter(Boolean);
  const CatIcon = categoryIcon(item.category);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <CatIcon className="w-5 h-5 text-amber-400" />
            {item.name}
            {item.is_official && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-orange-600 text-white">
                <ChefHat className="w-3 h-3" /> House Special
              </span>
            )}
            {item.is_featured && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500 text-amber-950">
                <Award className="w-3 h-3" /> Chef's Choice
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            by <span className="text-[#37F2D1]">{creatorName || "Unknown"}</span> · {CATEGORY_LABEL[item.category] || item.category}
          </DialogDescription>
        </DialogHeader>

        {/* Gallery */}
        <div className="space-y-2">
          <div className="h-64 bg-[#050816] border border-slate-700 rounded-lg overflow-hidden flex items-center justify-center">
            {gallery.length > 0 ? (
              <img src={gallery[activeImage]} className="w-full h-full object-contain" alt={item.name} />
            ) : (
              <CatIcon className="w-16 h-16 text-slate-700" />
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded border-2 overflow-hidden flex-shrink-0 ${
                    i === activeImage ? "border-amber-400" : "border-slate-700"
                  }`}
                >
                  <img src={src} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Description + rating */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
              <span className="text-slate-500">({item.rating_count || 0})</span>
            </span>
            <span className="text-slate-500">· {formatSpice(item.purchase_count || 0)} sold</span>
          </div>
          {item.description && (
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{item.description}</p>
          )}
          {(item.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((t, i) => (
                <span key={i} className="text-[10px] bg-[#050816] border border-slate-700 text-slate-400 rounded px-2 py-0.5">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price + buy */}
        <div className="bg-[#050816] border border-amber-600/30 rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-2xl font-black text-amber-200 flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              {formatSpice(discounted)}
              {hasDiscount && (
                <span className="text-sm text-slate-500 line-through ml-2">
                  {formatSpice(item.price)}
                </span>
              )}
            </p>
            <p className="text-[11px] text-slate-500">
              ~${(discounted / 250).toFixed(2)} USD
              {hasDiscount && <span className="text-emerald-400 ml-1">· subscriber discount applied</span>}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {owned ? (
              <span className={`inline-flex items-center gap-1 font-bold text-sm rounded px-3 py-2 ${
                ownedSource === "guild"
                  ? "bg-purple-600 text-white"
                  : "bg-emerald-600 text-white"
              }`}>
                <Check className="w-4 h-4" /> {ownedSource === "guild" ? "Guild-Owned" : "Owned"}
              </span>
            ) : (
              <Button
                onClick={() => setConfirmOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold"
              >
                Buy with Spice
              </Button>
            )}
          </div>
        </div>

        {/* Rate & review */}
        {owned && (
          <div className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-[#37F2D1] flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> {myRating ? "Your Review" : "Rate & Review"}
            </h3>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRatingValue(n)}
                  aria-label={`Rate ${n}`}
                >
                  <Star
                    className={`w-6 h-6 ${
                      n <= ratingValue ? "text-amber-400 fill-amber-400" : "text-slate-600"
                    }`}
                  />
                </button>
              ))}
            </div>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Optional review…"
              className="bg-[#050816] border-slate-700 text-white"
              rows={3}
            />
            <Button
              onClick={() => submitRating.mutate()}
              disabled={submitRating.isPending}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
            >
              {submitRating.isPending ? "Saving…" : myRating ? "Update Review" : "Submit Review"}
            </Button>
          </div>
        )}

        {/* Existing ratings */}
        {ratings.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold">Reviews</h3>
            {ratings.slice(0, 20).map((r) => (
              <div key={r.id} className="bg-[#050816] border border-slate-800 rounded p-3">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`w-3.5 h-3.5 ${n <= r.rating ? "text-amber-400 fill-amber-400" : "text-slate-700"}`}
                    />
                  ))}
                  <span className="text-[11px] text-slate-500 ml-2">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.review && <p className="text-sm text-slate-300 whitespace-pre-wrap">{r.review}</p>}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>

      <PurchaseConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        item={item}
        buyer={user}
        buyerTier={sub.tier}
        guildOwnerId={sub.guildOwnerId}
      />
    </Dialog>
  );
}
