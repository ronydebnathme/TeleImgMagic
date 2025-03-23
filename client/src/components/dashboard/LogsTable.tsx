import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface LogEntry {
  id: number;
  action: string;
  details: string;
  status: 'completed' | 'processing' | 'failed';
  filename: string | null;
  filesize: string | null;
  fromUser: string | null;
  timestamp: string;
  timeAgo: string;
}

export default function LogsTable() {
  const { data: logs, isLoading, error } = useQuery<LogEntry[]>({
    queryKey: ['/api/logs'],
    refetchInterval: 5000, // Refetch every 5 seconds to keep logs updated
  });

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

  // Format action into readable title
  const formatAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>Recent activity and system logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-[30%]" />
                <Skeleton className="h-4 w-[50%]" />
                <Skeleton className="h-4 w-[20%]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>Recent activity and system logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Error loading logs: {(error as Error).message}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Logs</CardTitle>
        <CardDescription>Recent activity and system logs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs && logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{formatAction(log.action)}</TableCell>
                    <TableCell>{log.details}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(log.status)} variant="outline">
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell title={new Date(log.timestamp).toLocaleString()}>
                      {log.timeAgo}
                    </TableCell>
                    <TableCell>{log.fromUser || '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    No logs available. Activity will appear here when the system performs operations.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}