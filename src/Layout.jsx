import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Play, Users, Trophy, PieChart, Settings, Beer, LogOut, Plus, Radio, UserPlus, Search, ChevronDown, ChevronRight, CreditCard, Palette, MessageSquare, FileText, HelpCircle, Upload, ShoppingBag, DollarSign, AlertCircle, BookOpen, Menu, Sparkles, Globe, UsersIcon, Clock, Scroll, Wand2, Wrench, Church, Skull, Flower2, Crown, Shield, Calendar as CalendarIcon, Layers, NotebookPen } from "lucide-react";
import ChatPanel from "@/components/chat/ChatPanel";
import SessionReminderNotification from "@/components/notifications/SessionReminderNotification";
import DiceRoller from "@/components/dice/DiceRoller";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useSubscription } from "@/lib/SubscriptionContext";
import { useMyPresence } from "@/lib/PresenceContext";
import { StatusPicker } from "@/components/presence/StatusDot";

function NavStatusPicker() {
  // Manual status picker next to the TierBadge so the user can
  // flip online / away / DND / offline on a whim.
  const { status, setStatus } = useMyPresence();
  return <StatusPicker current={status} onChange={setStatus} />;
}

function LegalFooter() {
  // Site-wide footer with the legal-doc links + copyright. Renders
  // at the bottom of every routed page (mounted inside <main>) so
  // users always have one click to the policies.
  return (
    <footer className="border-t border-slate-800 px-6 py-4 mt-12 text-center text-sm text-slate-500">
      <div className="flex justify-center gap-3 flex-wrap">
        <Link to="/PrivacySummary" className="hover:text-[#37F2D1]">How We Use Your Data</Link>
        <span className="text-slate-700">·</span>
        <Link to="/Privacy" className="hover:text-[#37F2D1]">Privacy Policy</Link>
        <span className="text-slate-700">·</span>
        <Link to="/Terms" className="hover:text-[#37F2D1]">Terms of Service</Link>
        <span className="text-slate-700">·</span>
        <Link to="/EULA" className="hover:text-[#37F2D1]">EULA</Link>
        <span className="text-slate-700">·</span>
        <Link to="/Cookies" className="hover:text-[#37F2D1]">Cookie Policy</Link>
      </div>
      <p className="mt-2 text-slate-600">
        © {new Date().getFullYear()} Aetherian Studios. All rights reserved.
      </p>
    </footer>
  );
}

function TierBadge() {
  // Small "⚔️ Adventurer" / "🛡️ Veteran" / "👑 Guild" badge that
  // sits next to the nav so the user always knows their tier.
  // Free users get nothing (no clutter).
  const sub = useSubscription();
  if (!sub.tierData?.badgeIcon || sub.tier === 'free') return null;
  return (
    <Link
      to={createPageUrl('Settings') + '?tab=subscription'}
      title={`${sub.tierData.name} subscription — manage billing`}
      className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider rounded-full px-2 py-1"
      style={{
        backgroundColor: `${sub.tierData.badgeColor}33`,
        color: sub.tierData.badgeColor,
        border: `1px solid ${sub.tierData.badgeColor}66`,
      }}
    >
      <span>{sub.tierData.badgeIcon}</span>
      <span>{sub.tierData.name}</span>
    </Link>
  );
}
import LazyImage from "@/components/ui/LazyImage";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(null);

  // Cross-component channel: any page (e.g. Friends) can dispatch a
  // custom event to open the chat panel with a specific conversation
  // pre-selected. The event carries { conversationId } as detail.
  React.useEffect(() => {
    const handler = (e) => {
      const cid = e.detail?.conversationId;
      if (cid) {
        setChatConversationId(cid);
        setIsChatOpen(true);
      }
    };
    window.addEventListener('open-chat-conversation', handler);
    return () => window.removeEventListener('open-chat-conversation', handler);
  }, []);
  const [isDiceRollerOpen, setIsDiceRollerOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    account: false,
    creator: false,
    community: false,
    support: false
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    initialData: null
  });

  // Sync user profile on mount
  React.useEffect(() => {
    // syncUserProfiles will be an Edge Function later — skip for now
  }, [user]);

  const { data: currentUserProfile } = useQuery({
    queryKey: ['currentUserProfile', user?.id],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: user?.id }).then(profiles => profiles[0]),
    enabled: !!user?.id,
    initialData: null
  });

  const { data: friendships } = useQuery({
    queryKey: ['friendships', user?.id],
    queryFn: async () => {
      const allFriendships = await base44.entities.Friend.list();
      return allFriendships.filter(f => 
        f.user_id === user?.id || f.friend_id === user?.id
      );
    },
    enabled: !!user,
    staleTime: 30000,
    initialData: []
  });

  const { data: achievements } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: () => base44.entities.Achievement.filter({ user_id: user?.id }),
    enabled: !!user,
    staleTime: 60000,
    initialData: []
  });

  const { data: sessionReminders } = useQuery({
    queryKey: ['sessionReminders', user?.id],
    queryFn: async () => {
      const reminders = await base44.entities.SessionReminder.filter({ user_id: user?.id, read: false });
      return reminders;
    },
    enabled: !!user,
    staleTime: 5000,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    initialData: []
  });

  const { data: campaignInvitations } = useQuery({
    queryKey: ['campaignInvitations', user?.id],
    queryFn: async () => {
      // Table column is invited_user_id, not user_id.
      const invites = await base44.entities.CampaignInvitation.filter({ invited_user_id: user?.id, status: 'pending' });
      return invites;
    },
    enabled: !!user?.id,
    staleTime: 10000,
    refetchInterval: 10000,
    initialData: []
  });

  const pendingRequestsCount = React.useMemo(() => 
    friendships.filter(f => f.friend_id === user?.id && f.status === 'pending').length,
    [friendships, user?.id]
  );
  
  const newAchievementsCount = React.useMemo(() => 
    achievements.filter(a => {
      const earnedDate = new Date(a.earned_at);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return earnedDate > dayAgo;
    }).length,
    [achievements]
  );

  const pendingInvitesCount = campaignInvitations?.length || 0;

  const [previousAchievementCount, setPreviousAchievementCount] = React.useState(0);
  const [previousFriendRequestCount, setPreviousFriendRequestCount] = React.useState(0);
  const [previousInviteCount, setPreviousInviteCount] = React.useState(0);
  const [previousReminderCount, setPreviousReminderCount] = React.useState(0);
  const [activeReminder, setActiveReminder] = React.useState(null);

  React.useEffect(() => {
    if (achievements.length > previousAchievementCount && previousAchievementCount > 0) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
      audio.play().catch(() => {});
    }
    setPreviousAchievementCount(achievements.length);
  }, [achievements.length, previousAchievementCount]);

  React.useEffect(() => {
    if (pendingRequestsCount > previousFriendRequestCount && previousFriendRequestCount > 0) {
      const audio = new Audio('https://static.wixstatic.com/mp3/5cdfd8_78ee0fc6dc864bd0a71286dfe3b48f54.wav');
      audio.play().catch(() => {});
    }
    setPreviousFriendRequestCount(pendingRequestsCount);
  }, [pendingRequestsCount, previousFriendRequestCount]);

  React.useEffect(() => {
    if (pendingInvitesCount > previousInviteCount && previousInviteCount > 0) {
      const audio = new Audio('https://static.wixstatic.com/mp3/5cdfd8_78ee0fc6dc864bd0a71286dfe3b48f54.wav');
      audio.play().catch(() => {});
    }
    setPreviousInviteCount(pendingInvitesCount);
  }, [pendingInvitesCount, previousInviteCount]);

  React.useEffect(() => {
    if (sessionReminders.length > previousReminderCount) {
      if (previousReminderCount > 0) {
        const audio = new Audio('https://static.wixstatic.com/mp3/5cdfd8_ecef91e6600f4b38b6fb7d3e0c0f8c24.wav');
        audio.volume = 0.7;
        audio.play().catch(() => {});
      }
      
      // Always show the latest unread reminder
      if (sessionReminders.length > 0) {
        setActiveReminder(sessionReminders[0]);
      }
    }
    setPreviousReminderCount(sessionReminders.length);
  }, [sessionReminders.length, previousReminderCount, sessionReminders]);

  // Aetherian / Guildstew staff emails pass the admin check
  // automatically, plus anyone listed explicitly in ADMIN_EMAILS.
  const isAetherianStaff = !!user?.email && (
    user.email.endsWith('@aetherianstudios.com') ||
    user.email.endsWith('@guildstew.com')
  );
  const isAdmin = isAetherianStaff || user?.email === 'itsmeboky@aetherianstudios.com';
  // `isCreator` retained for the creator-dashboard section further
  // down the sidebar; same gating as admin for now.
  const isCreator = isAdmin;

  const topNavItems = [
    ...(isAdmin ? [{ name: "ADMIN PANEL", path: createPageUrl("Admin") }] : []),
    { name: "YOUR PROFILE", path: createPageUrl("YourProfile"), badge: pendingRequestsCount + newAchievementsCount },
    { name: "CAMPAIGNS", path: createPageUrl("Campaigns"), badge: pendingInvitesCount },
    { name: "CHARACTER LIBRARY", path: createPageUrl("CharacterLibrary") },
    // Workshop hidden for now — commented out, not deleted, until the
    // page is ready for prime-time.
    // { name: "WORKSHOP", path: createPageUrl("Workshop") },
    { name: "BREWERY", path: createPageUrl("Brewery") },
  ];

  const isPlayMode = currentPageName === "WatchLive" || currentPageName === "Campaigns";
  const isCampaignGMMode = currentPageName === "CampaignGMPanel" || currentPageName === "CampaignPlayers" || currentPageName === "CampaignUpdates" || currentPageName === "CampaignArchives" || currentPageName === "CampaignStatistics" || currentPageName === "CampaignSettings" || currentPageName === "CampaignItems" || currentPageName === "CampaignNPCs" || currentPageName === "CampaignMaps" || currentPageName === "CampaignHomebrew";
  const isCampaignPlayerMode = currentPageName === "CampaignPlayerPanel";
  const isCampaignLobbyMode = currentPageName === "CampaignPanel";
  const isHomePage = currentPageName === "Home";
  const isWorldLorePage = currentPageName === "CampaignWorldLore";
  const isOnboarding = currentPageName === "Onboarding";

  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');

  // Fetch campaign if in campaign mode to check permissions
  const { data: currentCampaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then(campaigns => campaigns[0]),
    enabled: !!campaignId && (isCampaignGMMode || isCampaignPlayerMode),
    staleTime: 30000
  });

  const isGM = user?.id === currentCampaign?.game_master_id || currentCampaign?.co_dm_ids?.includes(user?.id);

  const playSidebarItems = [
    { name: "Create New", icon: Plus, path: createPageUrl("CreateCampaign") },
    { name: "Watch Live", icon: Radio, path: createPageUrl("WatchLive"), hasIndicator: true },
    { name: "Join Campaign", icon: UserPlus, path: createPageUrl("JoinCampaign"), badge: pendingInvitesCount },
    { name: "Search Campaign", icon: Search, path: createPageUrl("SearchCampaign") }
  ];

  // Build GM sidebar based on permissions
  const campaignGMSidebarItems = React.useMemo(() => {
    if (!currentCampaign) return [];
    
    // Campaign-home sidebar (campaign management / hub pages, NOT
    // the active session panel). Adventuring Party + Quick Notes
    // used to live here but moved into the GM session sidebar so the
    // hub stays focused on management. Friends / PIE Chart /
    // Achievements never belonged here — those are main-nav items.
    const items = [
      { name: "Player Management", icon: Users, path: createPageUrl("CampaignPlayers") + `?id=${campaignId}` },
      { name: "Campaign Updates", icon: FileText, path: createPageUrl("CampaignUpdates") + `?id=${campaignId}` },
      { name: "Campaign Archives", icon: FileText, path: createPageUrl("CampaignArchives") + `?id=${campaignId}` },
      { name: "Campaign Statistics", icon: PieChart, path: createPageUrl("CampaignStatistics") + `?id=${campaignId}` },
    ];
    // Only GMs / co-GMs see Campaign Settings.
    if (isGM) {
      items.push({ name: "Campaign Settings", icon: Settings, path: createPageUrl("CampaignSettings") + `?id=${campaignId}` });
    }

    return items;
  }, [currentCampaign, campaignId]);

  const campaignPlayerSidebarSections = [
    {
      id: 'character',
      title: 'Your Character',
      icon: Users,
      items: [
        { name: 'Notes', path: createPageUrl('PlayerNotes') + `?id=${campaignId}` },
        { name: 'Secrets', path: createPageUrl('PlayerSecrets') + `?id=${campaignId}` },
        { name: 'Inventory', path: createPageUrl('PlayerInventory') + `?id=${campaignId}` },
        { name: 'Spells', path: createPageUrl('PlayerSpells') + `?id=${campaignId}` },
        { name: 'Pets', path: createPageUrl('PlayerPets') + `?id=${campaignId}` }
      ]
    },
    {
      id: 'adventuring_party',
      title: 'Adventuring Party',
      icon: Users,
      // Single-link section — opens the shared party panel where the
      // player can read their own relationships + browse other
      // characters (with permission filtering applied in-page).
      path: createPageUrl('AdventuringParty') + `?id=${campaignId}`,
      single: true,
    }
  ];

  const campaignLobbySidebarItems = [
    { name: "Campaign Updates", icon: FileText, path: createPageUrl("CampaignUpdates") + `?id=${campaignId}` },
    { name: "Campaign Archives", icon: FileText, path: createPageUrl("CampaignArchives") + `?id=${campaignId}` },
    { name: "Achievements", icon: Trophy, path: createPageUrl("Achievements") },
    { name: "P.I.E. Chart", icon: PieChart, path: createPageUrl("PIEChart") }
  ];

  const defaultSidebarItems = [
    { name: "Friends", icon: Users, path: createPageUrl("Friends"), badge: pendingRequestsCount },
    { name: "Achievements", icon: Trophy, path: createPageUrl("Achievements"), badge: newAchievementsCount },
    { name: "P.I.E. Chart", icon: PieChart, path: createPageUrl("PIEChart") }
  ];

  const homeSidebarSections = [
    {
      id: 'account',
      title: 'Account',
      icon: CreditCard,
      items: [
        { name: 'Subscription', path: createPageUrl('Subscription') },
        { name: 'Guild Management', path: createPageUrl('GuildManagement') },
        { name: 'Billing & Payment', path: createPageUrl('Billing') },
        { name: 'Purchase History', path: createPageUrl('PurchaseHistory') },
        { name: 'Cancel Subscription', path: createPageUrl('CancelSubscription') }
      ]
    },
    ...(isCreator ? [{
      id: 'creator',
      title: 'Creator Dashboard',
      icon: Palette,
      items: [
        { name: 'Upload New', icon: Upload, path: createPageUrl('CreatorUpload') },
        { name: 'Products', icon: ShoppingBag, path: createPageUrl('CreatorProducts') },
        { name: 'Sales', icon: DollarSign, path: createPageUrl('CreatorSales') },
        { name: 'Analytics', icon: PieChart, path: createPageUrl('CreatorAnalytics') }
      ]
    }] : []),
    {
      id: 'community',
      title: 'Community',
      icon: Users,
      items: [
        { name: 'Join our Discord', path: 'https://discord.gg/939YBhYTk9', external: true },
        { name: 'Forum', path: createPageUrl('Forum') }
      ]
    },
    {
      id: 'support',
      title: 'Support',
      icon: HelpCircle,
      items: [
        { name: 'Documentation', path: createPageUrl('Documentation') },
        { name: 'FAQ', path: createPageUrl('FAQ') },
        { name: 'Report a Problem', path: createPageUrl('ReportProblem') }
      ]
    }
  ];

  const { data: worldLoreEntries = [] } = useQuery({
    queryKey: ['worldLoreEntries', campaignId],
    queryFn: () => base44.entities.WorldLoreEntry.filter({ campaign_id: campaignId }),
    enabled: !!campaignId && isWorldLorePage,
    initialData: []
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions', campaignId],
    queryFn: () => base44.entities.Region.filter({ campaign_id: campaignId }, 'order'),
    enabled: !!campaignId && isWorldLorePage,
    initialData: []
  });

  const worldLoreSections = React.useMemo(() => {
    const categories = [
      { id: 'cosmology', title: 'Cosmology & Origins', icon: Sparkles },
      { id: 'geography', title: 'Geography & Regions', icon: Globe },
      { id: 'cultures', title: 'Cultures & Peoples', icon: UsersIcon },
      { id: 'history', title: 'History & Timelines', icon: Clock },
      { id: 'myth', title: 'Myth & Legend', icon: Scroll },
      { id: 'magic', title: 'Magic & Arcana', icon: Wand2 },
      { id: 'technology', title: 'Technology & Craft', icon: Wrench },
      { id: 'religions', title: 'Religions & Organizations', icon: Church },
      { id: 'monsters', title: 'Monster Compendium', icon: Skull },
      { id: 'flora', title: 'Flora & Fauna', icon: Flower2 },
      { id: 'artifacts', title: 'Artifacts & Relics', icon: Crown },
      { id: 'political', title: 'Political Structure', icon: Shield },
      { id: 'calendar', title: 'Calendar & Time', icon: CalendarIcon },
      { id: 'misc', title: 'Guild Hall', icon: Layers }
    ];

    return categories.map(cat => {
      let subcategories = [];

      // For Geography, use Regions instead of subcategories
      if (cat.id === 'geography') {
        subcategories = regions.map(region => ({
          name: region.name,
          path: createPageUrl('CampaignWorldLore') + `?id=${campaignId}&category=${cat.id}&subcategory=${region.name}`
        }));
      } else {
        const subcategoriesSet = new Set();
        worldLoreEntries
          .filter(e => e.category === cat.id && e.subcategory)
          .forEach(e => subcategoriesSet.add(e.subcategory));

        subcategories = Array.from(subcategoriesSet).map(sub => ({
          name: sub,
          path: createPageUrl('CampaignWorldLore') + `?id=${campaignId}&category=${cat.id}&subcategory=${sub}`
        }));
      }

      return {
        ...cat,
        path: createPageUrl('CampaignWorldLore') + `?id=${campaignId}&category=${cat.id}`,
        items: subcategories,
        single: subcategories.length === 0
      };
    });
  }, [campaignId, worldLoreEntries, regions]);

  const sidebarItems = isCampaignGMMode 
    ? (isGM ? campaignGMSidebarItems : campaignLobbySidebarItems) 
    : (isCampaignLobbyMode ? campaignLobbySidebarItems : (isPlayMode ? playSidebarItems : defaultSidebarItems));
  const useSectionsLayout = isHomePage || isCampaignPlayerMode || isWorldLorePage;

  const isActivePath = (path) => location.pathname === path;

  const handleLogout = () => {
    base44.auth.logout();
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      const newState = { ...prev };
      // Close all other sections
      Object.keys(newState).forEach(key => {
        if (key !== sectionId) newState[key] = false;
      });
      // Toggle the clicked section
      newState[sectionId] = !prev[sectionId];
      return newState;
    });
  };

  // Font mode: read from localStorage (fast path) on mount, then
  // sync from the user's profile (persistent path) when it loads.
  // The CSS custom properties in index.css switch every font in the
  // app via the data-font-mode attribute on <html>.
  React.useEffect(() => {
    const stored = localStorage.getItem('gs-font-mode');
    const profileMode = user?.accessibility_dyslexic_font ? 'dyslexic' : null;
    const mode = stored || profileMode || 'default';
    document.documentElement.setAttribute('data-font-mode', mode);
    // Sync localStorage from profile on first load so they agree.
    if (profileMode && !stored) {
      localStorage.setItem('gs-font-mode', mode);
    }
  }, [user?.accessibility_dyslexic_font]);
  const isDarkMode = user?.accessibility_dark_mode !== false;

  useEffect(() => {
    if (user && !user.birthday && currentPageName !== "Onboarding") {
      navigate(createPageUrl("Onboarding"));
    }
  }, [user, currentPageName, navigate]);

  if (isOnboarding) {
    return <>{children}</>;
  }

  // For campaign pages with their own sidebar, don't render Layout wrapper
  if (currentPageName === "CampaignItems" || currentPageName === "CampaignNPCs" || currentPageName === "CampaignMaps" || currentPageName === "CampaignHomebrew") {
    return <>{children}</>;
  }
  // Admin dashboard has its own full-screen sidebar shell.
  if (currentPageName === "Admin") {
    return <>{children}</>;
  }
  // Adventuring Party panel has its own two-column shell.
  if (currentPageName === "AdventuringParty") {
    return <>{children}</>;
  }
  // Quick Notes panel is a single-column full-screen form.
  if (currentPageName === "QuickNotes") {
    return <>{children}</>;
  }
  // World Lore owns its own horizontal nav + landing grid and no
  // longer wants the Layout's old world-lore sidebar tree.
  if (currentPageName === "CampaignWorldLore") {
    return <>{children}</>;
  }
  // Auth-flow pages render without nav/sidebar so the user can finish
  // password reset / email verification without distractions. Legal
  // pages render chrome-less too so they're readable when reached
  // straight from the signup form without a session.
  if (
    currentPageName === "ResetPassword" ||
    currentPageName === "VerifyEmail" ||
    currentPageName === "Login" ||
    currentPageName === "Signup" ||
    (!user && (
      currentPageName === "Terms" ||
      currentPageName === "Privacy" ||
      currentPageName === "EULA" ||
      currentPageName === "Cookies" ||
      currentPageName === "PrivacySummary"
    ))
  ) {
    return <>{children}</>;
  }

  return (
    <div className={`min-h-screen ${isWorldLorePage ? 'text-white' : isDarkMode ? 'bg-[#1E2430] text-white' : 'bg-gray-50 text-gray-900'}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

        .world-lore-expanded .max-w-6xl {
          max-width: 90rem !important;
        }

        .world-lore-expanded .max-w-4xl {
          max-width: 72rem !important;
        }

        .ql-editor,
        .ql-editor p,
        .ql-editor span,
        .ql-editor div,
        .ql-editor li,
        .ql-editor blockquote {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          font-weight: 300 !important;
        }
        
        .ql-editor strong,
        .ql-editor b {
          font-weight: 600 !important;
        }
      `}</style>

      <Toaster position="top-right" expand={false} richColors />

      <header className={`${isDarkMode ? 'bg-[#FF5722]' : 'bg-[#FF5722]'} h-16 flex items-center justify-between px-6 relative z-20`}>
        <Link to={createPageUrl("Home")} className="flex items-center gap-3">
          <LazyImage 
            src="https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/branding/d93253ec3_image.png" 
            alt="Guildstew" 
            className="h-10 w-auto bg-transparent"
            objectFit="contain"
          />
        </Link>

        <nav className="flex items-center gap-8">
          {topNavItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`font-bold text-sm tracking-wide transition-colors relative ${
                isActivePath(item.path) ? "text-white" : "text-white/80 hover:text-white"
              }`}
            >
              {item.name}
              {item.badge > 0 && (
                <span className="absolute -top-2 -right-3 w-5 h-5 bg-[#37F2D1] rounded-full text-[#1E2430] text-xs flex items-center justify-center font-bold animate-pulse">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
          <NavStatusPicker />
          <TierBadge />

          <Link
            to={createPageUrl("TheTavern")}
            className="bg-[#FF5722] text-white px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-[#FF6B3D] transition-colors border-2 border-white"
          >
            <Beer className="w-4 h-4" />
            THE TAVERN
          </Link>
        </nav>
      </header>

      <div className="flex">
        <aside 
          className={`${sidebarCollapsed && isWorldLorePage ? 'w-[70px]' : 'w-[240px]'} ${
            isWorldLorePage 
              ? 'bg-gradient-to-br from-[#1E2430]/40 via-[#2A3441]/30 to-[#1E2430]/40 backdrop-blur-md border-r border-white/10' 
              : 'bg-[#2A3441] border-r border-gray-700'
          } min-h-[calc(100vh-4rem)] flex flex-col relative z-50 transition-all duration-300 ease-in-out`}
        >
          {isCampaignGMMode && currentCampaign ? (
            <Link
              to={createPageUrl("CampaignInvite") + `?id=${campaignId}`}
              className="bg-[#37F2D1] text-[#1E2430] font-bold text-lg px-6 py-4 flex items-center gap-3 hover:bg-[#2dd9bd] transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              INVITE PLAYERS
            </Link>
          ) : isCampaignPlayerMode ? (
            <button
              onClick={() => navigate(-1)}
              className="bg-[#37F2D1] text-[#1E2430] font-bold text-lg px-6 py-4 flex items-center gap-3 hover:bg-[#2dd9bd] transition-colors"
            >
              ← BACK
            </button>
          ) : isWorldLorePage ? (
            <Link
              to={createPageUrl("CampaignGMPanel") + `?id=${campaignId}`}
              className="bg-[#37F2D1] text-[#1E2430] font-bold text-lg px-6 py-4 flex items-center gap-3 hover:bg-[#2dd9bd] transition-colors"
            >
              <Play className={`w-5 h-5 fill-current ${sidebarCollapsed ? 'mx-auto' : ''}`} />
              {!sidebarCollapsed && 'START SESSION'}
            </Link>
          ) : (
            <Link
              to={createPageUrl("Campaigns")}
              className="bg-[#37F2D1] text-[#1E2430] font-bold text-lg px-6 py-4 flex items-center gap-3 hover:bg-[#2dd9bd] transition-colors"
            >
              <Play className="w-5 h-5 fill-current" />
              PLAY
            </Link>
          )}

          {/* Floating Collapse Button for World Lore */}
          {isWorldLorePage && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute -right-5 z-[60] bg-gradient-to-r from-[#1E2430]/60 to-[#2A3441]/60 backdrop-blur-md border border-white/10 hover:bg-[#37F2D1]/20 hover:border-[#37F2D1]/50 text-gray-300 hover:text-[#37F2D1] w-10 h-20 rounded-r-lg transition-all duration-300 group shadow-lg"
              style={{ top: 'calc(50% + 100px)', transform: 'translateY(-50%) translateX(50%)' }}
            >
              <div className="flex items-center justify-center h-full">
                <ChevronRight className={`w-5 h-5 transition-all duration-300 ${sidebarCollapsed ? 'rotate-180' : ''} group-hover:scale-110`} />
              </div>
            </button>
          )}

          <nav className="flex-1 pt-6 px-3 space-y-1 overflow-y-auto">
            {useSectionsLayout ? (
              (isWorldLorePage ? worldLoreSections : 
               isCampaignPlayerMode ? [...campaignPlayerSidebarSections, 
                { id: 'archives', title: 'Campaign Archives', icon: FileText, path: createPageUrl('CampaignArchives') + `?id=${campaignId}`, single: true },
                { id: 'pie', title: 'P.I.E. Chart', icon: PieChart, path: createPageUrl('PIEChart'), single: true }
              ] : homeSidebarSections).map((section) => {
                const isActive = isActivePath(section.path) || section.items?.some(item => isActivePath(item.path));

                return (
                <div key={section.id} className="mb-2">
                  {section.single ? (
                    <Link
                      to={section.path}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 group ${
                        isActivePath(section.path)
                          ? isWorldLorePage 
                            ? 'bg-[#37F2D1]/20 backdrop-blur-sm text-[#37F2D1] shadow-lg shadow-[#37F2D1]/20' 
                            : 'bg-[#37F2D1]/20 text-[#37F2D1]'
                          : isWorldLorePage
                            ? 'text-gray-400 hover:text-[#37F2D1] hover:bg-white/5 backdrop-blur-sm'
                            : isDarkMode ? 'text-white hover:bg-[#1E2430]/50' : 'text-gray-900 hover:bg-gray-100'
                      }`}
                      title={sidebarCollapsed && isWorldLorePage ? section.title : ''}
                    >
                      <section.icon className={`${sidebarCollapsed && isWorldLorePage ? 'w-5 h-5 mx-auto' : 'w-4 h-4'} transition-all duration-300 ${isActivePath(section.path) ? 'scale-110' : 'group-hover:scale-110'}`} />
                      {(!sidebarCollapsed || !isWorldLorePage) && <span className="text-sm font-semibold">{section.title}</span>}
                    </Link>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <Link
                          to={section.path}
                          onClick={() => {
                            if (section.items?.length > 0) {
                              setExpandedSections(prev => {
                                const newState = {};
                                Object.keys(prev).forEach(key => {
                                  newState[key] = false;
                                });
                                newState[section.id] = true;
                                return newState;
                              });
                            }
                          }}
                          className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 group ${
                            isActive
                              ? isWorldLorePage 
                                ? 'bg-[#37F2D1]/20 backdrop-blur-sm text-[#37F2D1] shadow-lg shadow-[#37F2D1]/20' 
                                : 'bg-[#37F2D1]/20 text-[#37F2D1]'
                              : isWorldLorePage
                                ? 'text-gray-400 hover:text-[#37F2D1] hover:bg-white/5 backdrop-blur-sm'
                                : isDarkMode ? 'text-white hover:bg-[#1E2430]/50' : 'text-gray-900 hover:bg-gray-100'
                          }`}
                          title={sidebarCollapsed && isWorldLorePage ? section.title : ''}
                        >
                          <section.icon className={`${sidebarCollapsed && isWorldLorePage ? 'w-5 h-5 mx-auto' : 'w-4 h-4'} transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                          {(!sidebarCollapsed || !isWorldLorePage) && <span className="text-sm font-semibold">{section.title}</span>}
                        </Link>
                        {section.items?.length > 0 && !sidebarCollapsed && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleSection(section.id);
                            }}
                            className={`px-2 py-2 rounded-lg transition-all duration-300 ${
                              isWorldLorePage
                                ? 'text-gray-400 hover:text-[#37F2D1] hover:bg-white/5 backdrop-blur-sm'
                                : isDarkMode ? 'text-white hover:bg-[#1E2430]/50' : 'text-gray-900 hover:bg-gray-100'
                            }`}
                          >
                            {expandedSections[section.id] ? (
                              <ChevronDown className="w-4 h-4 transition-transform duration-300" />
                            ) : (
                              <ChevronRight className="w-4 h-4 transition-transform duration-300" />
                            )}
                          </button>
                        )}
                      </div>

                      {expandedSections[section.id] && section.items?.length > 0 && !sidebarCollapsed && (
                        <div className="mt-1 ml-7 space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                          {section.items.map((item, idx) => {
                            if (item.external) {
                              return (
                                <a
                                  key={idx}
                                  href={item.path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 group ${
                                    isWorldLorePage
                                      ? 'text-gray-500 hover:text-gray-300'
                                      : isDarkMode ? 'text-gray-300 hover:bg-[#1E2430]/50' : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  {item.icon && <item.icon className="w-3 h-3 transition-transform duration-200 group-hover:scale-105" />}
                                  {item.name}
                                </a>
                              );
                            }
                            return (
                              <Link
                              key={idx}
                              to={item.path}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-300 group ${
                                isActivePath(item.path)
                                  ? isWorldLorePage
                                    ? 'bg-[#37F2D1]/10 backdrop-blur-sm text-[#37F2D1] shadow-md shadow-[#37F2D1]/10'
                                    : 'bg-[#37F2D1]/20 text-[#37F2D1]'
                                  : isWorldLorePage
                                    ? 'text-gray-500 hover:text-[#37F2D1] hover:bg-white/5 backdrop-blur-sm'
                                    : isDarkMode ? 'text-gray-300 hover:bg-[#1E2430]/50' : 'text-gray-700 hover:bg-gray-100'
                              }`}
                              >
                              {item.icon && <item.icon className="w-3 h-3 transition-transform duration-300 group-hover:scale-110" />}
                              {item.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
              })

            ) : (
              sidebarItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                    isActivePath(item.path)
                      ? "bg-[#37F2D1]/20 text-[#37F2D1]"
                      : isDarkMode ? "text-gray-300 hover:bg-[#1E2430]/50" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.name}</span>
                  {item.hasIndicator && (
                    <span className="w-2 h-2 bg-red-500 rounded-full ml-auto animate-pulse" />
                  )}
                  {item.badge > 0 && (
                    <span className="ml-auto w-5 h-5 bg-[#37F2D1] rounded-full text-[#1E2430] text-xs flex items-center justify-center font-bold animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))
            )}
          </nav>

          <div className={`px-4 pb-6 space-y-2 ${isWorldLorePage ? 'border-t border-white/10' : 'border-t border-gray-700/50'} pt-4`}>
            <Link
              to={createPageUrl("Settings")}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                isActivePath(createPageUrl("Settings"))
                  ? isWorldLorePage
                    ? "bg-[#37F2D1]/20 backdrop-blur-sm text-[#37F2D1] shadow-lg shadow-[#37F2D1]/20"
                    : "bg-[#37F2D1]/20 text-[#37F2D1]"
                  : isWorldLorePage
                    ? "text-gray-400 hover:text-[#37F2D1] hover:bg-white/5 backdrop-blur-sm"
                    : isDarkMode ? "text-gray-300 hover:bg-[#1E2430]/50" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Settings className={`${sidebarCollapsed && isWorldLorePage ? 'w-6 h-6 mx-auto' : 'w-4 h-4'} transition-all duration-300 group-hover:rotate-90 group-hover:scale-110`} />
              {(!sidebarCollapsed || !isWorldLorePage) && <span className="text-sm">Settings</span>}
            </Link>
            <button
              onClick={handleLogout}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 w-full group ${
                isWorldLorePage
                  ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10 backdrop-blur-sm'
                  : isDarkMode ? 'text-gray-300 hover:bg-red-500/20 hover:text-red-400' : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <LogOut className={`${sidebarCollapsed && isWorldLorePage ? 'w-6 h-6 mx-auto' : 'w-4 h-4'} transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110`} />
              {(!sidebarCollapsed || !isWorldLorePage) && <span className="text-sm">Logout</span>}
            </button>
          </div>
        </aside>

        <main className={`flex-1 relative transition-all duration-300 ${sidebarCollapsed && isWorldLorePage ? 'world-lore-expanded' : ''}`}>
          {children}
          <LegalFooter />
        </main>
      </div>

      <div className="fixed bottom-6 right-6 flex items-center gap-3 bg-[#2A3441] rounded-full p-2 shadow-lg z-30">
        <button
          onClick={() => {
            setIsChatOpen(!isChatOpen);
            // Clear the pending conversation when closing so re-opening
            // later doesn't jump to an old DM.
            if (isChatOpen) setChatConversationId(null);
          }}
          className="relative w-12 h-12 bg-[#FF5722] rounded-2xl rounded-br-sm flex items-center justify-center hover:bg-[#FF6B3D] transition-colors shadow-[0_4px_12px_rgba(255,87,34,0.5)]"
          title="Chat"
        >
          <MessageSquare className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => setIsDiceRollerOpen(!isDiceRollerOpen)}
          className="w-12 h-12 bg-[#37F2D1] rounded-full flex items-center justify-center hover:bg-[#2dd9bd] transition-colors overflow-hidden"
        >
          <LazyImage 
            src="https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/ui/4c2bdffd3_diceicon.png" 
            alt="Dice" 
            className="w-8 h-8 bg-transparent"
            objectFit="contain"
          />
        </button>
        </div>

      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatConversationId(null);
        }}
        initialConversationId={chatConversationId}
      />
      <DiceRoller 
        isOpen={isDiceRollerOpen} 
        onClose={() => setIsDiceRollerOpen(false)} 
        primaryColor={currentUserProfile?.profile_color_1 || "#FF5722"}
        secondaryColor={currentUserProfile?.profile_color_2 || "#8B5CF6"}
      />

      {activeReminder && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <SessionReminderNotification
            reminder={activeReminder}
            onDismiss={() => {
              setActiveReminder(null);
              // Mark reminder as read when dismissed
              base44.entities.SessionReminder.update(activeReminder.id, { read: true });
              queryClient.invalidateQueries({ queryKey: ['sessionReminders'] });
            }}
          />
        </div>
      )}
    </div>
  );
}