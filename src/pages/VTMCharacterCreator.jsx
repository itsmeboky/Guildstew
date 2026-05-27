// Thin page shell for the VTM character creator. Mirrors
// PathfinderCharacterCreator.jsx — reads URL params, supplies
// the user identity to the pack, and saves the resulting payload
// to the characters table on EMBRACE.
//
// Admin-only pre-launch gate: World of Darkness / Paradox
// licensing isn't closed yet, so the route redirects non-admin
// users home. When the license ships, replace the redirect with
// the normal in-creator subscription tier limit check (mirrors
// what CharacterCreator.jsx already does for the 5e flow).

import React, { Suspense } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useSubscription } from '@/lib/SubscriptionContext';
import { isAdminUser } from '@/lib/isAdmin';
import { createPageUrl } from '@/utils';
import { CharacterCreatorFlow } from '@/game-packs/vtm';

export default function VTMCharacterCreator() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const sub = useSubscription();
  const [saving, setSaving] = React.useState(false);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#03020a] flex items-center justify-center">
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, color: '#22d3ee', letterSpacing: '0.4em',
          textTransform: 'uppercase',
        }}>
          Awakening…
        </p>
      </div>
    );
  }

  // Pre-launch admin-only gate. Once licensing closes this block
  // is replaced with the standard tier-limit check.
  if (!authUser || !isAdminUser(authUser)) {
    return <Navigate to="/" replace />;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('campaignId');
  const returnTo = urlParams.get('returnTo');

  const handleComplete = async (characterData) => {
    if (!authUser) {
      toast.error('Not signed in', { description: 'Please sign in to save your character.' });
      return;
    }
    // Tier limit defense in depth — even though the dispatcher
    // (CreateCharacterDialog) checks this earlier, save-side
    // enforcement keeps a tampered URL from sneaking past.
    const limit = sub?.maxCharacters;
    if (Number.isFinite(limit)) {
      const existing = await base44.entities.Character
        .filter({ created_by: authUser.email });
      if (existing.length >= limit) {
        toast.error(`You've reached your ${limit} character limit. Upgrade to create more!`);
        navigate(createPageUrl('Settings') + '?tab=subscription');
        throw new Error('character_limit_reached');
      }
    }

    setSaving(true);
    try {
      // System-specific blob lives in `system_data`. Flat columns
      // (name, level, game_pack, created_by, user_id) match what
      // pf2e + d&d 5e write so reads through character_library
      // and characterMedia helpers work without per-pack branches.
      // VTM has no level concept at creation — start at 1 so the
      // library card has something to render.
      const created = await base44.entities.Character.create({
        game_pack: 'world_of_darkness',
        name: characterData.name || 'Unnamed Childe',
        level: 1,
        created_by: authUser.email,
        user_id: authUser.id,
        // Stash portrait + token at the top of system_data so
        // characterMedia.getCharacterPortraitUrl / getCharacterTokenUrl
        // find them without per-pack code. The matching {portrait,
        // token}_{position,zoom} are the Step I adjuster output —
        // the library left sidebar and the VTM CharacterDetail
        // apply the same translate(...) scale(...) at render time so
        // the framing the player saw in the polaroid carries through.
        system_data: {
          ...characterData,
          portrait_url: characterData.portrait || null,
          token_url: characterData.token || null,
          portrait_position: characterData.portrait_position || null,
          portrait_zoom: characterData.portrait_zoom || null,
          token_position: characterData.token_position || null,
          token_zoom: characterData.token_zoom || null,
        },
      });

      toast.success('The Childe is bound to the night.', {
        description: `${created?.name || characterData.name || 'Your vampire'} is in your library.`,
      });

      if (returnTo) navigate(returnTo);
      else if (campaignId) navigate(createPageUrl(`CampaignView?id=${campaignId}`));
      else navigate(createPageUrl('CharacterLibrary'));
    } catch (err) {
      console.error('VTM Character.create failed:', err);
      toast.error('The Embrace failed', {
        description: err?.message || 'Unknown error — check console.',
      });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#03020a] flex items-center justify-center">
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11, color: '#22d3ee', letterSpacing: '0.4em',
            textTransform: 'uppercase',
          }}>
            Awakening…
          </p>
        </div>
      }
    >
      <CharacterCreatorFlow
        userId={authUser.id}
        onComplete={handleComplete}
        saving={saving}
      />
    </Suspense>
  );
}
