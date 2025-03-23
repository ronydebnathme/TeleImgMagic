import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import History from "@/pages/history";
import TelegramSettings from "@/pages/telegram-settings";
import AdminManagement from "@/pages/admin-management";
import AdminDashboard from "@/pages/admin-dashboard";
import ImageSettings from "@/pages/image-settings";
import ScheduledSends from "@/pages/scheduled-sends";
import UsersPage from "@/pages/users";
import TgAdminsPage from "@/pages/tg-admins";
import TgUsersPage from "@/pages/tg-users";
import Editor from "@/pages/editor";
import LoginPage from "@/pages/login";
import Sidebar from "./components/layout/Sidebar";
import MobileHeader from "./components/layout/MobileHeader";
import { useState } from "react";
import { AuthProvider, ProtectedRoute } from "@/components/auth/AuthProvider";
import { useAuthContext } from "@/components/auth/AuthProvider";

function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuthContext();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <MobileHeader toggleMobileMenu={toggleMobileMenu} />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none scrollbar-hide">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  const { isLoading } = useAuthContext();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      <span className="ml-2">Loading...</span>
    </div>;
  }

  return (
    <Switch>
      <Route path="/login">
        <LoginPage />
      </Route>
      
      <Route path="/">
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/dashboard">
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/history">
        <ProtectedRoute>
          <AppLayout>
            <History />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/editor">
        <ProtectedRoute>
          <AppLayout>
            <Editor />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/telegram">
        <ProtectedRoute>
          <AppLayout>
            <TelegramSettings />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin">
        <ProtectedRoute adminOnly>
          <AppLayout>
            <AdminManagement />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/image-settings">
        <ProtectedRoute adminOnly>
          <AppLayout>
            <ImageSettings />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/scheduled-sends">
        <ProtectedRoute>
          <AppLayout>
            <ScheduledSends />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/users">
        <ProtectedRoute adminOnly>
          <AppLayout>
            <UsersPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin-dashboard">
        <ProtectedRoute adminOnly>
          <AppLayout>
            <AdminDashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      {/* New TG Management routes - accessible to all authenticated users */}
      <Route path="/tg-admins">
        <ProtectedRoute>
          <AppLayout>
            <TgAdminsPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/tg-users">
        <ProtectedRoute>
          <AppLayout>
            <TgUsersPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
