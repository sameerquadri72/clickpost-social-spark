import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { authService } from '@/services/authService';
import { useSocialAccounts } from '@/contexts/SocialAccountsContext';
import { useToast } from '@/hooks/use-toast';

export const SocialAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addAccount } = useSocialAccounts();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(`Authentication error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authentication parameters');
        }

        // Extract platform from state
        const platform = state.split('_')[0];
        
        if (!platform) {
          throw new Error('Invalid state parameter');
        }

        setMessage(`Connecting to ${platform}...`);

        // Exchange code for access token
        const tokenResponse = await authService.exchangeCodeForToken(platform, code);
        
        setMessage('Fetching profile information...');

        // Get user profile
        const profile = await authService.getUserProfile(platform, tokenResponse.access_token);

        // Calculate expiration date
        const expiresAt = tokenResponse.expires_in 
          ? new Date(Date.now() + tokenResponse.expires_in * 1000)
          : undefined;

        // Create account object
        const newAccount = {
          id: `${platform}_${profile.id}`,
          platform: platform as any,
          name: profile.name,
          username: profile.username,
          profileImage: profile.profileImage,
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt,
          isActive: true,
          connectedAt: new Date()
        };

        // Add account to context
        addAccount(newAccount);

        setStatus('success');
        setMessage(`Successfully connected ${platform} account!`);

        toast({
          title: "Account Connected",
          description: `Your ${platform} account has been successfully connected.`,
        });

        // Redirect to accounts page after a short delay
        setTimeout(() => {
          navigate('/accounts');
        }, 2000);

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
  }, [searchParams, navigate, addAccount, toast]);

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