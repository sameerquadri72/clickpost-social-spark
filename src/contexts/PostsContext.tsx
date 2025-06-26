
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  platforms: string[];
  scheduledFor: Date;
  status: 'scheduled' | 'draft' | 'published' | 'failed';
  color: string;
  media?: File[];
  timeZone: string;
  repeat?: string;
}

interface PostsContextType {
  scheduledPosts: ScheduledPost[];
  addScheduledPost: (post: Omit<ScheduledPost, 'id' | 'color'>) => void;
  updateScheduledPost: (id: string, updates: Partial<ScheduledPost>) => void;
  deleteScheduledPost: (id: string) => void;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

const PLATFORM_COLORS = {
  facebook: 'bg-blue-500',
  twitter: 'bg-sky-500',
  linkedin: 'bg-blue-700',
  instagram: 'bg-pink-500',
  multi: 'bg-purple-500'
};

export const PostsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);

  const generateColor = (platforms: string[]) => {
    if (platforms.length === 1) {
      return PLATFORM_COLORS[platforms[0] as keyof typeof PLATFORM_COLORS] || 'bg-gray-500';
    }
    return PLATFORM_COLORS.multi;
  };

  const addScheduledPost = (post: Omit<ScheduledPost, 'id' | 'color'>) => {
    const newPost: ScheduledPost = {
      ...post,
      id: Date.now().toString(),
      color: generateColor(post.platforms)
    };
    setScheduledPosts(prev => [...prev, newPost]);
  };

  const updateScheduledPost = (id: string, updates: Partial<ScheduledPost>) => {
    setScheduledPosts(prev => 
      prev.map(post => 
        post.id === id 
          ? { ...post, ...updates, color: updates.platforms ? generateColor(updates.platforms) : post.color }
          : post
      )
    );
  };

  const deleteScheduledPost = (id: string) => {
    setScheduledPosts(prev => prev.filter(post => post.id !== id));
  };

  return (
    <PostsContext.Provider value={{
      scheduledPosts,
      addScheduledPost,
      updateScheduledPost,
      deleteScheduledPost
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
