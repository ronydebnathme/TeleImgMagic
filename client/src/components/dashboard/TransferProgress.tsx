import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useWebSocketProgress } from "@/hooks/useWebSocketProgress";
import { 
  UploadCloud, 
  DownloadCloud, 
  WifiOff,
  Check,
  ClockIcon,
  RefreshCw
} from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export default function TransferProgress() {
  const { isConnected, uploadProgress, downloadProgress, currentJobId, resetProgress, reconnect } = useWebSocketProgress();
  const [lastUploadTime, setLastUploadTime] = useState<Date | null>(null);
  const [lastDownloadTime, setLastDownloadTime] = useState<Date | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Update timestamps when progress reaches 100%
  useEffect(() => {
    if (uploadProgress === 100) {
      setLastUploadTime(new Date());
    }
    if (downloadProgress === 100) {
      setLastDownloadTime(new Date());
    }
  }, [uploadProgress, downloadProgress]);

  // Format time ago
  const formatTimeAgo = (date: Date | null) => {
    if (!date) return null;
    
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  // Get transfer status message
  const getStatusMessage = () => {
    if (!uploadProgress && !downloadProgress) {
      return "No active transfers. Progress will appear here during file operations.";
    }

    const messages = [];
    
    if (uploadProgress !== null) {
      if (uploadProgress === 100) {
        messages.push("Upload complete.");
      } else if (uploadProgress > 0) {
        messages.push("Uploading to Telegram...");
      }
    }
    
    if (downloadProgress !== null) {
      if (downloadProgress === 100) {
        messages.push("Download complete.");
      } else if (downloadProgress > 0) {
        messages.push("Processing images...");
      }
    }
    
    return messages.join(" ");
  };

  // Function to handle manual reconnection
  const handleReconnect = () => {
    setIsReconnecting(true);
    reconnect();
    
    // Reset the reconnecting state after a delay
    setTimeout(() => {
      setIsReconnecting(false);
    }, 2000);
  };

  // If not connected, show a message
  if (!isConnected) {
    return (
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <WifiOff className="w-5 h-5 mr-2 text-muted-foreground" />
            Transfer Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Real-time progress monitoring is disconnected
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground mb-4">
            The WebSocket connection for real-time transfer updates is currently unavailable.
          </p>
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full" 
            onClick={handleReconnect}
            disabled={isReconnecting}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isReconnecting ? 'animate-spin' : ''}`} />
            {isReconnecting ? 'Reconnecting...' : 'Reconnect Now'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Transfer Status</CardTitle>
          <div className="flex items-center space-x-2">
            {(uploadProgress === 100 || downloadProgress === 100) && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Check className="h-3.5 w-3.5 mr-1" />
                Recent activity
              </Badge>
            )}
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6" 
              onClick={handleReconnect}
              disabled={isReconnecting}
              title="Refresh WebSocket connection"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Display upload progress */}
        <div className="flex items-center space-x-2">
          <UploadCloud className={`h-5 w-5 ${uploadProgress ? 'text-blue-500' : 'text-muted-foreground'}`} />
          <div className="flex-1">
            <ProgressBar
              progress={uploadProgress}
              label="Upload Progress"
              colorVariant={uploadProgress === 100 ? "success" : "default"}
              size="md"
            />
          </div>
        </div>

        {/* Display download progress */}
        <div className="flex items-center space-x-2">
          <DownloadCloud className={`h-5 w-5 ${downloadProgress ? 'text-green-500' : 'text-muted-foreground'}`} />
          <div className="flex-1">
            <ProgressBar
              progress={downloadProgress}
              label="Download Progress"
              colorVariant={downloadProgress === 100 ? "success" : "default"}
              size="md"
            />
            {currentJobId && downloadProgress && downloadProgress < 100 && (
              <div className="text-xs text-muted-foreground mt-1">
                Job #{currentJobId}
              </div>
            )}
          </div>
        </div>

        {/* Status message */}
        <div className="text-sm text-muted-foreground mt-2">
          <p>{getStatusMessage()}</p>
        </div>

        {/* Completed transfers */}
        {(lastUploadTime || lastDownloadTime) && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center">
                <ClockIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                Last Completed
              </h4>
              <div className="space-y-1 text-sm">
                {lastUploadTime && (
                  <div className="flex justify-between">
                    <span>Upload to Telegram:</span>
                    <span className="text-muted-foreground">{formatTimeAgo(lastUploadTime)}</span>
                  </div>
                )}
                {lastDownloadTime && (
                  <div className="flex justify-between">
                    <span>Image Processing:</span>
                    <span className="text-muted-foreground">{formatTimeAgo(lastDownloadTime)}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}