
import React from 'react';
import { PostCreationForm } from '@/components/PostCreationForm';

export const CreatePost: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create New Post</h1>
        <p className="text-slate-600 mt-1">
          Create and customize content for multiple social media platforms
        </p>
      </div>
      
      <PostCreationForm />
    </div>
  );
};
