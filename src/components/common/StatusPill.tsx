'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import type { ConnectionStatus } from '@/lib/api/types';

interface StatusPillProps {
  status: ConnectionStatus;
}

export const StatusPill = ({ status }: StatusPillProps) => {
  const getStatusInfo = () => {
    if (status.connected) {
      return {
        icon: Wifi,
        label: 'Connected',
        variant: 'default' as const,
        color: 'text-green-600',
        tooltip: status.latencyMs
          ? `Connected (${status.latencyMs}ms latency)`
          : 'Connected to server',
      };
    } else if (status.error) {
      return {
        icon: AlertCircle,
        label: 'Error',
        variant: 'destructive' as const,
        color: 'text-red-600',
        tooltip: `Connection error: ${status.error}`,
      };
    } else {
      return {
        icon: WifiOff,
        label: 'Disconnected',
        variant: 'secondary' as const,
        color: 'text-gray-600',
        tooltip: 'Not connected to server',
      };
    }
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={statusInfo.variant} className="gap-1">
          <Icon className={`h-3 w-3 ${statusInfo.color}`} />
          {statusInfo.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{statusInfo.tooltip}</p>
        {status.lastConnected && (
          <p className="text-xs text-muted-foreground">
            Last connected:{' '}
            {new Date(status.lastConnected).toLocaleTimeString()}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};
