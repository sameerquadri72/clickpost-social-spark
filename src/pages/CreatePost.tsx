
import React, { useState } from 'react';
import { ConnectedAccountSelector } from '@/components/ConnectedAccountSelector';

export const CreatePost: React.FC = () => {
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create New Post</h1>
        <p className="text-slate-600 mt-1">
          Select accounts to post to
        </p>
      </div>
      
      <ConnectedAccountSelector 
        selectedAccountIds={selectedAccountIds}
        onAccountChange={setSelectedAccountIds}
      />
    </div>
  );
};
