import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import StatsCard from '@/components/dashboard/StatsCard';
import ConnectionStatus from '@/components/dashboard/ConnectionStatus';
import RecentActivity, { ActivityItem } from '@/components/dashboard/RecentActivity';
import LogsTable from '@/components/dashboard/LogsTable';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';
import { 
  ImageIcon, 
  Users, 
  HardDrive, 
  AlertTriangle 
} from 'lucide-react';

interface StatsData {
  imagesProcessed: number;
  storageUsed: string;
  storageUsedBytes: number;
  failedOperations: number;
  apiCalls: number;
  activeConnections: number;
  maxApiCalls: number;
  maxStorageBytes: number;
  maxConnections: number;
  storageTotal: string;
  imagesProcessedGrowth?: string;
  activeUsers: number;
  activeUsersGrowth?: string;
  filesSent: number;
  totalSourceFiles: number;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { connection, refreshConnection, isLoadingConnection } = useTelegramAuth();

  // Fetch stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<StatsData>({
    queryKey: ['/api/stats'],
  });

  // Fetch recent activities
  const { data: activities, isLoading: isLoadingActivities } = useQuery<ActivityItem[]>({
    queryKey: ['/api/images/recent'],
  });

  const handleOpenSettings = () => {
    navigate('/telegram');
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Stats row */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Images Processed */}
          <StatsCard
            icon={<ImageIcon className="w-5 h-5" />}
            iconBgClass="bg-blue-100"
            iconColorClass="text-blue-600"
            title="Images Processed"
            value={isLoadingStats ? "Loading..." : (stats?.imagesProcessed ?? 0)}
            footer={
              stats?.imagesProcessedGrowth ? (
                <div className="text-sm text-green-600 flex items-center">
                  <span>{stats.imagesProcessedGrowth}</span>
                </div>
              ) : undefined
            }
          />

          {/* Total Source Files */}
          <StatsCard
            icon={<HardDrive className="w-5 h-5" />}
            iconBgClass="bg-purple-100"
            iconColorClass="text-purple-600"
            title="Total Source Files"
            value={isLoadingStats ? "Loading..." : (stats?.totalSourceFiles ?? 0)}
            footer={
              <div className="text-sm text-muted-foreground flex items-center">
                <span>Available ZIP archives</span>
              </div>
            }
          />

          {/* Files Sent */}
          <StatsCard
            icon={<Users className="w-5 h-5" />}
            iconBgClass="bg-green-100"
            iconColorClass="text-green-600"
            title="Files Sent"
            value={isLoadingStats ? "Loading..." : (stats?.filesSent ?? 0)}
            footer={
              <div className="text-sm text-muted-foreground flex items-center">
                <span>Total processed files</span>
              </div>
            }
          />

          {/* Failed Operations */}
          <StatsCard
            icon={<AlertTriangle className="w-5 h-5" />}
            iconBgClass="bg-yellow-100"
            iconColorClass="text-yellow-600"
            title="Failed Operations"
            value={isLoadingStats ? "Loading..." : (stats?.failedOperations ?? 0)}
            footer={
              <div className="text-sm text-muted-foreground flex items-center cursor-pointer" onClick={() => navigate('/history')}>
                <span>View details</span>
              </div>
            }
          />
        </div>

        {/* Connection status */}
        <div className="mt-8">
          <ConnectionStatus
            connected={connection?.connected || false}
            lastChecked={connection?.lastChecked || 'Never'}
            apiId={connection?.apiId || '••••••••••••'}
            phoneNumber={connection?.phoneNumber || '••••••••••••'}
            sessionStatus={connection?.sessionStatus || 'Not connected'}
            onRefreshConnection={refreshConnection}
            onOpenSettings={handleOpenSettings}
          />
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <RecentActivity 
            activities={activities || []} 
            isLoading={isLoadingActivities} 
          />
        </div>
        
        {/* Activity Logs */}
        <div className="mt-8">
          <LogsTable />
        </div>
      </div>
    </div>
  );
}
