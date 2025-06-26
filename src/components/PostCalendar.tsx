
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

const MOCK_SCHEDULED_POSTS = [
  {
    id: '1',
    title: 'Product Launch Announcement',
    content: 'Exciting news! Our new product is here...',
    platforms: ['facebook', 'linkedin'],
    scheduledFor: new Date(2024, 11, 28, 10, 0),
    status: 'scheduled',
    color: 'bg-blue-500'
  },
  {
    id: '2',
    title: 'Behind the Scenes Content',
    content: 'Take a look at our amazing team...',
    platforms: ['instagram', 'facebook'],
    scheduledFor: new Date(2024, 11, 29, 14, 30),
    status: 'scheduled',
    color: 'bg-purple-500'
  },
  {
    id: '3',
    title: 'Industry Insights',
    content: 'Latest trends in our industry...',
    platforms: ['linkedin', 'twitter'],
    scheduledFor: new Date(2024, 11, 30, 9, 0),
    status: 'draft',
    color: 'bg-green-500'
  }
];

interface PostCalendarProps {
  onPostClick?: (post: any) => void;
  onDateClick?: (date: Date) => void;
}

export const PostCalendar: React.FC<PostCalendarProps> = ({
  onPostClick,
  onDateClick
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [scheduledPosts] = useState(MOCK_SCHEDULED_POSTS);

  const getPostsForDate = (date: Date) => {
    return scheduledPosts.filter(post => 
      isSameDay(post.scheduledFor, date)
    );
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateClick?.(date);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const renderCalendarDay = (date: Date) => {
    const posts = getPostsForDate(date);
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isCurrentDay = isToday(date);

    return (
      <div
        className={`min-h-[100px] p-2 border-r border-b cursor-pointer hover:bg-slate-50 ${
          isSelected ? 'bg-brand-50 border-brand-200' : ''
        } ${isCurrentDay ? 'bg-blue-50' : ''}`}
        onClick={() => handleDateSelect(date)}
      >
        <div className={`text-sm font-medium mb-2 ${
          isCurrentDay ? 'text-blue-600' : 'text-slate-900'
        }`}>
          {format(date, 'd')}
        </div>
        <div className="space-y-1">
          {posts.slice(0, 3).map((post) => (
            <div
              key={post.id}
              className={`text-xs p-1 rounded cursor-pointer ${post.color} text-white truncate`}
              onClick={(e) => {
                e.stopPropagation();
                onPostClick?.(post);
              }}
            >
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(post.scheduledFor, 'HH:mm')}
              </div>
              <div className="truncate">{post.title}</div>
            </div>
          ))}
          {posts.length > 3 && (
            <div className="text-xs text-slate-500">
              +{posts.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Content Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border">
                <Button
                  variant={view === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('month')}
                >
                  Month
                </Button>
                <Button
                  variant={view === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('week')}
                >
                  Week
                </Button>
                <Button
                  variant={view === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('day')}
                >
                  Day
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold">
                  {format(currentDate, 'MMMM yyyy')}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Scheduled</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Draft</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Failed</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      {view === 'month' && (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7">
              {/* Week Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-4 border-r border-b bg-slate-50 text-center font-medium">
                  {day}
                </div>
              ))}
              
              {/* Calendar Days */}
              {calendarDays.map((date) => (
                <div key={date.toISOString()}>
                  {renderCalendarDay(date)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Date Details */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>
              Posts for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getPostsForDate(selectedDate).map((post) => (
                <div key={post.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{post.title}</h4>
                      <Badge variant={post.status === 'scheduled' ? 'default' : 'secondary'}>
                        {post.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{post.content}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(post.scheduledFor, 'HH:mm')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {post.platforms.join(', ')}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onPostClick?.(post)}>
                    Edit
                  </Button>
                </div>
              ))}
              {getPostsForDate(selectedDate).length === 0 && (
                <p className="text-center text-slate-500 py-8">
                  No posts scheduled for this date
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
