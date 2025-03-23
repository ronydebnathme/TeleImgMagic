import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressDisplayProps {
  current: number;
  total: number;
  label: string;
}

export function ProgressDisplay({ current, total, label }: ProgressDisplayProps) {
  // Calculate percentage
  const percentage = Math.min(Math.round((current / total) * 100), 100);
  const isComplete = percentage === 100;
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center justify-between">
          {label}
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress 
          value={percentage} 
          className="h-2"
          indicatorClassName={cn(
            isComplete ? "bg-green-500" : "bg-blue-500"
          )}
        />
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>{current} of {total}</span>
          <span>{percentage}%</span>
        </div>
      </CardContent>
    </Card>
  );
}