import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface User {
  id: number;
  username: string;
  email: string | null;
  fullName: string | null;
  role: string;
  lastLogin: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { 
    data: user, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        return await apiRequest<User | null>("/api/auth/user");
      } catch (error) {
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false, // Disable automatic refetching to prevent potential loops
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Login mutation for username/password auth
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiRequest<{ user: User }>(
        "/api/auth/login", 
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(credentials)
        }
      );
      return response.user || response;
    },
    onSuccess: (user) => {
      // Set data without delay directly
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: "Login successful",
        description: "Welcome back!"
      });
      // Note: We let the login page handle redirection now
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive"
      });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/auth/logout", {
        method: "POST"
      });
    },
    onSuccess: () => {
      // Clear user data immediately
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
      // Use direct navigation for reliability
      window.location.href = "/login";
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message || "An error occurred during logout",
        variant: "destructive"
      });
    }
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    loginMutation,
    logoutMutation,
    isAdmin: user?.role === "admin" || user?.role === "superadmin",
  };
}