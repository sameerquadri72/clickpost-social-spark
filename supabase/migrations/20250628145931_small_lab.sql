/*
  # Social Media Accounts and OAuth State Management

  1. New Tables
    - `social_accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `platform` (text, constrained to specific platforms)
      - `platform_user_id` (text)
      - `name` (text)
      - `username` (text)
      - `email` (text, optional)
      - `profile_image` (text, optional)
      - `access_token` (text)
      - `refresh_token` (text, optional)
      - `token_secret` (text, optional for Twitter OAuth 1.0a)
      - `page_access_token` (text, optional for Facebook pages)
      - `expires_at` (timestamp, optional)
      - `is_active` (boolean, default true)
      - `metadata` (jsonb, default empty object)
      - `created_at` (timestamp, default now)
      - `updated_at` (timestamp, default now)
    - `oauth_states`
      - `id` (uuid, primary key)
      - `state_token` (text, unique)
      - `platform` (text)
      - `user_id` (uuid, foreign key to auth.users)
      - `redirect_url` (text, optional)
      - `oauth_token_secret` (text, optional for Twitter OAuth 1.0a)
      - `created_at` (timestamp, default now)
      - `expires_at` (timestamp, default now + 10 minutes)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own data only

  3. Functions
    - Add cleanup function for expired OAuth states
*/

-- Create social_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.social_accounts (
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

-- Create unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'social_accounts' 
    AND indexname = 'idx_social_accounts_user_platform_id'
  ) THEN
    CREATE UNIQUE INDEX idx_social_accounts_user_platform_id 
    ON public.social_accounts (user_id, platform, platform_user_id);
  END IF;
END $$;

-- Enable RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'social_accounts' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies for social accounts (drop and recreate to ensure they're correct)
DROP POLICY IF EXISTS "Users can view their own social accounts" ON public.social_accounts;
CREATE POLICY "Users can view their own social accounts" 
  ON public.social_accounts 
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own social accounts" ON public.social_accounts;
CREATE POLICY "Users can insert their own social accounts" 
  ON public.social_accounts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own social accounts" ON public.social_accounts;
CREATE POLICY "Users can update their own social accounts" 
  ON public.social_accounts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own social accounts" ON public.social_accounts;
CREATE POLICY "Users can delete their own social accounts" 
  ON public.social_accounts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create oauth_states table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  redirect_url TEXT,
  oauth_token_secret TEXT, -- For Twitter OAuth 1.0a temporary secret
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- Enable RLS for oauth_states if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'oauth_states' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies for oauth_states (drop and recreate to ensure they're correct)
DROP POLICY IF EXISTS "Users can manage their own oauth states" ON public.oauth_states;
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