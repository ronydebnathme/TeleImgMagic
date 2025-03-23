import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ExternalLink } from "lucide-react";

export interface ActivityItem {
  id: string;
  type: string;
  filename: string;
  filesize: string;
  status: 'completed' | 'failed' | 'processing';
  timestamp: string;
  timeAgo: string;
  thumbnail?: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading: boolean;
}

export default function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/15 text-green-600';
      case 'processing':
        return 'bg-blue-500/15 text-blue-600';
      case 'failed':
        return 'bg-red-500/15 text-red-600';
      default:
        return 'bg-gray-500/15 text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Recent Activity</CardTitle>
          <CardDescription>Latest image processing activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-14 h-14 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[60%]" />
                  <Skeleton className="h-3 w-[40%]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Recent Activity</CardTitle>
        <CardDescription>Latest image processing activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {activities && activities.length > 0 ? (
            activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                {activity.thumbnail ? (
                  <div className="relative group h-14 w-14 rounded-md overflow-hidden flex-shrink-0 border">
                    <img
                      src={activity.thumbnail}
                      alt={activity.filename}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="h-14 w-14 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-muted-foreground">No image</span>
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate flex-1">{activity.filename}</p>
                    <div
                      className={`${badgeVariants({ variant: "outline" })} ${getStatusColor(activity.status)}`}
                    >
                      {activity.status}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <div>
                      <span>{activity.type} • {activity.filesize}</span>
                    </div>
                    <div title={new Date(activity.timestamp).toLocaleString()}>
                      {activity.timeAgo}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <p>No recent activity found</p>
              <p className="mt-1 text-xs">
                Process an image to see activity here
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-4 text-right">
          <Link href="/history" className="block text-right">
            <span className="text-xs text-primary hover:underline cursor-pointer">
              View all activity →
            </span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}