'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

const STORAGE_KEY = 'limhs_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    checkUser();
  }, []);

  function checkUser() {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setOrganization(userData.organization);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { data: null, error: { message: data.error } };
      }

      // Store user in localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      setUser(data.user);
      setOrganization(data.user.organization);

      return { data: data.user, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error: { message: 'An error occurred during login' } };
    }
  }

  function signOut() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setOrganization(null);
    return { error: null };
  }

  const value = {
    user,
    organization,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user,
    organizationId: organization?.id || null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
