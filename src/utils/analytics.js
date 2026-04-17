import { base44 } from '@/api/base44Client';

/**
 * Fire-and-forget analytics writer. Drops a row into
 * analytics_events for the given (userId, eventType) pair plus
 * whatever JSON metadata the caller passes in. Failures are
 * swallowed so a missing table or RLS denial never breaks UI.
 *
 * Common event_types: user_signup, user_login, profile_updated,
 * subscription_started, subscription_cancelled, character_created,
 * character_deleted, campaign_created, campaign_joined,
 * combat_started, combat_ended, homebrew_created,
 * homebrew_published, homebrew_downloaded, homebrew_rated,
 * ai_quick_pick_used, ai_generate_used, ai_portrait_generated,
 * friend_added, trade_completed, message_sent, ticket_created,
 * report_filed.
 */
export function trackEvent(userId, eventType, eventData = {}) {
  if (!userId || !eventType) return;
  try {
    base44.entities.AnalyticsEvent?.create({
      user_id: userId,
      event_type: eventType,
      event_data: {
        ...eventData,
        url: typeof window !== 'undefined' ? window.location.pathname : null,
      },
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Analytics error:', err?.message || err);
    });
  } catch (err) {
    // Swallow synchronous errors too (e.g. entity not registered).
    // eslint-disable-next-line no-console
    console.error('Analytics error:', err?.message || err);
  }
}
