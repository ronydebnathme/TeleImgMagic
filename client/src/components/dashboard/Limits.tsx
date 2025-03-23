import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface LimitProps {
  title: string;
  current: number;
  max: number;
  colorClass: string;
}

function LimitItem({ title, current, max, colorClass }: LimitProps) {
  const percentage = Math.round((current / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm font-medium">
        <span>{title}</span>
        <span>
          {current} / {max}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={`h-2 ${colorClass}`} 
      />
    </div>
  );
}

interface LimitsProps {
  dailyApiCalls: number;
  maxDailyApiCalls: number;
  storageUsed: string;
  maxStorage: string;
  activeConnections: number;
  maxConnections: number;
  storageUsedBytes: number;
  maxStorageBytes: number;
}

export default function Limits({ 
  dailyApiCalls, 
  maxDailyApiCalls, 
  storageUsed, 
  maxStorage, 
  activeConnections, 
  maxConnections,
  storageUsedBytes,
  maxStorageBytes
}: LimitsProps) {
  // Calculate usage percentages to determine color
  const apiCallsPercent = (dailyApiCalls / maxDailyApiCalls) * 100;
  const storagePercent = (storageUsedBytes / maxStorageBytes) * 100;
  const connectionsPercent = (activeConnections / maxConnections) * 100;

  // Get appropriate color classes based on usage
  const getColorClass = (percentage: number) => {
    if (percentage < 60) return "bg-green-500";
    if (percentage < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Usage Limits</CardTitle>
        <CardDescription>Monitor your system resource usage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LimitItem
          title="Daily API Calls"
          current={dailyApiCalls}
          max={maxDailyApiCalls}
          colorClass={getColorClass(apiCallsPercent)}
        />
        <LimitItem
          title="Storage Used"
          current={parseFloat(storageUsed.split(' ')[0])}
          max={parseFloat(maxStorage.split(' ')[0])}
          colorClass={getColorClass(storagePercent)}
        />
        <LimitItem
          title="Active Connections"
          current={activeConnections}
          max={maxConnections}
          colorClass={getColorClass(connectionsPercent)}
        />
      </CardContent>
    </Card>
  );
}