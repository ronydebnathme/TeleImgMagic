import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface TelegramConnection {
  connected: boolean;
  lastChecked: string;
  apiId: string;
  phoneNumber: string;
  sessionStatus: string;
}

export interface TelegramCredentials {
  apiId: string;
  apiHash: string;
  phoneNumber: string;
}

export function useTelegramAuth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch connection status
  const { 
    data: connection,
    isLoading: isLoadingConnection,
    refetch: refetchConnection
  } = useQuery<TelegramConnection>({
    queryKey: ['/api/telegram/status'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Track the phone code hash from the credentials API
  const [phoneCodeHash, setPhoneCodeHash] = useState<string>('');

  // Set credentials mutation
  const setCredentialsMutation = useMutation({
    mutationFn: async (credentials: TelegramCredentials) => {
      return apiRequest<any>('/api/telegram/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
    },
    onSuccess: (data) => {
      console.log('Credentials API response:', data);
      toast({
        title: "Credentials updated",
        description: "A verification code has been sent to your Telegram",
      });
      
      // Store the phone code hash if available
      if (data.phoneCodeHash) {
        console.log('Phone code hash received:', data.phoneCodeHash);
        setPhoneCodeHash(data.phoneCodeHash);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/status'] });
    },
    onError: (error) => {
      console.error('Credentials API error:', error);
      toast({
        title: "Failed to update credentials",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Refresh connection mutation
  const refreshConnectionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<any>('/api/telegram/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      toast({
        title: "Connection refreshed",
        description: "Your Telegram connection has been refreshed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/status'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to refresh connection",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Login mutation (for 2FA or phone code)
  const loginMutation = useMutation({
    mutationFn: async (params: { code: string, password?: string }) => {
      // Include phoneCodeHash if available
      const payload = {
        ...params,
        phoneCodeHash: phoneCodeHash || undefined
      };
      console.log('Sending login request with payload:', payload);
      
      return apiRequest<any>('/api/telegram/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data) => {
      console.log('Login API response:', data);
      toast({
        title: "Login successful",
        description: "You've successfully logged in to Telegram",
      });
      
      // Clear the phone code hash after successful login
      setPhoneCodeHash('');
      
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/status'] });
    },
    onError: (error) => {
      console.error('Login API error:', error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<any>('/api/telegram/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You've been logged out from Telegram",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/status'] });
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    connection,
    isLoadingConnection,
    refreshConnection: () => refreshConnectionMutation.mutate(),
    isRefreshing: refreshConnectionMutation.isPending,
    setCredentials: (credentials: TelegramCredentials) => setCredentialsMutation.mutate(credentials),
    isSettingCredentials: setCredentialsMutation.isPending,
    login: (params: { code: string, password?: string }) => loginMutation.mutate(params),
    isLoggingIn: loginMutation.isPending,
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };
}
