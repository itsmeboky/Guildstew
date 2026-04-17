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
    return (
      <Routes>
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