
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useSocialAccounts } from '@/contexts/SocialAccountsContext';
import { useToast } from '@/hooks/use-toast';

export const SocialAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAccounts } = useSocialAccounts();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const success = searchParams.get('success');
        const error = searchParams.get('error');
        const platform = searchParams.get('platform');

        if (error) {
          throw new Error(`Authentication error: ${error}`);
        }

        if (success === 'true' && platform) {
          setMessage(`Successfully connected ${platform} account!`);
          setStatus('success');

          // Refresh accounts to show the new connection
          await refreshAccounts();

          toast({
            title: "Account Connected",
            description: `Your ${platform} account has been successfully connected.`,
          });

          // Redirect to accounts page after a short delay
          setTimeout(() => {
            navigate('/accounts');
          }, 2000);
        } else {
          throw new Error('Authentication failed');
        }

      } catch (error) {
        console.error('Authentication callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication failed');
        
        toast({
          title: "Connection Failed",
          description: "Failed to connect your social media account. Please try again.",
          variant: "destructive",
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshAccounts, toast]);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Connecting Account</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex justify-center">
            {getStatusIcon()}
          </div>
          <p className="text-slate-600">{message}</p>
          {status === 'error' && (
            <Button onClick={() => navigate('/accounts')} variant="outline">
              Return to Accounts
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
