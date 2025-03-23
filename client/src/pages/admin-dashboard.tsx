import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { badgeVariants } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Define interfaces for our data structures
interface AuthorizedUser {
  id: number;
  username: string;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminUser {
  id: number;
  username: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TelegramCredentials {
  id: number;
  userId: number | null;
  apiId: string;
  apiHash: string;
  phoneNumber: string;
  sessionString: string | null;
  lastConnected: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: number;
  username: string;
  email: string | null;
  fullName: string | null;
  role: string;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ImageProcessingJob {
  id: number;
  userId: number | null;
  originalFilename: string;
  originalFilesize: number;
  processedFilename: string | null;
  processedFilesize: number | null;
  status: string;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ActivityLog {
  id: number;
  userId: number | null;
  username: string | null;
  action: string;
  details: string;
  status: string;
  timestamp: string;
  timeAgo: string;
  filename: string | null;
  filesize: string | null;
}

// Filter state for our tables
interface FilterState {
  userId: number | null;
  timeRange: 'all' | 'today' | 'week' | 'month';
  status: 'all' | 'completed' | 'processing' | 'failed';
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState<FilterState>({
    userId: null,
    timeRange: 'all',
    status: 'all'
  });

  // Fetch authorized users
  const { data: authorizedUsers = [], isLoading: authorizedUsersLoading } = useQuery({
    queryKey: ["/api/authorized-users"],
    select: (data: any) => data.users || [],
  });

  // Fetch registered users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/auth/users"],
  });

  // Fetch telegram credentials
  const { data: telegramCredentials = [], isLoading: telegramCredentialsLoading } = useQuery({
    queryKey: ["/api/telegram/credentials/all"],
  });

  // Fetch image processing jobs
  const { data: imageJobs = [], isLoading: imageJobsLoading } = useQuery({
    queryKey: ["/api/images/all"],
  });

  // Fetch activity logs
  const { data: activityLogs = [], isLoading: activityLogsLoading } = useQuery({
    queryKey: ["/api/logs"],
  });

  // Filtered data based on our filter state
  const filteredImageJobs = imageJobs.filter((job: ImageProcessingJob) => {
    if (filters.userId !== null && job.userId !== filters.userId) return false;
    if (filters.status !== 'all' && job.status !== filters.status) return false;
    
    if (filters.timeRange !== 'all') {
      const jobDate = new Date(job.createdAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (filters.timeRange === 'today' && daysDiff > 0) return false;
      if (filters.timeRange === 'week' && daysDiff > 7) return false;
      if (filters.timeRange === 'month' && daysDiff > 30) return false;
    }
    
    return true;
  });

  // Stats calculation
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter((user: User) => user.lastLogin !== null).length,
    totalAuthorizedUsers: authorizedUsers.length,
    activeAuthorizedUsers: authorizedUsers.filter((user: AuthorizedUser) => user.isActive).length,
    totalImageJobs: imageJobs.length,
    completedJobs: imageJobs.filter((job: ImageProcessingJob) => job.status === 'completed').length,
    failedJobs: imageJobs.filter((job: ImageProcessingJob) => job.status === 'failed').length,
    processingJobs: imageJobs.filter((job: ImageProcessingJob) => job.status === 'processing').length,
    totalTelegramAccounts: telegramCredentials.length,
    activeTelegramAccounts: telegramCredentials.filter((cred: TelegramCredentials) => cred.isActive).length,
  };

  const openDeleteDialog = (user: AuthorizedUser) => {
    // Implementation for delete functionality would go here
    console.log("Open delete dialog for user:", user.id);
  };

  const handleToggleUserStatus = (user: AuthorizedUser) => {
    // Implementation for toggling user status would go here
    console.log("Toggle status for user:", user.id);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="images">Image Jobs</TabsTrigger>
            <TabsTrigger value="telegram">Telegram</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* User Stats Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">User Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Users:</span>
                      <span className="font-medium">{stats.totalUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Active Users:</span>
                      <span className="font-medium">{stats.activeUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Authorized Users:</span>
                      <span className="font-medium">{stats.totalAuthorizedUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Active Authorized:</span>
                      <span className="font-medium">{stats.activeAuthorizedUsers}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/users">Manage Users</a>
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Image Processing Stats Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Image Processing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Jobs:</span>
                      <span className="font-medium">{stats.totalImageJobs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Completed:</span>
                      <span className="font-medium">{stats.completedJobs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Processing:</span>
                      <span className="font-medium">{stats.processingJobs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Failed:</span>
                      <span className="font-medium">{stats.failedJobs}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setActiveTab("images")}
                  >
                    View Image Jobs
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Telegram Stats Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Telegram</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Accounts:</span>
                      <span className="font-medium">{stats.totalTelegramAccounts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Active Accounts:</span>
                      <span className="font-medium">{stats.activeTelegramAccounts}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setActiveTab("telegram")}
                  >
                    View Telegram Accounts
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system activity logs</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityLogsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                        </TableRow>
                      ) : activityLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">No activity logs found</TableCell>
                        </TableRow>
                      ) : (
                        activityLogs.slice(0, 10).map((log: ActivityLog) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">{log.action}</TableCell>
                            <TableCell>{log.details}</TableCell>
                            <TableCell>{log.username || 'System'}</TableCell>
                            <TableCell>
                              <div className={badgeVariants({
                                variant: log.status === 'completed' ? 'default' : 
                                         log.status === 'processing' ? 'secondary' : 'destructive'
                              })}>
                                {log.status}
                              </div>
                            </TableCell>
                            <TableCell>{log.timeAgo}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab("activity")} 
                  className="w-full"
                >
                  View All Activity
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registered Users</CardTitle>
                <CardDescription>All registered user accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No users found</TableCell>
                      </TableRow>
                    ) : (
                      users.map((user: User) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.email || 'N/A'}</TableCell>
                          <TableCell>{user.role}</TableCell>
                          <TableCell>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Authorized Telegram Users</CardTitle>
                <CardDescription>Users authorized to access the Telegram bot</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {authorizedUsersLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : authorizedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No authorized users found</TableCell>
                      </TableRow>
                    ) : (
                      authorizedUsers.map((user: AuthorizedUser) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>
                            <div className={badgeVariants({
                              variant: user.isActive ? 'default' : 'destructive'
                            })}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </div>
                          </TableCell>
                          <TableCell>{user.notes || 'N/A'}</TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleToggleUserStatus(user)}
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-destructive"
                                onClick={() => openDeleteDialog(user)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="images" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Image Processing Jobs</CardTitle>
                <CardDescription>All image processing operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-4">
                  <select 
                    className="p-2 border rounded-md"
                    value={filters.status}
                    onChange={(e) => setFilters({
                      ...filters, 
                      status: e.target.value as FilterState['status']
                    })}
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="processing">Processing</option>
                    <option value="failed">Failed</option>
                  </select>
                  
                  <select 
                    className="p-2 border rounded-md"
                    value={filters.timeRange}
                    onChange={(e) => setFilters({
                      ...filters, 
                      timeRange: e.target.value as FilterState['timeRange']
                    })}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Original Size</TableHead>
                      <TableHead>Processed Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {imageJobsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : filteredImageJobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">No image jobs found</TableCell>
                      </TableRow>
                    ) : (
                      filteredImageJobs.map((job: ImageProcessingJob) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium">{job.id}</TableCell>
                          <TableCell>{job.originalFilename}</TableCell>
                          <TableCell>{formatFileSize(job.originalFilesize)}</TableCell>
                          <TableCell>{job.processedFilesize ? formatFileSize(job.processedFilesize) : 'N/A'}</TableCell>
                          <TableCell>
                            <div className={badgeVariants({
                              variant: job.status === 'completed' ? 'default' : 
                                       job.status === 'processing' ? 'secondary' : 'destructive'
                            })}>
                              {job.status}
                            </div>
                          </TableCell>
                          <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="telegram" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Telegram Accounts</CardTitle>
                <CardDescription>Connected Telegram API accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>API ID</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Connected</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {telegramCredentialsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : telegramCredentials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No Telegram accounts found</TableCell>
                      </TableRow>
                    ) : (
                      telegramCredentials.map((cred: TelegramCredentials) => (
                        <TableRow key={cred.id}>
                          <TableCell className="font-medium">{cred.apiId}</TableCell>
                          <TableCell>{cred.phoneNumber}</TableCell>
                          <TableCell>
                            <div className={badgeVariants({
                              variant: cred.isActive ? 'default' : 'destructive'
                            })}>
                              {cred.isActive ? 'Active' : 'Inactive'}
                            </div>
                          </TableCell>
                          <TableCell>{cred.lastConnected ? new Date(cred.lastConnected).toLocaleString() : 'Never'}</TableCell>
                          <TableCell>{new Date(cred.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>System-wide activity logs</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : activityLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No activity logs found</TableCell>
                      </TableRow>
                    ) : (
                      activityLogs.map((log: ActivityLog) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.action}</TableCell>
                          <TableCell>{log.details}</TableCell>
                          <TableCell>{log.username || 'System'}</TableCell>
                          <TableCell>
                            <div className={badgeVariants({
                              variant: log.status === 'completed' ? 'default' : 
                                       log.status === 'processing' ? 'secondary' : 'destructive'
                            })}>
                              {log.status}
                            </div>
                          </TableCell>
                          <TableCell>{log.timeAgo}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}