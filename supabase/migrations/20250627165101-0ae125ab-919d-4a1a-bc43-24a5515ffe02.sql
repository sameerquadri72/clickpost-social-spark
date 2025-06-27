
-- Create a table to store social media accounts and tokens
CREATE TABLE public.social_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'twitter', 'instagram')),
  platform_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT,
  profile_image TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_secret TEXT, -- For Twitter OAuth 1.0a
  page_access_token TEXT, -- For Facebook pages
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}', -- Store additional platform-specific data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate accounts
CREATE UNIQUE INDEX idx_social_accounts_user_platform_id 
ON public.social_accounts (user_id, platform, platform_user_id);

-- Enable RLS
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for social accounts
CREATE POLICY "Users can view their own social accounts" 
  ON public.social_accounts 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social accounts" 
  ON public.social_accounts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social accounts" 
  ON public.social_accounts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social accounts" 
  ON public.social_accounts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create a table to store OAuth state parameters for security
CREATE TABLE public.oauth_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  redirect_url TEXT,
  oauth_token_secret TEXT, -- For Twitter OAuth 1.0a temporary secret
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- Enable RLS for oauth_states
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own oauth states" 
  ON public.oauth_states 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Create function to clean up expired oauth states
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.oauth_states WHERE expires_at < now();
END;
$$;
