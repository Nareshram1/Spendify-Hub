// components/AuthForm.jsx
"use client";
import { useState } from 'react';
import { signInWithEmail, signUpWithEmail, resetPassword } from '../lib/auth';

export default function AuthForm({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // New state for username
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isForgotPassword) {
        // Handle password reset
        const { error } = await resetPassword(email);

        if (error) {
          setError(error.message);
        } else {
          setSuccess('Password reset email sent! Check your inbox.');
        }
      } else {
        // Handle login/signup
        const { data, error } = isLogin
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password, username); // Pass username for signup

        if (error) {
          setError(error.message);
        } else {
          onAuthSuccess(data.user);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setIsForgotPassword(false);
    setError('');
    setSuccess('');
    setEmail('');
    setUsername(''); // Clear username on back to login
  };

  const handleForgotPasswordClick = (e) => {
    e.preventDefault();
    setIsForgotPassword(true);
    setError('');
    setSuccess('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-secondary rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Spendify</h1>
          <p className="text-gray-400">
            {isForgotPassword
              ? 'Reset your password'
              : 'Track your expenses smartly'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:border-accent"
              required
            />
          </div>

          {!isLogin && !isForgotPassword && ( // Show username field only for signup
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:border-accent"
                required={!isLogin} // Require username only for signup
              />
            </div>
          )}

          {!isForgotPassword && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:border-accent pr-10"
                  required
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
          )}

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          {success && (
            <div className="text-green-400 text-sm text-center">{success}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : (
              isForgotPassword ? 'Send Reset Email' : (isLogin ? 'Sign In' : 'Sign Up')
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          {isForgotPassword ? (
            <button
              onClick={handleBackToLogin}
              className="text-accent hover:text-accent/80 text-sm"
            >
              Back to Sign In
            </button>
          ) : (
            <>
              {isLogin && (
                <button
                  onClick={handleForgotPasswordClick}
                  className="text-accent hover:text-accent/80 text-sm block mb-4"
                >
                  Forgot Password?
                </button>
              )}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(''); // Clear errors when switching form type
                  setSuccess(''); // Clear success when switching form type
                }}
                className="text-accent hover:text-accent/80 text-sm"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}