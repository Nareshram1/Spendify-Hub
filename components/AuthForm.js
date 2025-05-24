"use client";
import { useState } from 'react'
import { signInWithEmail, signUpWithEmail } from '../lib/auth'

export default function AuthForm({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false) // New state for password visibility

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = isLogin
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password)

      if (error) {
        setError(error.message)
      } else {
        onAuthSuccess(data.user)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-secondary rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Spendify</h1>
          <p className="text-gray-400">Track your expenses smartly</p>
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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative"> {/* Added relative for positioning eye icon */}
              <input
                id="password"
                type={showPassword ? 'text' : 'password'} // Toggle type
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:border-accent pr-10" // Added pr-10 for icon space
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"} // Aria label for accessibility
              >
                {/* Simple eye icon (replace with an SVG icon for better quality) */}
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414L5.586 7H3a1 1 0 000 2h3.586l-2.293 2.293a1 1 0 001.414 1.414L9 10.414l2.293 2.293a1 1 0 001.414-1.414L10.414 9l2.293-2.293a1 1 0 00-1.414-1.414L9 7.586l-2.293-2.293A1 1 0 005.293 6.707L7.586 9H3a1 1 0 000 2h3.586l-2.293 2.293a1 1 0 001.414 1.414L9 10.414l2.293 2.293a1 1 0 001.414-1.414L10.414 9l2.293-2.293a1 1 0 00-1.414-1.414L9 7.586l-2.293-2.293A1 1 0 005.293 6.707L7.586 9H3a1 1 0 000 2h3.586l-2.293 2.293a1 1 0 001.414 1.414L9 10.414l2.293 2.293a1 1 0 001.414-1.414L10.414 9l2.293-2.293a1 1 0 00-1.414-1.414L9 7.586l-2.293-2.293A1 1 0 005.293 6.707L7.586 9H3a1 1 0 000 2h3.586l-2.293 2.293a1 1 0 001.414 1.414L9 10.414l2.293 2.293a1 1 0 001.414-1.414L10.414 9l2.293-2.293a1 1 0 00-1.414-1.414L9 7.586l-2.293-2.293A1 1 0 005.293 6.707L7.586 9H3a1 1 0 000 2h3.586l-2.293 2.293a1 1 0 001.414 1.414L9 10.414l2.293 2.293a1 1 0 001.414-1.414L10.414 9l2.293-2.293a1 1 0 00-1.414-1.414L9 7.586l-2.293-2.293A1 1 0 005.293 6.707L7.586 9H3a1 1 0 000 2h3.586l-2.293 2.293a1 1 0 001.414 1.414L9 10.414l2.293 2.293a1 1 0 001.414-1.414L10.414 9l2.293-2.293a1 1 0 00-1.414-1.414L9 7.586l-2.293-2.293A1 1 0 005.293 6.707L7.586 9H3a1 1 0 000 2h3.586l-2.293 2.293a1 1 0 001.414 1.414L9 10.414l2.293 2.293a1 1 0 001.414-1.414L10.414 9l2.293-2.293a1 1 0 00-1.414-1.414L9 7.586z" clipRule="evenodd" />
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

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="text-center mt-6">
          {isLogin && ( // Only show "Forgot Password?" when logging in
            <a href="#" className="text-accent hover:text-accent/80 text-sm block mb-4">
              Forgot Password?
            </a>
          )}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-accent hover:text-accent/80 text-sm"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  )
}