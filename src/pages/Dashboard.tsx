import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Users, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePosts } from '@/contexts/PostsContext';
import { useSocialAccounts } from '@/contexts/SocialAccountsContext';
import { format, isThisMonth, isToday, addDays } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { scheduledPosts } = usePosts();
  const { accounts } = useSocialAccounts();

  // Calculate real metrics from actual data
  const activeAccounts = accounts.filter(account => account.is_active);
  const postsThisMonth = scheduledPosts.filter(post => isThisMonth(post.scheduled_for));
  const publishedPosts = scheduledPosts.filter(post => post.status === 'published');
  const todaysPosts = scheduledPosts.filter(post => isToday(post.scheduled_for));
  const upcomingPosts = scheduledPosts.filter(post => {
    const now = new Date();
    const weekFromNow = addDays(now, 7);
    return post.scheduled_for >= now && post.scheduled_for <= weekFromNow;
  }).slice(0, 5);

  const statsData = [
    {
      title: 'Posts Scheduled',
      value: scheduledPosts.length.toString(),
      change: scheduledPosts.length > 0 ? `${scheduledPosts.length} total` : 'No posts yet',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Connected Accounts',
      value: activeAccounts.length.toString(),
      change: activeAccounts.length > 0 ? `${activeAccounts.length} active` : 'Connect accounts',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Posts This Month',
      value: postsThisMonth.length.toString(),
      change: postsThisMonth.length > 0 ? `${postsThisMonth.length} scheduled` : 'No posts this month',
      icon: Plus,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Published Posts',
      value: publishedPosts.length.toString(),
      change: publishedPosts.length > 0 ? `${publishedPosts.length} published` : 'No posts published',
      icon: CheckCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Monitor your social media performance and manage your content
          </p>
        </div>
        <Link to="/create">
          <Button className="gradient-bg text-white hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </Link>
      </div>

      {/* Real Metrics */}
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
        {/* Recent Activity */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Activity
              <Link to="/calendar">
                <Button variant="outline" size="sm">
                  View Calendar
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scheduledPosts.length > 0 ? (
                scheduledPosts.slice(0, 3).map((post) => (
                  <div key={post.id} className="flex items-start gap-4 p-4 rounded-lg bg-slate-50">
                    <div className="flex-1">
                      <p className="text-sm text-slate-900 mb-2 line-clamp-2">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex gap-1">
                          {post.platforms.map((platform) => (
                            <span key={platform} className="px-2 py-1 bg-brand-100 text-brand-700 rounded-full">
                              {platform}
                            </span>
                          ))}
                        </div>
                        <span>{format(post.scheduled_for, 'MMM d, yyyy HH:mm')}</span>
                        <span className={`px-2 py-1 rounded-full ${
                          post.status === 'scheduled' 
                            ? 'bg-green-100 text-green-700' 
                            : post.status === 'published'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No posts created yet</p>
                  <Link to="/create">
                    <Button variant="outline" className="mt-4" size="sm">
                      Create Your First Post
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Posts */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingPosts.length > 0 ? (
                upcomingPosts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-1">{post.title}</h4>
                      <p className="text-xs text-slate-600 mt-1">
                        {format(post.scheduled_for, 'MMM d, yyyy HH:mm')}
                      </p>
                      <div className="flex gap-1 mt-2">
                        {post.platforms.map((platform) => (
                          <Badge key={platform} variant="secondary" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge variant={post.status === 'scheduled' ? 'default' : 'outline'}>
                      {post.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming posts</p>
                  <Link to="/create">
                    <Button variant="outline" className="mt-4" size="sm">
                      Schedule a Post
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {activeAccounts.length === 0 && (
        <Card className="border-0 shadow-md bg-gradient-to-r from-brand-50 to-purple-50">
          <CardContent className="p-6">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-brand-600" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Connect Your Social Media Accounts
              </h3>
              <p className="text-slate-600 mb-4">
                Get started by connecting your social media accounts to begin posting content.
              </p>
              <Link to="/accounts">
                <Button className="gradient-bg text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Accounts
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Posts */}
      {todaysPosts.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Posts ({todaysPosts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaysPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{post.title}</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      {format(post.scheduled_for, 'HH:mm')} • {post.platforms.join(', ')}
                    </p>
                  </div>
                  <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                    {post.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};