import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import BottomNav from './components/BottomNav';

const Auth = lazy(() => import('./pages/Auth'));
const ProfileCompletion = lazy(() => import('./pages/ProfileCompletion'));
const Home = lazy(() => import('./pages/Home'));
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const MapNavigation = lazy(() => import('./pages/MapNavigation'));
const History = lazy(() => import('./pages/History'));
const GuardianTrack = lazy(() => import('./pages/GuardianTrack'));

function AnimatedRoutes({ isAuthenticated, profileCompleted }: { isAuthenticated: boolean; profileCompleted: boolean }) {
  const location = useLocation();

  // If not authenticated, show auth page
  if (!isAuthenticated) {
    return (
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="*" element={<Auth />} />
        </Routes>
      </AnimatePresence>
    );
  }

  // If authenticated but profile not completed, show profile completion
  if (!profileCompleted) {
    return (
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="*" element={<ProfileCompletion />} />
        </Routes>
      </AnimatePresence>
    );
  }

  // If authenticated and profile completed, show app routes
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/track/:sessionId" element={<GuardianTrack />} />
        <Route path="/map" element={<MapNavigation />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const { user, loading, profileCompleted } = useAuth();
  const isAuthenticated = !!user;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-space-navy-900">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-neon-cyan-500 to-soft-lavender-500 rounded-full mb-4 animate-pulse shadow-neon-cyan">
            <div className="text-2xl font-bold text-space-navy-900">S</div>
          </div>
          <p className="text-neon-cyan-500 animate-pulse font-semibold">Loading Sakhi...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="relative min-h-screen bg-space-navy-900 overflow-x-hidden">
        <main className={isAuthenticated && profileCompleted ? 'pb-24' : ''}>
          <Suspense
            fallback={
              <div className="flex h-screen items-center justify-center text-neon-cyan-500 animate-pulse">
                Loading Sakhi...
              </div>
            }
          >
            <ToastProvider>
              <AnimatedRoutes isAuthenticated={isAuthenticated} profileCompleted={profileCompleted} />
            </ToastProvider>
          </Suspense>
        </main>

        {isAuthenticated && profileCompleted && <BottomNav />}
      </div>
    </BrowserRouter>
  );
}
