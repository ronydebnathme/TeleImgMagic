import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, Settings } from "lucide-react";

interface ConnectionStatusProps {
  connected: boolean;
  lastChecked: string;
  apiId: string;
  phoneNumber: string;
  sessionStatus: string;
  onRefreshConnection: () => void;
  onOpenSettings: () => void;
}

export default function ConnectionStatus({
  connected,
  lastChecked,
  apiId,
  phoneNumber,
  sessionStatus,
  onRefreshConnection,
  onOpenSettings
}: ConnectionStatusProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Telegram Connection</CardTitle>
          <Badge 
            variant={connected ? "default" : "outline"} 
            className={connected ? "bg-green-500/15 text-green-600 hover:bg-green-500/20" : "bg-red-500/15 text-red-600 hover:bg-red-500/20"}
          >
            {connected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
        <CardDescription>Connection to Telegram API for file processing</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">API ID:</span>
            <span className="font-medium">{apiId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone Number:</span>
            <span className="font-medium">{phoneNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Session Status:</span>
            <span className="font-medium">{sessionStatus}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Checked:</span>
            <span className="font-medium">{lastChecked}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex w-full justify-between gap-2">
          <Button 
            variant="outline" 
            onClick={onRefreshConnection}
            className="flex-1 gap-1"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button 
            variant="secondary" 
            onClick={onOpenSettings}
            className="flex-1 gap-1"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}