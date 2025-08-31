-- Create scheduled_posts table for content creation and publishing
CREATE TABLE public.scheduled_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  platforms TEXT[] NOT NULL CHECK (array_length(platforms, 1) > 0),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'draft', 'published', 'failed', 'publishing')),
  color TEXT NOT NULL,
  media_urls TEXT[],
  time_zone TEXT NOT NULL DEFAULT 'UTC',
  repeat TEXT CHECK (repeat IN ('none', 'daily', 'weekly', 'monthly')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_scheduled_posts_user_id ON public.scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_for ON public.scheduled_posts(scheduled_for);
CREATE INDEX idx_scheduled_posts_platforms ON public.scheduled_posts USING GIN(platforms);

-- Enable RLS
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for scheduled posts
CREATE POLICY "Users can view their own scheduled posts" 
  ON public.scheduled_posts 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled posts" 
  ON public.scheduled_posts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled posts" 
  ON public.scheduled_posts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled posts" 
  ON public.scheduled_posts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_scheduled_posts_updated_at 
  BEFORE UPDATE ON public.scheduled_posts 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.scheduled_posts IS 'Stores scheduled posts for social media publishing';
