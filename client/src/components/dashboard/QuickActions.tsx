import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  ImagePlus, 
  RefreshCw, 
  Scissors, 
  Zap, 
  Send, 
  Image, 
  UploadCloud 
} from "lucide-react";
import { Link } from "wouter";

interface QuickActionsProps {
  onCheckApiStatus: () => void;
  onUploadClick: () => void;
}

export default function QuickActions({ onCheckApiStatus, onUploadClick }: QuickActionsProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Quick Actions</CardTitle>
        <CardDescription>Common actions you can perform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            className="flex flex-col h-24 gap-1 items-center justify-center"
            onClick={onUploadClick}
          >
            <UploadCloud className="h-5 w-5" />
            <span className="text-xs">Upload Image</span>
          </Button>
          
          <Link href="/editor">
            <Button 
              variant="outline" 
              className="flex flex-col h-24 w-full gap-1 items-center justify-center"
            >
              <Scissors className="h-5 w-5" />
              <span className="text-xs">Edit Image</span>
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            className="flex flex-col h-24 gap-1 items-center justify-center"
            onClick={onCheckApiStatus}
          >
            <RefreshCw className="h-5 w-5" />
            <span className="text-xs">Check API Status</span>
          </Button>
          
          <Link href="/history">
            <Button 
              variant="outline" 
              className="flex flex-col h-24 w-full gap-1 items-center justify-center"
            >
              <Image className="h-5 w-5" />
              <span className="text-xs">View Processed</span>
            </Button>
          </Link>
          
          <Link href="/telegram-settings">
            <Button 
              variant="outline" 
              className="flex flex-col h-24 w-full gap-1 items-center justify-center"
            >
              <Send className="h-5 w-5" />
              <span className="text-xs">Telegram Settings</span>
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            className="flex flex-col h-24 gap-1 items-center justify-center"
            disabled
          >
            <Zap className="h-5 w-5" />
            <span className="text-xs">AI Enhancement</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}