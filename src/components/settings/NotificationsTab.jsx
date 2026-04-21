import React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/AuthContext";
import { patchNotifications, getUserSettings } from "@/lib/userSettings";
import { Row, SectionHeader } from "@/pages/Settings";

/**
 * Settings → Notifications.
 *
 * Writes to `user_profiles.notification_preferences` under two
 * buckets: `email` (outbound newsletter / transactional) and `inApp`
 * (the sidebar badge dot + sound). The email delivery path isn't
 * fully wired yet — these toggles are intentionally persisted early
 * so the email service can key its send/suppress decisions off them
 * the moment it goes live.
 */
export default function NotificationsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: state = { notifications: {} } } = useQuery({
    queryKey: ["userSettings", user?.id],
    queryFn: () => getUserSettings(user.id),
    enabled: !!user?.id,
  });
  const email = state.notifications.email || {};
  const inApp = state.notifications.inApp || {};

  const save = useMutation({
    mutationFn: ({ bucket, patch }) => patchNotifications(user.id, bucket, patch),
    onSuccess: () => {
      toast.success("Saved", { duration: 1200 });
      queryClient.invalidateQueries({ queryKey: ["userSettings", user?.id] });
    },
  });

  const emailToggle = (key, label, description) => (
    <Row key={key} label={label} description={description}>
      <Switch
        checked={email[key] !== false}
        onCheckedChange={(v) => save.mutate({ bucket: "email", patch: { [key]: v } })}
      />
    </Row>
  );

  const inAppToggle = (key, label, description) => (
    <Row key={key} label={label} description={description}>
      <Switch
        checked={inApp[key] !== false}
        onCheckedChange={(v) => save.mutate({ bucket: "inApp", patch: { [key]: v } })}
      />
    </Row>
  );

  return (
    <>
      <SectionHeader
        title="Email notifications"
        subtitle="What lands in your inbox."
      />
      {emailToggle("friendRequests",  "Friend requests",                  "Someone sent you a friend request.")}
      {emailToggle("forumReplies",    "Forum replies to your threads",    "A new reply lands on a thread you started.")}
      {emailToggle("tavernSold",      "Tavern item sold",                 "A Tavern listing of yours earns a sale.")}
      {emailToggle("guildActivity",   "Guild activity",                   "Big events in your guild — new members, Hub changes, etc.")}
      {emailToggle("newsletter",      "Guildstew announcements",          "Monthly newsletter plus occasional launches. Off by default.")}

      <SectionHeader title="In-app notifications" subtitle="Inside Guildstew itself." />
      {inAppToggle("badgeDot", "Notification dots",       "Red dots on sidebar items when something needs attention.")}
      {inAppToggle("sound",    "Sound on notifications",  "Plays a short chime when a new notification arrives.")}
    </>
  );
}
