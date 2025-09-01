import { format, formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

// Get user's current timezone
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    // Fallback to UTC if timezone detection fails
    return 'UTC';
  }
};

// Convert local time to UTC for storage
export const localTimeToUTC = (localDateTime: Date, timezone: string): Date => {
  try {
    return fromZonedTime(localDateTime, timezone);
  } catch (error) {
    // Fallback: assume the date is already in the specified timezone
    return localDateTime;
  }
};

// Convert UTC time back to user's local timezone for display
export const utcToLocalTime = (utcDateTime: Date, timezone: string): Date => {
  try {
    return toZonedTime(utcDateTime, timezone);
  } catch (error) {
    // Fallback: return UTC time if conversion fails
    return utcDateTime;
  }
};

// Format time for display in user's timezone
export const formatTimeInTimezone = (
  utcDateTime: Date, 
  timezone: string, 
  formatString: string = 'PPP p'
): string => {
  try {
    return formatInTimeZone(utcDateTime, timezone, formatString);
  } catch (error) {
    // Fallback: format in UTC
    return format(utcDateTime, formatString);
  }
};

// Get relative time (e.g., "2 hours from now")
export const getRelativeTime = (utcDateTime: Date, userTimezone: string): string => {
  const now = new Date();
  const userLocalTime = utcToLocalTime(utcDateTime, userTimezone);
  const userNow = utcToLocalTime(now, userTimezone);
  
  const diff = userLocalTime.getTime() - userNow.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} from now`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} from now`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} from now`;
  } else if (diff > 0) {
    return 'Less than a minute from now';
  } else {
    return 'Overdue';
  }
};

// Check if a post is due for publishing
export const isPostDueForPublishing = (utcScheduledTime: Date): boolean => {
  const now = new Date();
  return utcScheduledTime <= now;
};

// Get next publishing time (for cron job optimization)
export const getNextPublishingTime = (posts: Array<{ scheduled_for: Date }>): Date | null => {
  const now = new Date();
  const futurePosts = posts
    .filter(post => post.scheduled_for > now)
    .sort((a, b) => a.scheduled_for.getTime() - b.scheduled_for.getTime());
  
  return futurePosts.length > 0 ? futurePosts[0].scheduled_for : null;
};
