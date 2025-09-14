import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export const SessionStatusBanner: React.FC = () => {
  const [sessionIssue, setSessionIssue] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { isAuthenticated, recoverSession } = useAuthContext();

  useEffect(() => {
    let checkInterval: NodeJS.Timeout;
    
    if (isAuthenticated) {
      checkInterval = setInterval(async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error || !session) {
            setSessionIssue('Your session has expired or is invalid.');
            setIsDismissed(false);
          } else {
            // Check if session expires soon
            const expiresAt = new Date(session.expires_at! * 1000);
            const now = new Date();
            const timeUntilExpiry = expiresAt.getTime() - now.getTime();
            const twoMinutes = 2 * 60 * 1000;
            
            if (timeUntilExpiry <= twoMinutes && timeUntilExpiry > 0) {
              setSessionIssue('Your session will expire soon. Click refresh to extend it.');
              setIsDismissed(false);
            } else if (sessionIssue && timeUntilExpiry > twoMinutes) {
              setSessionIssue(null);
              setIsDismissed(false);
            }
          }
        } catch (err) {
          console.error('Session check error:', err);
          setSessionIssue('Unable to verify session status.');
          setIsDismissed(false);
        }
      }, 30000); // Check every 30 seconds
    }
    
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [isAuthenticated, sessionIssue]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await recoverSession();
      setSessionIssue(null);
      setIsDismissed(false);
    } catch (error) {
      console.error('Session refresh failed:', error);
      setSessionIssue('Session refresh failed. Please reload the page.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (!sessionIssue || isDismissed || !isAuthenticated) {
    return null;
  }

  return (
    <Alert className="mb-4 border-yellow-200 bg-yellow-50">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <span className="text-yellow-800">{sessionIssue}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 px-3 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Session'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0 text-yellow-700 hover:bg-yellow-100"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default SessionStatusBanner;