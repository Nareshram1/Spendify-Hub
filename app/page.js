"use client";
import { useState, useEffect } from 'react';
import AuthForm from '../components/AuthForm';
import Dashboard from '../components/Dashboard';
import { getCurrentUser } from '../lib/auth';

// New Landing Page Component
function LandingPage({ onEnterApp }) {
  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center text-white px-4 py-8">
      <h1 className="text-5xl font-bold mb-6 text-center">Spendify</h1>
      <p className="text-xl text-gray-300 mb-8 text-center max-w-2xl">
        Take control of your finances with Spendify – your smart expense tracker. Effortlessly monitor your spending, set budgets, and gain insights into where your money goes.
      </p>
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-10">
        <a
          href="https://fuck-playstore.vercel.app" // Your mobile app redirect link
          target="_blank"
          rel="noopener noreferrer"
          className="bg-accent hover:bg-accent/90 text-white font-medium py-3 px-8 rounded-full transition-colors text-lg text-center"
        >
          Get the Mobile App
        </a>
        <button
          onClick={onEnterApp}
          className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-8 rounded-full transition-colors text-lg text-center"
        >
          Sign In / Sign Up
        </button>
      </div>

      <p className="text-sm text-gray-400 mt-8">
        Manage your money smarter, starting today.
      </p>
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLandingPage, setShowLandingPage] = useState(true); // New state for landing page

  useEffect(() => {
    // Only check user if we're not explicitly showing the landing page
    if (!showLandingPage) {
      checkUser();
    } else {
      setLoading(false); // If landing page is shown, no need to load user immediately
    }
  }, [showLandingPage]);

  const checkUser = async () => {
    setLoading(true); // Set loading to true when checking user
    const { user } = await getCurrentUser();
    setUser(user);
    setLoading(false);
  };

  const handleAuthSuccess = (user) => {
    setUser(user);
    setShowLandingPage(false); // Hide landing page if auth successful
  };

  const handleSignOut = () => {
    setUser(null);
    setShowLandingPage(true); // Show landing page after sign out
  };

  const handleEnterApp = () => {
    setShowLandingPage(false); // Hide landing page and proceed to auth
  };

  if (loading && !showLandingPage) { // Only show loading if we're transitioning from landing page or user is being checked
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {showLandingPage ? (
        <LandingPage onEnterApp={handleEnterApp} />
      ) : (
        !user ? (
          <AuthForm onAuthSuccess={handleAuthSuccess} />
        ) : (
          <Dashboard onSignOut={handleSignOut} />
        )
      )}
    </>
  );
}