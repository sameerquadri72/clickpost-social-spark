
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { usePosts } from '@/contexts/PostsContext';

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
  const { scheduledPosts } = usePosts();

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
        key={date.toISOString()}
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
              className={`text-xs p-1 rounded cursor-pointer ${post.color} text-white truncate hover:opacity-80`}
              onClick={(e) => {
                e.stopPropagation();
                onPostClick?.(post);
              }}
              title={post.title}
            >
              <div className="flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3" />
                {format(post.scheduledFor, 'HH:mm')}
              </div>
              <div className="truncate">{post.title}</div>
            </div>
          ))}
          {posts.length > 3 && (
            <div className="text-xs text-slate-500 bg-slate-100 p-1 rounded">
              +{posts.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  };

  // Get the full calendar grid including previous/next month days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

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
              <div className="text-sm text-slate-600">
                {scheduledPosts.length} posts scheduled
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Facebook</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-sky-500 rounded"></div>
                <span>Twitter</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span>Multi-platform</span>
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
              {calendarDays.map((date) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                return (
                  <div
                    key={date.toISOString()}
                    className={`${!isCurrentMonth ? 'opacity-30' : ''}`}
                  >
                    {renderCalendarDay(date)}
                  </div>
                );
              })}
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
                <div key={post.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{post.title}</h4>
                      <Badge variant={post.status === 'scheduled' ? 'default' : 'secondary'}>
                        {post.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(post.scheduledFor, 'HH:mm')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {post.platforms.join(', ')}
                      </div>
                      {post.timeZone && (
                        <div className="text-xs text-slate-400">
                          {post.timeZone}
                        </div>
                      )}
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
