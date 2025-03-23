import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  // Get auth token from localStorage
  const token = localStorage.getItem('auth_token');
  
  // Set up headers with auth token if it exists
  const headers = {
    ...(options?.headers || {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  
  const res = await fetch(url, {
    method: options?.method || 'GET',
    body: options?.body,
    credentials: "include",
    ...options,
    // Make sure our headers with auth token take precedence
    headers
  });

  await throwIfResNotOk(res);
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json() as T;
  }
  return res as unknown as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get auth token from localStorage
    const token = localStorage.getItem('auth_token');
    
    // Set up headers with auth token if it exists
    const headers: HeadersInit = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
