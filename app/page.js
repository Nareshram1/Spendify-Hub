"use client";
import { useState, useEffect } from 'react'
import AuthForm from '../components/AuthForm'
import Dashboard from '../components/Dashboard'
import { getCurrentUser } from '../lib/auth'

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { user } = await getCurrentUser()
    setUser(user)
    setLoading(false)
  }

  const handleAuthSuccess = (user) => {
    setUser(user)
  }

  const handleSignOut = () => {
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <>
      {!user ? (
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      ) : (
        <Dashboard onSignOut={handleSignOut} />
      )}
    </>
  )
}