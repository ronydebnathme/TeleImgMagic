import React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number | null;
  label: string;
  className?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  colorVariant?: "default" | "success" | "warning" | "error";
}

export function ProgressBar({
  progress,
  label,
  className,
  showPercentage = true,
  size = "md",
  colorVariant = "default"
}: ProgressBarProps) {
  // Handle null progress
  const displayProgress = progress === null ? 0 : progress;
  
  // Size classes
  const sizeClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4"
  };
  
  // Color classes
  const colorClasses = {
    default: "bg-primary",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500"
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        {showPercentage && (
          <span className="text-sm text-muted-foreground font-medium">
            {Math.round(displayProgress)}%
          </span>
        )}
      </div>
      <Progress
        value={displayProgress}
        className={cn(sizeClasses[size])}
        indicatorClassName={colorClasses[colorVariant]}
      />
    </div>
  );
}