'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleRecovery = async () => {
      try {
        // Check if we're in the browser
        if (typeof window === 'undefined') return;

        // Try to get parameters from hash first, then from query string
        let params;
        const hash = window.location.hash;
        const search = window.location.search;

        if (hash && hash !== '#') {
          // Parse hash parameters
          const hashParams = hash.substring(1); // remove #
          params = new URLSearchParams(hashParams);
          console.log('Using hash parameters:', hash);
        } else if (search) {
          // Parse query parameters
          params = new URLSearchParams(search);
          console.log('Using query parameters:', search);
        } else {
          console.log('No parameters found, redirecting to home');
          router.push('/');
          return;
        }
        
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const type = params.get('type');

        console.log('Parsed params:', { access_token: access_token ? 'present' : 'missing', refresh_token: refresh_token ? 'present' : 'missing', type });

        // Validate required parameters
        if (type !== 'recovery') {
          setError('Invalid recovery link type');
          return;
        }

        if (!access_token || !refresh_token) {
          setError('Invalid recovery link - missing tokens');
          return;
        }

        // Set the session with the tokens
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Failed to restore session: ' + sessionError.message);
          return;
        }

        if (!data.session) {
          setError('Failed to create session');
          return;
        }

        console.log('Session restored successfully');
        setSessionReady(true);

        // Clear the URL hash to prevent issues
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }

      } catch (err) {
        console.error('Recovery handling error:', err);
        setError('An unexpected error occurred during recovery');
      }
    };

    handleRecovery();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError('Session expired. Please request a new password reset.');
        setLoading(false);
        return;
      }

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Success - redirect to login
      alert('Password updated successfully! Redirecting to login...');
      
      // Sign out the user to ensure they use the new password
      await supabase.auth.signOut();
      
      // Redirect to login page
      router.push('/');
      
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  // Loading state
  if (!sessionReady && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="bg-secondary p-8 rounded-lg shadow-xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-white">Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary px-4">
        <div className="bg-secondary p-8 rounded-lg shadow-xl max-w-md w-full text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Invalid Reset Link</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-accent hover:bg-accent/90 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-secondary rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-gray-400">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:border-accent pr-10"
                required
                minLength={6}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.614 14.478 2 10 2a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.386 5.068 8 9.542 8 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.614 5.518 2 10 2s8.268 3.614 9.542 8c-1.274 4.386-5.06 8-9.542 8S1.732 14.386.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:border-accent"
              required
              minLength={6}
              placeholder="Confirm new password"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/')}
            className="text-accent hover:text-accent/80 text-sm"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}