import { Link, useLocation } from "wouter";
import { useAuthContext } from "@/components/auth/AuthProvider";

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const [location] = useLocation();
  const { isAdmin, user } = useAuthContext();

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <>
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-slate-800 bg-opacity-75 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white transition duration-300 ease-in-out md:relative md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col w-64 border-r border-slate-200 bg-white h-full">
          <div className="flex items-center h-16 px-4 border-b border-slate-200">
            <div className="flex items-center">
              <i className="ri-image-edit-line text-primary-600 text-2xl mr-2"></i>
              <span className="text-lg font-semibold text-slate-800">Image Magic</span>
            </div>
          </div>

          <div className="flex flex-col flex-grow px-4 py-4 overflow-y-auto scrollbar-hide">
            <div className="space-y-1">
              <Link 
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group ${
                  isActive("/") 
                    ? "text-primary-600 bg-primary-50" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <i className="ri-dashboard-line mr-3 text-lg"></i>
                Dashboard
              </Link>
              <Link 
                href="/history"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group ${
                  isActive("/history") 
                    ? "text-primary-600 bg-primary-50" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <i className="ri-history-line mr-3 text-lg"></i>
                History
              </Link>
              <Link 
                href="/telegram"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group ${
                  isActive("/telegram") 
                    ? "text-primary-600 bg-primary-50" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <i className="ri-telegram-line mr-3 text-lg"></i>
                Telegram
              </Link>
              <Link 
                href="/scheduled-sends"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group ${
                  isActive("/scheduled-sends") 
                    ? "text-primary-600 bg-primary-50" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <i className="ri-calendar-todo-line mr-3 text-lg"></i>
                Scheduled Sends
              </Link>
            </div>
            
            {/* Telegram User Management - Accessible to all users */}
            <div className="mt-8">
              <h3 className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                TG Management
              </h3>
              <div className="mt-2 space-y-1">
                <Link 
                  href="/tg-admins"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group ${
                    isActive("/tg-admins") 
                      ? "text-primary-600 bg-primary-50" 
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <i className="ri-admin-line mr-3 text-lg"></i>
                  TG Bot Admins
                </Link>
                <Link 
                  href="/tg-users"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group ${
                    isActive("/tg-users") 
                      ? "text-primary-600 bg-primary-50" 
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <i className="ri-user-received-line mr-3 text-lg"></i>
                  TG Bot Users
                </Link>
              </div>
            </div>
            
            {/* Admin only section */}
            {isAdmin && (
              <div className="mt-8">
                <h3 className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Administration
                </h3>
                <div className="mt-2 space-y-1">
                  <Link 
                    href="/admin-dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group ${
                      isActive("/admin-dashboard") 
                        ? "text-primary-600 bg-primary-50" 
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <i className="ri-dashboard-3-line mr-3 text-lg"></i>
                    Admin Dashboard
                  </Link>
                  <Link 
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group ${
                      isActive("/admin") 
                        ? "text-primary-600 bg-primary-50" 
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <i className="ri-shield-user-line mr-3 text-lg"></i>
                    Admin Management
                  </Link>
                  <Link 
                    href="/users"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group ${
                      isActive("/users") 
                        ? "text-primary-600 bg-primary-50" 
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <i className="ri-user-settings-line mr-3 text-lg"></i>
                    Authorized Users
                  </Link>
                </div>
              </div>
            )}
            
            {/* Settings - Image settings is admin only */}
            <div className="mt-8">
              <h3 className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Settings
              </h3>
              <div className="mt-2 space-y-1">
                {isAdmin && (
                  <Link 
                    href="/image-settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group ${
                      isActive("/image-settings") 
                        ? "text-primary-600 bg-primary-50" 
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <i className="ri-image-edit-fill mr-3 text-lg"></i>
                    Image Processing
                  </Link>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0 flex border-t border-slate-200 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div>
                  <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center">
                    <i className="ri-user-line text-primary-600"></i>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-700">{user?.username || 'User'}</p>
                  <p className="text-xs font-medium text-slate-500">{user?.email || ''}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
