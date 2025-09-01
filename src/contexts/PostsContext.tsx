
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUserTimezone } from '@/utils/timezoneUtils';

export interface ScheduledPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  platforms: string[];
  scheduled_for: Date;
  status: 'scheduled' | 'draft' | 'published' | 'failed' | 'publishing';
  color: string;
  media_urls?: string[];
  time_zone: string;
  repeat?: string;
  created_at: Date;
  updated_at: Date;
}

interface PostsContextType {
  scheduledPosts: ScheduledPost[];
  loading: boolean;
  addScheduledPost: (post: Omit<ScheduledPost, 'id' | 'color' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateScheduledPost: (id: string, updates: Partial<ScheduledPost>) => Promise<void>;
  deleteScheduledPost: (id: string) => Promise<void>;
  refreshPosts: () => Promise<void>;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

const PLATFORM_COLORS = {
  facebook: 'bg-blue-500',
  twitter: 'bg-sky-500',
  linkedin: 'bg-blue-700',
  instagram: 'bg-pink-500',
  youtube: 'bg-red-500',
  multi: 'bg-purple-500'
};

export const PostsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  const generateColor = (platforms: string[]) => {
    if (platforms.length === 1) {
      return PLATFORM_COLORS[platforms[0] as keyof typeof PLATFORM_COLORS] || 'bg-gray-500';
    }
    return PLATFORM_COLORS.multi;
  };

  // Load posts from Supabase on mount
  const refreshPosts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setScheduledPosts([]);
        return;
      }

      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: true });

      if (error) {
        console.error('Failed to load posts from Supabase:', error);
        return;
      }

      // Transform the data to match our interface
      const transformedPosts: ScheduledPost[] = (data || []).map(post => ({
        ...post,
        scheduled_for: new Date(post.scheduled_for),
        created_at: new Date(post.created_at),
        updated_at: new Date(post.updated_at),
        status: post.status as 'scheduled' | 'draft' | 'published' | 'failed' | 'publishing'
      }));

      setScheduledPosts(transformedPosts);
      console.log('Loaded posts from Supabase:', transformedPosts.length);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPosts();

    // Set up real-time subscription
    const channel = supabase
      .channel('scheduled_posts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_posts'
        },
        () => {
          refreshPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addScheduledPost = async (post: Omit<ScheduledPost, 'id' | 'color' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Ensure timezone is set
      const timezone = post.time_zone || getUserTimezone();

      const newPost = {
        ...post,
        user_id: user.id,
        color: generateColor(post.platforms),
        scheduled_for: post.scheduled_for.toISOString(),
        time_zone: timezone
      };

      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert([newPost])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Refresh posts to get the latest data
      await refreshPosts();
      console.log('Added new post:', data.title);
    } catch (error) {
      console.error('Failed to add post:', error);
      throw error;
    }
  };

  const updateScheduledPost = async (id: string, updates: Partial<ScheduledPost>) => {
    try {
      const updateData: any = { ...updates };
      
      // Handle date fields
      if (updates.scheduled_for) {
        updateData.scheduled_for = updates.scheduled_for.toISOString();
      }
      
      // Update color if platforms changed
      if (updates.platforms) {
        updateData.color = generateColor(updates.platforms);
      }

      const { error } = await supabase
        .from('scheduled_posts')
        .update(updateData)
        .eq('id', id);

      if (error) {
        throw error;
      }

      await refreshPosts();
      console.log('Updated post:', id);
    } catch (error) {
      console.error('Failed to update post:', error);
      throw error;
    }
  };

  const deleteScheduledPost = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      await refreshPosts();
      console.log('Deleted post:', id);
    } catch (error) {
      console.error('Failed to delete post:', error);
      throw error;
    }
  };

  return (
    <PostsContext.Provider value={{
      scheduledPosts,
      loading,
      addScheduledPost,
      updateScheduledPost,
      deleteScheduledPost,
      refreshPosts
    }}>
      {children}
    </PostsContext.Provider>
  );
};

export const usePosts = () => {
  const context = useContext(PostsContext);
  if (!context) {
    throw new Error('usePosts must be used within a PostsProvider');
  }
  return context;
};
