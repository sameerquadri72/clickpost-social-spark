import React from 'react';
import { ScheduledPostsList } from '@/components/ScheduledPostsList';

export const ScheduledPosts: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Scheduled Posts</h1>
        <p className="text-slate-600 mt-1">
          View and manage your scheduled posts
        </p>
      </div>
      
      <ScheduledPostsList />
    </div>
  );
};
