import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  CheckCircle,
  AlertCircle,
  Clock,
  Wifi,
  WifiOff,
  Activity,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { socketService } from '@/services/socketService';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

const EnhancedNotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Real-time state
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<string[]>([]);
  const [activityLog, setActivityLog] = useState<Array<{
    id: string;
    action: string;
    timestamp: Date;
    status: 'success' | 'error' | 'pending';
  }>>([]);

  // Helper functions
  const addActivityLog = useCallback((action: string, status: 'success' | 'error' | 'pending') => {
    const logEntry = {
      id: Date.now().toString(),
      action,
      timestamp: new Date(),
      status
    };
    setActivityLog(prev => [logEntry, ...prev.slice(0, 49)]);
  }, []);

  const addPendingChange = useCallback((change: string) => {
    setPendingChanges(prev => [...prev, change]);
  }, []);

  const removePendingChange = useCallback((change: string) => {
    setPendingChanges(prev => prev.filter(c => c !== change));
  }, []);

  // Initialize component
  useEffect(() => {
    // Real-time connection monitoring
    const handleSocketConnect = () => {
      setIsOnline(true);
      addActivityLog('Real-time connection established', 'success');
    };

    const handleSocketDisconnect = () => {
      setIsOnline(false);
      addActivityLog('Real-time connection lost', 'error');
    };

    // Connect socket events
    socketService.connect();
    
    // Monitor connection status
    const checkConnection = () => {
              setIsOnline(socketService.getConnectionStatus());
    };
    
    // Check connection periodically
    const interval = setInterval(checkConnection, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, [addActivityLog]);

  return (
    <div className="space-y-6">
      {/* Real-time Status */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {isOnline ? 'Real-time Active' : 'Offline'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {syncStatus === 'synced' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {syncStatus === 'syncing' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                {syncStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                <span className="text-sm text-muted-foreground">
                  Last sync: {lastSync.toLocaleTimeString()}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {pendingChanges.length > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {pendingChanges.length} pending
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Real-time Notification Settings</span>
          </CardTitle>
          <CardDescription>
            Configure your notification preferences with live updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <Label className="text-sm font-medium">Real-time Updates</Label>
                <p className="text-xs text-muted-foreground">Receive live updates</p>
              </div>
            </div>
            <Switch
              checked={realTimeUpdates}
              onCheckedChange={setRealTimeUpdates}
            />
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Activity Log</span>
          </CardTitle>
          <CardDescription>
            Recent changes to your notification settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activityLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>No activity yet</p>
              </div>
            ) : (
              activityLog.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center space-x-2">
                    {log.status === 'success' && (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                    {log.status === 'error' && (
                      <AlertCircle className="h-3 w-3 text-red-500" />
                    )}
                    {log.status === 'pending' && (
                      <Clock className="h-3 w-3 text-yellow-500" />
                    )}
                    <span className="text-xs">{log.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedNotificationSettings;
