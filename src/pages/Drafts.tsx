import React from 'react';
import { DraftPostsList } from '@/components/DraftPostsList';

export const Drafts: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Drafts</h1>
        <p className="text-slate-600 mt-1">
          View and manage your draft posts
        </p>
      </div>
      
      <DraftPostsList />
    </div>
  );
};
