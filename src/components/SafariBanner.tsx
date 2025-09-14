import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, RefreshCw, ExternalLink } from 'lucide-react';
import { safariStorageAdapter, type StorageInfo } from '@/lib/safari-storage-adapter';

export const SafariBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [safariIssue, setSafariIssue] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

  useEffect(() => {
    checkSafariIssues();
  }, []);

  const checkSafariIssues = () => {
    const info = safariStorageAdapter.getStorageInfo();
    setStorageInfo(info);

    if (info.isSafari) {
      // Check if using localhost which might cause HMR issues in Safari
      const isLocalhost = window.location.hostname === 'localhost';
      const currentUrl = window.location.href;
      
      if (isLocalhost && !window.location.href.includes('192.168.')) {
        setSafariIssue('localhost_hmr');
        setShowBanner(true);
      } else if (info.isPrivateMode) {
        setSafariIssue('private_mode');
        setShowBanner(true);
      } else if (!info.isLocalStorageAvailable) {
        setSafariIssue('storage_restricted');
        setShowBanner(true);
      } else {
        // Safari detected but working normally
        setShowBanner(false);
      }
    } else {
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowBanner(false);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleHelp = () => {
    // Open Safari help in new tab
    window.open('https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac', '_blank');
  };

  if (!showBanner || isDismissed || !safariIssue) {
    return null;
  }

  const getIssueDetails = () => {
    switch (safariIssue) {
      case 'localhost_hmr':
        return {
          title: 'Safari Localhost Compatibility Issue',
          description: 'Safari may have issues with localhost for hot reloading. For better development experience, use the IP address instead.',
          action: 'Switch to IP Address',
          actionUrl: window.location.href.replace('localhost', '192.168.178.105')
        };
      case 'private_mode':
        return {
          title: 'Safari Private Browsing Detected',
          description: 'Private browsing mode restricts session storage. For the best experience, please use a regular Safari window.',
          action: 'Open in Regular Window',
          actionUrl: window.location.href
        };
      case 'storage_restricted':
        return {
          title: 'Safari Storage Restrictions',
          description: 'Safari has restricted localStorage access. This may affect session persistence. Try adjusting your privacy settings.',
          action: 'Check Privacy Settings',
          actionFn: handleHelp
        };
      default:
        return {
          title: 'Safari Compatibility Issue',
          description: 'Safari security settings may affect session management.',
          action: 'Learn More',
          actionFn: handleHelp
        };
    }
  };

  const issueDetails = getIssueDetails();

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <Shield className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <div className="font-medium text-orange-800 mb-1">
            {issueDetails.title}
          </div>
          <div className="text-orange-700 text-sm">
            {issueDetails.description}
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-2 text-xs text-orange-600">
              <summary className="cursor-pointer">Debug Info</summary>
              <pre className="mt-1 text-xs bg-orange-100 p-2 rounded">
                {JSON.stringify(storageInfo, null, 2)}
              </pre>
            </details>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          {issueDetails.actionFn && (
            <Button
              variant="outline"
              size="sm"
              onClick={issueDetails.actionFn}
              className="h-8 px-3 text-orange-700 border-orange-300 hover:bg-orange-100"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              {issueDetails.action}
            </Button>
          )}
          {issueDetails.actionUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(issueDetails.actionUrl, '_blank')}
              className="h-8 px-3 text-orange-700 border-orange-300 hover:bg-orange-100"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              {issueDetails.action}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8 px-3 text-orange-700 border-orange-300 hover:bg-orange-100"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0 text-orange-700 hover:bg-orange-100"
          >
            ×
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default SafariBanner;