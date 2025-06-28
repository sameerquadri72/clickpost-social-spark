import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useSocialAccounts } from '@/contexts/SocialAccountsContext';
import { useToast } from '@/hooks/use-toast';

export const OAuthCallbackHandler: React.FC = () => {
  const { platform } = useParams<{ platform: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAccounts } = useSocialAccounts();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth callback...');
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      if (!platform) {
        setStatus('error');
        setMessage('Invalid platform specified');
        return;
      }

      try {
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors from provider
        if (error) {
          throw new Error(`OAuth error: ${errorDescription || error}`);
        }

        setMessage(`Processing ${platform.charAt(0).toUpperCase() + platform.slice(1)} connection...`);

        // The actual OAuth processing is handled by the Edge Functions
        // This component just handles the redirect and shows status
        
        // Check if we have success parameter (set by Edge Function redirect)
        const success = searchParams.get('success');
        if (success) {
          setStatus('success');
          setMessage(`Successfully connected your ${platform.charAt(0).toUpperCase() + platform.slice(1)} account!`);

          // Refresh accounts to show the new connection
          await refreshAccounts();

          toast({
            title: "Account Connected",
            description: `Your ${platform.charAt(0).toUpperCase() + platform.slice(1)} account has been successfully connected.`,
          });

          // Redirect to accounts page after a short delay
          setTimeout(() => {
            navigate('/accounts');
          }, 2000);
        } else {
          // If no success parameter, this might be an intermediate step
          // The Edge Function will handle the actual processing
          setMessage('Completing OAuth flow...');
          
          // Wait a moment then redirect to accounts page
          setTimeout(() => {
            navigate('/accounts');
          }, 3000);
        }

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setMessage(`Failed to connect ${platform?.charAt(0).toUpperCase() + platform?.slice(1)} account`);
        setErrorDetails(errorMessage);
        
        toast({
          title: "Connection Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    };

    handleCallback();
  }, [platform, searchParams, navigate, refreshAccounts, toast]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className={`w-full max-w-md ${getStatusColor()}`}>
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'loading' && 'Connecting Account'}
            {status === 'success' && 'Connection Successful'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex justify-center">
            {getStatusIcon()}
          </div>
          
          <p className="text-slate-600">{message}</p>
          
          {status === 'error' && errorDetails && (
            <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg text-left">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error Details:</p>
                  <p className="text-sm text-red-700 mt-1">{errorDetails}</p>
                  {errorDetails.includes('credentials') && (
                    <div className="mt-2 text-xs text-red-600">
                      <p>OAuth credentials may not be configured on the server.</p>
                      <p>Contact your administrator to set up the required secrets.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/accounts')} variant="outline">
                Return to Accounts
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="ghost"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          )}
          
          {status === 'success' && (
            <p className="text-sm text-green-600">
              Redirecting to accounts page...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};