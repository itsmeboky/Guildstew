import './App.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import GamePackListing from './pages/GamePackListing';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { SubscriptionProvider } from '@/lib/SubscriptionContext';
import { PresenceProvider } from '@/lib/PresenceContext';
import LegalReconsentGate from '@/components/legal/LegalReconsentGate';
import ThemeApplier from '@/lib/ThemeApplier';
import SettingsApplier from '@/lib/SettingsApplier';
import ColorBlindFilters from '@/components/layout/ColorBlindFilters';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { loadLanguageFonts } from '@/utils/languageFonts';

// Inject the @font-face rules for every D&D language TTF once per
// page load. The function is idempotent so hot reloads during dev
// don't stack up extra <style> blocks.
loadLanguageFonts();

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();
  const routeResetKeys = [location.pathname];

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // A small set of pages must remain reachable without a session so
    // users clicking a password-reset / email-verification link from
    // their inbox aren't bounced back to the login screen, and so the
    // legal-copy links on the signup form actually navigate.
    //
    // Everything else falls through to Login — this is what makes
    // `/` + any unknown path render the login screen for unauth
    // visitors instead of dumping them into onboarding.
    return (
      <Routes>
        <Route path="/Signup" element={<ErrorBoundary resetKeys={routeResetKeys}><Pages.Signup /></ErrorBoundary>} />
        <Route path="/ResetPassword" element={<ErrorBoundary resetKeys={routeResetKeys}><Pages.ResetPassword /></ErrorBoundary>} />
        <Route path="/VerifyEmail" element={<ErrorBoundary resetKeys={routeResetKeys}><Pages.VerifyEmail /></ErrorBoundary>} />
        <Route path="/Terms" element={<ErrorBoundary resetKeys={routeResetKeys}><Pages.Terms /></ErrorBoundary>} />
        <Route path="/Privacy" element={<ErrorBoundary resetKeys={routeResetKeys}><Pages.Privacy /></ErrorBoundary>} />
        <Route path="/EULA" element={<ErrorBoundary resetKeys={routeResetKeys}><Pages.EULA /></ErrorBoundary>} />
        <Route path="/Cookies" element={<ErrorBoundary resetKeys={routeResetKeys}><Pages.Cookies /></ErrorBoundary>} />
        <Route path="/PrivacySummary" element={<ErrorBoundary resetKeys={routeResetKeys}><Pages.PrivacySummary /></ErrorBoundary>} />
        <Route path="*" element={<ErrorBoundary resetKeys={routeResetKeys}><Pages.Landing /></ErrorBoundary>} />
      </Routes>
    );
  }

  return (
    <LegalReconsentGate>
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <ErrorBoundary resetKeys={routeResetKeys}>
            <MainPage />
          </ErrorBoundary>
        </LayoutWrapper>
      } />
      <Route path="/blog" element={
        <LayoutWrapper currentPageName="Blog">
          <ErrorBoundary resetKeys={routeResetKeys}>
            {Pages.Blog ? <Pages.Blog /> : <PageNotFound />}
          </ErrorBoundary>
        </LayoutWrapper>
      } />
      <Route path="/blog/:slug" element={
        <LayoutWrapper currentPageName="BlogPost">
          <ErrorBoundary resetKeys={routeResetKeys}>
            {Pages.BlogPost ? <Pages.BlogPost /> : <PageNotFound />}
          </ErrorBoundary>
        </LayoutWrapper>
      } />
      <Route path="/changelog" element={
        <LayoutWrapper currentPageName="Changelog">
          <ErrorBoundary resetKeys={routeResetKeys}>
            {Pages.Changelog ? <Pages.Changelog /> : <PageNotFound />}
          </ErrorBoundary>
        </LayoutWrapper>
      } />
      <Route path="/forums" element={
        <LayoutWrapper currentPageName="Forums">
          <ErrorBoundary resetKeys={routeResetKeys}>
            {Pages.Forums ? <Pages.Forums /> : <PageNotFound />}
          </ErrorBoundary>
        </LayoutWrapper>
      } />
      <Route path="/forums/:categorySlug" element={
        <LayoutWrapper currentPageName="ForumCategory">
          <ErrorBoundary resetKeys={routeResetKeys}>
            {Pages.ForumCategory ? <Pages.ForumCategory /> : <PageNotFound />}
          </ErrorBoundary>
        </LayoutWrapper>
      } />
      <Route path="/forums/:categorySlug/:threadSlug" element={
        <LayoutWrapper currentPageName="ForumThread">
          <ErrorBoundary resetKeys={routeResetKeys}>
            {Pages.ForumThread ? <Pages.ForumThread /> : <PageNotFound />}
          </ErrorBoundary>
        </LayoutWrapper>
      } />
      <Route path="/support/ticket" element={
        <LayoutWrapper currentPageName="SupportTicket">
          <ErrorBoundary resetKeys={routeResetKeys}>
            {Pages.SupportTicket ? <Pages.SupportTicket /> : <PageNotFound />}
          </ErrorBoundary>
        </LayoutWrapper>
      } />
      <Route path="/account/billing" element={
        <LayoutWrapper currentPageName="AccountBilling">
          <ErrorBoundary resetKeys={routeResetKeys}>
            {Pages.AccountBilling ? <Pages.AccountBilling /> : <PageNotFound />}
          </ErrorBoundary>
        </LayoutWrapper>
      } />
      <Route path="/guild/crest-builder" element={
        <LayoutWrapper currentPageName="GuildCrestBuilder">
          <ErrorBoundary resetKeys={routeResetKeys}>
            {Pages.GuildCrestBuilder ? <Pages.GuildCrestBuilder /> : <PageNotFound />}
          </ErrorBoundary>
        </LayoutWrapper>
      } />
      <Route path="/campaigns/find" element={
        <LayoutWrapper currentPageName="CampaignsFind">
          <ErrorBoundary resetKeys={routeResetKeys}>
            {Pages.CampaignsFind ? <Pages.CampaignsFind /> : <PageNotFound />}
          </ErrorBoundary>
        </LayoutWrapper>
      } />
      <Route path="/tavern/packs/:slug" element={
        <ErrorBoundary resetKeys={routeResetKeys}>
          <GamePackListing />
        </ErrorBoundary>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <ErrorBoundary resetKeys={routeResetKeys}>
                <Page />
              </ErrorBoundary>
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<ErrorBoundary resetKeys={routeResetKeys}><PageNotFound /></ErrorBoundary>} />
    </Routes>
    </LegalReconsentGate>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <SubscriptionProvider>
          <PresenceProvider>
            <Router>
              <NavigationTracker />
              <ThemeApplier />
              <SettingsApplier />
              <ColorBlindFilters />
              <AuthenticatedApp />
            </Router>
          </PresenceProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App