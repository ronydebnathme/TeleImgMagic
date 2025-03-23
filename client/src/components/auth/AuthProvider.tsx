import { createContext, useContext, ReactNode, useState, useEffect, useRef } from "react";
import { useAuth, User, LoginCredentials } from "@/hooks/useAuth";
import { Redirect, useLocation } from "wouter";
import { UseMutationResult } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loginMutation: UseMutationResult<User, Error, LoginCredentials, unknown>;
  logoutMutation: UseMutationResult<void, Error, void, unknown>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated, isAdmin, loginMutation, logoutMutation } = useAuth();

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isAuthenticated, 
      isAdmin, 
      loginMutation, 
      logoutMutation 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ 
  children, 
  adminOnly = false 
}: { 
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { isAuthenticated, isLoading, isAdmin } = useAuthContext();
  const [location] = useLocation();
  
  // Simple loading screen during authentication check
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  // Use useEffect for redirection instead of conditional rendering
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=${encodeURIComponent(location)}`;
      return;
    }
    
    if (adminOnly && !isAdmin) {
      window.location.href = '/dashboard';
      return;
    }
  }, [isAuthenticated, isAdmin, adminOnly, location]);

  // Only render children if conditions are met
  if (!isAuthenticated || (adminOnly && !isAdmin)) {
    return <div className="flex items-center justify-center h-screen">Redirecting...</div>;
  }

  return <>{children}</>;
}