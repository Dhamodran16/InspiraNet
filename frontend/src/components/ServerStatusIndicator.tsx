import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { checkServerHealth } from '@/services/api';

interface ServerStatusIndicatorProps {
  className?: string;
}

export default function ServerStatusIndicator({ className = '' }: ServerStatusIndicatorProps) {
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkServer = async () => {
    setIsChecking(true);
    try {
      const isOnline = await checkServerHealth();
      setIsServerOnline(isOnline);
    } catch (error) {
      setIsServerOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkServer();
    
    // Check server status every 2 minutes (reduced frequency to prevent rate limiting)
    const interval = setInterval(checkServer, 120000);
    
    return () => clearInterval(interval);
  }, []);

  if (isServerOnline === null || isChecking) {
    return (
      <Badge variant="outline" className={`flex items-center space-x-1 text-foreground border-border ${className}`}>
        <Wifi className="h-3 w-3 animate-pulse" />
        <span className="text-xs">Checking...</span>
      </Badge>
    );
  }

  if (isServerOnline) {
    return (
      <Badge variant="default" className={`flex items-center space-x-1 bg-green-500 hover:bg-green-600 text-white ${className}`}>
        <CheckCircle className="h-3 w-3" />
        <span className="text-xs">Online</span>
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className={`flex items-center space-x-1 ${className}`}>
      <WifiOff className="h-3 w-3" />
      <span className="text-xs">Offline</span>
    </Badge>
  );
}

