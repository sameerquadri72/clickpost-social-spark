
import React, { useState } from 'react';
import { PostCalendar } from '@/components/PostCalendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Filter, Download, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const handlePostClick = (post: any) => {
    setSelectedPost(post);
    // Here you could open a modal or navigate to edit the post
    console.log('Post clicked:', post);
  };

  const handleDateClick = (date: Date) => {
    console.log('Date clicked:', date);
    // Here you could pre-fill the create post form with the selected date
  };

  const handleCreatePost = () => {
    navigate('/create');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Content Calendar</h1>
          <p className="text-slate-600 mt-1">
            View, manage, and schedule your social media content
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleCreatePost} className="gradient-bg text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </div>
      </div>

      {/* Calendar Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">This Week</p>
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-green-600">+3 from last week</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">This Month</p>
                <p className="text-2xl font-bold">48</p>
                <p className="text-xs text-green-600">+12 from last month</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Drafts</p>
                <p className="text-2xl font-bold">7</p>
                <p className="text-xs text-slate-500">Ready to schedule</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Published</p>
                <p className="text-2xl font-bold">156</p>
                <p className="text-xs text-green-600">This month</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Component */}
      <PostCalendar 
        onPostClick={handlePostClick}
        onDateClick={handleDateClick}
      />

      {/* Upcoming Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Posts (Next 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                id: '1',
                title: 'Weekly Newsletter',
                date: 'Tomorrow, 9:00 AM',
                platforms: ['linkedin', 'facebook'],
                status: 'scheduled'
              },
              {
                id: '2',
                title: 'Product Update',
                date: 'Dec 30, 2:00 PM',
                platforms: ['twitter', 'instagram'],
                status: 'scheduled'
              },
              {
                id: '3',
                title: 'Year End Review',
                date: 'Dec 31, 6:00 PM',
                platforms: ['facebook', 'linkedin', 'twitter'],
                status: 'draft'
              }
            ].map((post) => (
              <div key={post.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    <h4 className="font-medium">{post.title}</h4>
                    <p className="text-sm text-slate-600">{post.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {post.platforms.map((platform) => (
                      <Badge key={platform} variant="secondary" className="text-xs">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                  <Badge variant={post.status === 'scheduled' ? 'default' : 'outline'}>
                    {post.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
