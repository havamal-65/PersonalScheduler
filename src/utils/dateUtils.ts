import {
  startOfDay,
  endOfDay,
  differenceInDays,
  differenceInHours,
  addDays,
  format,
  isSameDay,
  isWithinInterval,
  min,
  max,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isWeekend
} from 'date-fns';
import { Task } from '../types';

export interface TimelineRange {
  start: Date;
  end: Date;
  totalDays: number;
}

// Calculate the timeline range based on tasks
export function calculateTimelineRange(tasks: Task[], paddingDays = 3): TimelineRange {
  if (tasks.length === 0) {
    const today = startOfDay(new Date());
    return {
      start: today,
      end: addDays(today, 14),
      totalDays: 14,
    };
  }

  const allStartDates = tasks.map(t => t.startDate);
  const allEndDates = tasks.map(t => t.endDate);

  const earliestStart = startOfDay(min(allStartDates));
  const latestEnd = endOfDay(max(allEndDates));

  // Add padding
  const start = addDays(earliestStart, -paddingDays);
  const end = addDays(latestEnd, paddingDays);

  return {
    start,
    end,
    totalDays: differenceInDays(end, start) + 1,
  };
}

// Get position of a date within the timeline (as percentage)
export function getDatePosition(date: Date, timelineRange: TimelineRange): number {
  const totalDays = timelineRange.totalDays;
  const dayOffset = differenceInDays(date, timelineRange.start);
  return (dayOffset / totalDays) * 100;
}

// Get width of a task bar (as percentage)
export function getTaskWidth(task: Task, timelineRange: TimelineRange): number {
  const taskDays = differenceInDays(task.endDate, task.startDate) || 1;
  return (taskDays / timelineRange.totalDays) * 100;
}

// Generate date markers for the timeline header
export function generateDateMarkers(timelineRange: TimelineRange): { date: Date; label: string; isWeekend: boolean; isToday: boolean }[] {
  const days = eachDayOfInterval({
    start: timelineRange.start,
    end: timelineRange.end,
  });

  const today = startOfDay(new Date());

  return days.map(date => ({
    date,
    label: format(date, 'd'),
    isWeekend: isWeekend(date),
    isToday: isSameDay(date, today),
  }));
}

// Generate month markers for the timeline
export function generateMonthMarkers(timelineRange: TimelineRange): { start: number; width: number; label: string }[] {
  const markers: { start: number; width: number; label: string }[] = [];
  const days = eachDayOfInterval({
    start: timelineRange.start,
    end: timelineRange.end,
  });

  let currentMonth = '';
  let monthStartIndex = 0;

  days.forEach((date, index) => {
    const monthLabel = format(date, 'MMM yyyy');

    if (monthLabel !== currentMonth) {
      if (currentMonth !== '') {
        // Close previous month
        markers.push({
          start: (monthStartIndex / timelineRange.totalDays) * 100,
          width: ((index - monthStartIndex) / timelineRange.totalDays) * 100,
          label: currentMonth,
        });
      }
      currentMonth = monthLabel;
      monthStartIndex = index;
    }
  });

  // Add the last month
  if (currentMonth !== '') {
    markers.push({
      start: (monthStartIndex / timelineRange.totalDays) * 100,
      width: ((days.length - monthStartIndex) / timelineRange.totalDays) * 100,
      label: currentMonth,
    });
  }

  return markers;
}

// Format duration for display
export function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 8) {
    return `${hours.toFixed(1)}h`;
  }
  const days = hours / 8;
  if (days < 1) {
    return `${hours.toFixed(1)}h`;
  }
  return `${days.toFixed(1)}d`;
}

// Check if a task spans a specific date
export function taskSpansDate(task: Task, date: Date): boolean {
  return isWithinInterval(startOfDay(date), {
    start: startOfDay(task.startDate),
    end: endOfDay(task.endDate),
  });
}

// Get today's position on the timeline
export function getTodayPosition(timelineRange: TimelineRange): number | null {
  const today = startOfDay(new Date());

  if (today < timelineRange.start || today > timelineRange.end) {
    return null;
  }

  return getDatePosition(today, timelineRange);
}