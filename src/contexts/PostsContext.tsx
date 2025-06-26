
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  platforms: string[];
  scheduledFor: Date;
  status: 'scheduled' | 'draft' | 'published' | 'failed' | 'publishing';
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

const STORAGE_KEY = 'ekclickpost_scheduled_posts';

// Helper function to serialize posts for localStorage
const serializePosts = (posts: ScheduledPost[]) => {
  return posts.map(post => ({
    ...post,
    scheduledFor: post.scheduledFor.toISOString(),
    media: post.media?.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }))
  }));
};

// Helper function to deserialize posts from localStorage
const deserializePosts = (serializedPosts: any[]): ScheduledPost[] => {
  return serializedPosts.map(post => ({
    ...post,
    scheduledFor: new Date(post.scheduledFor),
    media: post.media?.map((fileData: any) => {
      // Create a mock File object for display purposes
      const mockFile = new File([''], fileData.name, {
        type: fileData.type,
        lastModified: fileData.lastModified
      });
      Object.defineProperty(mockFile, 'size', { value: fileData.size });
      return mockFile;
    })
  }));
};

export const PostsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load posts from localStorage on mount
  useEffect(() => {
    try {
      const storedPosts = localStorage.getItem(STORAGE_KEY);
      if (storedPosts) {
        const parsedPosts = JSON.parse(storedPosts);
        const deserializedPosts = deserializePosts(parsedPosts);
        setScheduledPosts(deserializedPosts);
        console.log('Loaded posts from localStorage:', deserializedPosts.length);
      }
    } catch (error) {
      console.error('Failed to load posts from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save posts to localStorage whenever posts change
  useEffect(() => {
    if (!isLoaded) return; // Don't save during initial load
    
    try {
      const serializedPosts = serializePosts(scheduledPosts);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializedPosts));
      console.log('Saved posts to localStorage:', scheduledPosts.length);
    } catch (error) {
      console.error('Failed to save posts to localStorage:', error);
    }
  }, [scheduledPosts, isLoaded]);

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
    console.log('Added new post:', newPost.title);
  };

  const updateScheduledPost = (id: string, updates: Partial<ScheduledPost>) => {
    setScheduledPosts(prev => 
      prev.map(post => 
        post.id === id 
          ? { ...post, ...updates, color: updates.platforms ? generateColor(updates.platforms) : post.color }
          : post
      )
    );
    console.log('Updated post:', id);
  };

  const deleteScheduledPost = (id: string) => {
    setScheduledPosts(prev => prev.filter(post => post.id !== id));
    console.log('Deleted post:', id);
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
