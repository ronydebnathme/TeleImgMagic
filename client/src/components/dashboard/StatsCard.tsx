import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { ReactNode } from "react";

interface StatsCardProps {
  icon: ReactNode;
  iconBgClass: string;
  iconColorClass: string;
  title: string;
  value: string | number;
  footer?: ReactNode;
}

export default function StatsCard({ 
  icon, 
  iconBgClass, 
  iconColorClass,
  title, 
  value,
  footer
}: StatsCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-full ${iconBgClass}`}>
            <span className={iconColorClass}>{icon}</span>
          </div>
          <span className="text-sm font-medium">{title}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {footer && (
          <div className="text-xs text-muted-foreground mt-1">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}