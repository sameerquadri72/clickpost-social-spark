
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Clock, Globe, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const TIME_ZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
];

interface SchedulingInterfaceProps {
  onSchedule: (scheduleData: any) => void;
  selectedPlatforms: string[];
}

export const SchedulingInterface: React.FC<SchedulingInterfaceProps> = ({
  onSchedule,
  selectedPlatforms
}) => {
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [scheduleTime, setScheduleTime] = useState('');
  const [timeZone, setTimeZone] = useState('UTC');
  const [repeatOption, setRepeatOption] = useState('none');
  const [conflictWarning, setConflictWarning] = useState(false);

  const handleSchedule = () => {
    if (!scheduleDate || !scheduleTime) return;

    const scheduledDateTime = new Date(scheduleDate);
    const [hours, minutes] = scheduleTime.split(':');
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

    const scheduleData = {
      dateTime: scheduledDateTime,
      timeZone,
      platforms: selectedPlatforms,
      repeat: repeatOption,
    };

    onSchedule(scheduleData);
  };

  const checkConflicts = (date: Date, time: string) => {
    // Simulate conflict detection
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 9 && hour <= 17) {
      setConflictWarning(true);
    } else {
      setConflictWarning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Schedule Post
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduleDate ? format(scheduleDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduleDate}
                  onSelect={setScheduleDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={scheduleTime}
              onChange={(e) => {
                setScheduleTime(e.target.value);
                if (scheduleDate) {
                  checkConflicts(scheduleDate, e.target.value);
                }
              }}
            />
          </div>
        </div>

        <div>
          <Label>Time Zone</Label>
          <Select value={timeZone} onValueChange={setTimeZone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_ZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {tz.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Repeat</Label>
          <Select value={repeatOption} onValueChange={setRepeatOption}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Repeat</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {conflictWarning && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Peak posting time detected. Consider scheduling during off-peak hours for better engagement.
            </span>
          </div>
        )}

        <Button 
          onClick={handleSchedule} 
          className="w-full"
          disabled={!scheduleDate || !scheduleTime}
        >
          Schedule Post
        </Button>
      </CardContent>
    </Card>
  );
};
