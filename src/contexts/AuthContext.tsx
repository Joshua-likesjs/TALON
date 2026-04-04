'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  uid: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to get initial user from localStorage
function getInitialUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const storedUser = localStorage.getItem('geofence_user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Check if user exists in localStorage (mock database)
    const users = JSON.parse(localStorage.getItem('geofence_users') || '[]');
    const existingUser = users.find((u: any) => u.email === email);
    
    if (!existingUser) {
      throw new Error('Usuário não encontrado. Verifique seu email ou cadastre-se.');
    }
    
    if (existingUser.password !== password) {
      throw new Error('Senha incorreta. Tente novamente.');
    }
    
    const userData: User = {
      uid: existingUser.uid,
      email: existingUser.email,
      name: existingUser.name,
    };
    
    localStorage.setItem('geofence_user', JSON.stringify(userData));
    setUser(userData);
  };

  const signUp = async (name: string, email: string, password: string) => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Check if user already exists
    const users = JSON.parse(localStorage.getItem('geofence_users') || '[]');
    const existingUser = users.find((u: any) => u.email === email);
    
    if (existingUser) {
      throw new Error('Este email já está em uso. Tente fazer login.');
    }
    
    if (password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }
    
    const newUser = {
      uid: `user_${Date.now()}`,
      name,
      email,
      password,
      createdAt: new Date().toISOString(),
    };
    
    users.push(newUser);
    localStorage.setItem('geofence_users', JSON.stringify(users));
    
    const userData: User = {
      uid: newUser.uid,
      email: newUser.email,
      name: newUser.name,
    };
    
    localStorage.setItem('geofence_user', JSON.stringify(userData));
    setUser(userData);
  };

  const signOut = async () => {
    localStorage.removeItem('geofence_user');
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Check if user exists
    const users = JSON.parse(localStorage.getItem('geofence_users') || '[]');
    const existingUser = users.find((u: any) => u.email === email);
    
    if (!existingUser) {
      throw new Error('Este email não está cadastrado em nosso sistema.');
    }
    
    // In a real app, this would send an email
    // For now, we'll just simulate success
  };

  const signInWithGoogle = async () => {
    // Simulate OAuth delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const userData: User = {
      uid: `google_${Date.now()}`,
      email: 'usuario@gmail.com',
      name: 'Usuário Google',
    };
    
    localStorage.setItem('geofence_user', JSON.stringify(userData));
    setUser(userData);
  };

  const signInWithFacebook = async () => {
    // Simulate OAuth delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const userData: User = {
      uid: `facebook_${Date.now()}`,
      email: 'usuario@facebook.com',
      name: 'Usuário Facebook',
    };
    
    localStorage.setItem('geofence_user', JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        signInWithGoogle,
        signInWithFacebook,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
