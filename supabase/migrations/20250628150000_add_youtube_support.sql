-- Add YouTube platform support to social_accounts table
-- This migration updates the platform check constraint to include 'youtube'

-- First, drop the existing constraint
ALTER TABLE public.social_accounts 
DROP CONSTRAINT IF EXISTS social_accounts_platform_check;

-- Add the new constraint that includes YouTube
ALTER TABLE public.social_accounts 
ADD CONSTRAINT social_accounts_platform_check 
CHECK (platform IN ('linkedin', 'facebook', 'twitter', 'instagram', 'youtube'));

-- Add a comment to document the supported platforms
COMMENT ON COLUMN public.social_accounts.platform IS 'Supported social media platforms: linkedin, facebook, twitter, instagram, youtube';
