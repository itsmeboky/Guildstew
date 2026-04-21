import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { SubscriptionProvider } from '@/lib/SubscriptionContext';
import { PresenceProvider } from '@/lib/PresenceContext';
import LegalReconsentGate from '@/components/legal/LegalReconsentGate';
import ThemeApplier from '@/lib/ThemeApplier';
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
        <Route path="/Signup" element={<Pages.Signup />} />
        <Route path="/ResetPassword" element={<Pages.ResetPassword />} />
        <Route path="/VerifyEmail" element={<Pages.VerifyEmail />} />
        <Route path="/Terms" element={<Pages.Terms />} />
        <Route path="/Privacy" element={<Pages.Privacy />} />
        <Route path="/EULA" element={<Pages.EULA />} />
        <Route path="/Cookies" element={<Pages.Cookies />} />
        <Route path="/PrivacySummary" element={<Pages.PrivacySummary />} />
        <Route path="*" element={<Pages.Landing />} />
      </Routes>
    );
  }

  return (
    <LegalReconsentGate>
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      <Route path="/blog" element={
        <LayoutWrapper currentPageName="Blog">
          {Pages.Blog ? <Pages.Blog /> : <PageNotFound />}
        </LayoutWrapper>
      } />
      <Route path="/blog/:slug" element={
        <LayoutWrapper currentPageName="BlogPost">
          {Pages.BlogPost ? <Pages.BlogPost /> : <PageNotFound />}
        </LayoutWrapper>
      } />
      <Route path="/changelog" element={
        <LayoutWrapper currentPageName="Changelog">
          {Pages.Changelog ? <Pages.Changelog /> : <PageNotFound />}
        </LayoutWrapper>
      } />
      <Route path="/forums" element={
        <LayoutWrapper currentPageName="Forums">
          {Pages.Forums ? <Pages.Forums /> : <PageNotFound />}
        </LayoutWrapper>
      } />
      <Route path="/forums/:categorySlug" element={
        <LayoutWrapper currentPageName="ForumCategory">
          {Pages.ForumCategory ? <Pages.ForumCategory /> : <PageNotFound />}
        </LayoutWrapper>
      } />
      <Route path="/forums/:categorySlug/:threadSlug" element={
        <LayoutWrapper currentPageName="ForumThread">
          {Pages.ForumThread ? <Pages.ForumThread /> : <PageNotFound />}
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
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
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </PresenceProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App