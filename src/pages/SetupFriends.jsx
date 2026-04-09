import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SetupFriends() {
  const userEmails = [
    "chrisjbrink@gmail.com",
    "bhaze813@gmail.com",
    "itsmeboky@aetherianstudios.com"
  ];

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const users = allUsers.filter(u => userEmails.includes(u.email));
      
      if (users.length < 3) {
        throw new Error(`Only found ${users.length} users out of 3`);
      }

      const friendships = [];
      for (let i = 0; i < users.length; i++) {
        for (let j = i + 1; j < users.length; j++) {
          friendships.push({
            user_id: users[i].id,
            friend_id: users[j].id,
            status: 'accepted'
          });
          friendships.push({
            user_id: users[j].id,
            friend_id: users[i].id,
            status: 'accepted'
          });
        }
      }

      for (const friendship of friendships) {
        await base44.entities.Friend.create(friendship);
      }

      const achievements = [
        { title: "One Crit Wonder", description: "Rolled your first natural 20", icon_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='70'%3E🎲%3C/text%3E%3C/svg%3E", rarity: "common" },
        { title: "Critical Failure", description: "Rolled three nat 1s in a single session", icon_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='70'%3E💀%3C/text%3E%3C/svg%3E", rarity: "rare" },
        { title: "Murder Hobo", description: "Solved every problem with violence", icon_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='70'%3E⚔️%3C/text%3E%3C/svg%3E", rarity: "epic" },
        { title: "Loot Goblin", description: "Always first to check for treasure", icon_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='70'%3E💰%3C/text%3E%3C/svg%3E", rarity: "common" },
        { title: "Rule Lawyer", description: "Corrected the DM 10+ times", icon_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='70'%3E📜%3C/text%3E%3C/svg%3E", rarity: "legendary" },
        { title: "Forever DM", description: "GM'd 50+ sessions", icon_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='70'%3E🎭%3C/text%3E%3C/svg%3E", rarity: "epic" },
        { title: "Character Graveyard", description: "Lost 5 characters to death", icon_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='70'%3E⚰️%3C/text%3E%3C/svg%3E", rarity: "rare" },
        { title: "That Guy", description: "Derailed the campaign... spectacularly", icon_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='70'%3E🤪%3C/text%3E%3C/svg%3E", rarity: "legendary" },
        { title: "Bard Things", description: "Successfully seduced the dragon", icon_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='70'%3E💋%3C/text%3E%3C/svg%3E", rarity: "legendary" },
        { title: "TPK Survivor", description: "Only survivor of a total party kill", icon_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='70'%3E🩸%3C/text%3E%3C/svg%3E", rarity: "epic" },
        { title: "Min-Maxer", description: "Optimized character to perfection", icon_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='70'%3E📊%3C/text%3E%3C/svg%3E", rarity: "rare" },
        { title: "Roleplay Royalty", description: "Stayed in character all session", icon_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='70'%3E👑%3C/text%3E%3C/svg%3E", rarity: "common" },
        { title: "Dice Hoarder", description: "Own 20+ sets of dice", icon_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='70'%3E🎲%3C/text%3E%3C/svg%3E", rarity: "common" },
        { title: "Table Flipper", description: "Rage quit mid-session", icon_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='70'%3E🤬%3C/text%3E%3C/svg%3E", rarity: "legendary" },
        { title: "Snack Provider", description: "Brought snacks to 10 sessions", icon_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='75' font-size='70'%3E🍕%3C/text%3E%3C/svg%3E", rarity: "common" }
      ];

      for (const user of users) {
        const userAchievements = achievements.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 8) + 5);
        for (const ach of userAchievements) {
          await base44.entities.Achievement.create({
            ...ach,
            user_id: user.id,
            earned_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }

      return { users, friendships, achievements };
    },
    onSuccess: (data) => {
      toast.success(`Setup complete! Created ${data.friendships.length} friendships and random achievements`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-[#2A3441] rounded-2xl p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Setup Test Data</h1>
        <p className="text-gray-400 mb-8">
          This will create friend connections and achievements for:
          <br />• chrisjbrink@gmail.com
          <br />• bhaze813@gmail.com
          <br />• itsmeboky@aetherianstudios.com
        </p>
        <Button
          onClick={() => setupMutation.mutate()}
          disabled={setupMutation.isPending}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] w-full"
        >
          {setupMutation.isPending ? 'Setting up...' : 'Setup Friends & Achievements'}
        </Button>
        {setupMutation.isSuccess && (
          <p className="mt-4 text-green-400">✅ Setup complete!</p>
        )}
      </div>
    </div>
  );
}