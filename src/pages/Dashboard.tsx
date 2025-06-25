
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Settings, User } from 'lucide-react';

const statsData = [
  {
    title: 'Posts Scheduled',
    value: '24',
    change: '+12%',
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    title: 'Connected Accounts',
    value: '8',
    change: '+2',
    icon: User,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    title: 'Posts This Month',
    value: '156',
    change: '+23%',
    icon: Plus,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    title: 'Engagement Rate',
    value: '4.2%',
    change: '+0.8%',
    icon: Settings,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  }
];

const recentPosts = [
  {
    id: 1,
    content: 'Just launched our new product line! 🚀 Check it out on our website.',
    platform: 'Facebook',
    scheduledFor: '2024-01-15 2:00 PM',
    status: 'scheduled'
  },
  {
    id: 2,
    content: 'Behind the scenes at our latest photoshoot ✨',
    platform: 'Instagram',
    scheduledFor: '2024-01-15 4:30 PM',
    status: 'scheduled'
  },
  {
    id: 3,
    content: 'Excited to announce our partnership with @techcorp!',
    platform: 'X',
    scheduledFor: '2024-01-16 10:00 AM',
    status: 'draft'
  }
];

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Monitor your social media performance and manage your content
          </p>
        </div>
        <Button className="gradient-bg text-white hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />
          Create Post
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <Card key={index} className="hover-lift border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                  <p className={`text-sm ${stat.color} font-medium`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Activity
              <Button variant="outline" size="sm">
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div key={post.id} className="flex items-start gap-4 p-4 rounded-lg bg-slate-50">
                  <div className="flex-1">
                    <p className="text-sm text-slate-900 mb-2">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="px-2 py-1 bg-brand-100 text-brand-700 rounded-full">
                        {post.platform}
                      </span>
                      <span>{post.scheduledFor}</span>
                      <span className={`px-2 py-1 rounded-full ${
                        post.status === 'scheduled' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {post.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Upcoming Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-8 text-slate-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming posts scheduled</p>
                <Button variant="outline" className="mt-4" size="sm">
                  Schedule a Post
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
