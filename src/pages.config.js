import Home from './pages/Home';
import YourProfile from './pages/YourProfile';
import CharacterLibrary from './pages/CharacterLibrary';
import Campaigns from './pages/Campaigns';
// Workshop is hidden for now — route registration is disabled below.
// import Workshop from './pages/Workshop';
import TheTavern from './pages/TheTavern';
import Friends from './pages/Friends';
import PIEChart from './pages/PIEChart';
import Settings from './pages/Settings';
import Achievements from './pages/Achievements';
import CharacterAnalytics from './pages/CharacterAnalytics';
import CreateCampaign from './pages/CreateCampaign';
import CampaignView from './pages/CampaignView';
import Landing from './pages/Landing';
import SetupFriends from './pages/SetupFriends';
import UserProfile from './pages/UserProfile';
import WatchLive from './pages/WatchLive';
import CharacterCreator from './pages/CharacterCreator';
import CampaignNPCs from './pages/CampaignNPCs';
import CampaignItems from './pages/CampaignItems';
import CampaignMaps from './pages/CampaignMaps';
import CampaignWorldLore from './pages/CampaignWorldLore';
import CampaignHomebrew from './pages/CampaignHomebrew';
import Onboarding from './pages/Onboarding';
import CampaignGMPanel from './pages/CampaignGMPanel';
import CampaignInvite from './pages/CampaignInvite';
import JoinCampaign from './pages/JoinCampaign';
import CampaignPlayers from './pages/CampaignPlayers';
import CampaignUpdates from './pages/CampaignUpdates';
import CampaignArchives from './pages/CampaignArchives';
import CampaignSettings from './pages/CampaignSettings';
import CampaignStatistics from './pages/CampaignStatistics';
import BackendAdmin from './pages/BackendAdmin';
import DiceCalibrator from './pages/DiceCalibrator';
import CampaignPanel from './pages/CampaignPanel';
import Brewery from './pages/Brewery';
import Privacy from './pages/Privacy';
import Cookies from './pages/Cookies';
import Terms from './pages/Terms';
import EULA from './pages/EULA';
import PrivacySummary from './pages/PrivacySummary';
import Admin from './pages/Admin';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Signup from './pages/Signup';
import AdventuringParty from './pages/AdventuringParty';
import QuickNotes from './pages/QuickNotes';
import { GuardedGMPanel, GuardedPlayerPanel } from './pages/_desktopGuards.jsx';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "YourProfile": YourProfile,
    "CharacterLibrary": CharacterLibrary,
    "Campaigns": Campaigns,
    // "Workshop": Workshop,
    "TheTavern": TheTavern,
    "Friends": Friends,
    "PIEChart": PIEChart,
    "Settings": Settings,
    "Achievements": Achievements,
    "CharacterAnalytics": CharacterAnalytics,
    "CreateCampaign": CreateCampaign,
    "CampaignView": CampaignView,
    "Landing": Landing,
    "SetupFriends": SetupFriends,
    "UserProfile": UserProfile,
    "WatchLive": WatchLive,
    "CharacterCreator": CharacterCreator,
    "CampaignNPCs": CampaignNPCs,
    "CampaignItems": CampaignItems,
    "CampaignMaps": CampaignMaps,
    "CampaignWorldLore": CampaignWorldLore,
    "CampaignHomebrew": CampaignHomebrew,
    "Onboarding": Onboarding,
    "CampaignGMPanel": CampaignGMPanel,
    "CampaignInvite": CampaignInvite,
    "JoinCampaign": JoinCampaign,
    "CampaignPlayers": CampaignPlayers,
    "CampaignUpdates": CampaignUpdates,
    "CampaignArchives": CampaignArchives,
    "CampaignSettings": CampaignSettings,
    "CampaignStatistics": CampaignStatistics,
    "CampaignPlayerPanel": GuardedPlayerPanel,
    "GMPanel": GuardedGMPanel,
    "BackendAdmin": BackendAdmin,
    "DiceCalibrator": DiceCalibrator,
    "CampaignPanel": CampaignPanel,
    "Brewery": Brewery,
    "Privacy": Privacy,
    "Cookies": Cookies,
    "Terms": Terms,
    "EULA": EULA,
    "PrivacySummary": PrivacySummary,
    "Admin": Admin,
    "ResetPassword": ResetPassword,
    "VerifyEmail": VerifyEmail,
    // `/Login` aliases the Landing component so the default
    // unauthenticated route lands on a login page by name, not a
    // mystery alias.
    "Login": Landing,
    "Signup": Signup,
    "AdventuringParty": AdventuringParty,
    "QuickNotes": QuickNotes,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};