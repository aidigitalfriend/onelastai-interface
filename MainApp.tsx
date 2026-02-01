import React, { useState } from 'react';
import LandingPage from './LandingPage';
import App from './App';

/**
 * MainApp - Entry point that shows Landing Page first
 * User can navigate to the app from the landing page
 */
const MainApp: React.FC = () => {
  const [showApp, setShowApp] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  const handleLaunchApp = (appId: string) => {
    setSelectedApp(appId);
    setShowApp(true);
  };

  const handleBackToLanding = () => {
    setShowApp(false);
    setSelectedApp(null);
  };

  if (showApp) {
    // For now, show the Neural Chat app (App.tsx)
    // In the future, this can route to different apps based on selectedApp
    return (
      <div className="relative">
        {/* Back button */}
        <button
          onClick={handleBackToLanding}
          className="fixed top-4 left-4 z-50 px-4 py-2 bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl text-sm font-medium text-white hover:bg-black/70 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </button>
        <App />
      </div>
    );
  }

  return <LandingPage onLaunchApp={handleLaunchApp} />;
};

export default MainApp;
