import { addDays, addHours, startOfDay, differenceInMinutes, format } from 'date-fns';
import { Task, ZoomLevel } from '../types';

export interface TimelineConfig {
  pixelsPerHour: number;
  minIncrement: number; // in hours
  visibleDays: number;
  timeFormat: string;
}

export const ZOOM_CONFIGS: Record<ZoomLevel, TimelineConfig> = {
  day: {
    pixelsPerHour: 60,
    minIncrement: 1,
    visibleDays: 1,
    timeFormat: 'h:mm a',
  },
  'three-day': {
    pixelsPerHour: 30,
    minIncrement: 2,
    visibleDays: 3,
    timeFormat: 'h a',
  },
  week: {
    pixelsPerHour: 15,
    minIncrement: 6,
    visibleDays: 7,
    timeFormat: 'ha',
  },
  month: {
    pixelsPerHour: 2.5,
    minIncrement: 6,
    visibleDays: 30,
    timeFormat: 'EEE',
  },
};

export interface TaskPosition {
  top: number; // pixels from timeline start
  height: number; // pixels
  left: number; // pixels from left (for overlap handling)
  width: number; // percentage or pixels
  column: number; // which column for overlapping tasks
  totalColumns: number; // total overlapping columns at this time
}

export function calculateTaskPosition(
  task: Task,
  timelineStart: Date,
  config: TimelineConfig
): Omit<TaskPosition, 'left' | 'width' | 'column' | 'totalColumns'> {
  const minutesFromStart = differenceInMinutes(task.startDate, timelineStart);
  const hoursFromStart = minutesFromStart / 60;

  const top = Math.max(0, hoursFromStart * config.pixelsPerHour);
  const height = Math.max(
    config.pixelsPerHour * (config.minIncrement / 2), // minimum height
    (task.duration / 60) * config.pixelsPerHour
  );

  return { top, height };
}

export interface OverlapGroup {
  tasks: Task[];
  startTime: Date;
  endTime: Date;
}

export function findOverlappingTasks(tasks: Task[]): OverlapGroup[] {
  if (tasks.length === 0) return [];

  const sorted = [...tasks].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const groups: OverlapGroup[] = [];

  let currentGroup: Task[] = [sorted[0]];
  let groupEnd = addHours(sorted[0].startDate, sorted[0].duration / 60);

  for (let i = 1; i < sorted.length; i++) {
    const task = sorted[i];
    const taskStart = task.startDate;
    const taskEnd = addHours(task.startDate, task.duration / 60);

    if (taskStart < groupEnd) {
      currentGroup.push(task);
      groupEnd = taskEnd > groupEnd ? taskEnd : groupEnd;
    } else {
      groups.push({
        tasks: currentGroup,
        startTime: currentGroup[0].startDate,
        endTime: groupEnd,
      });
      currentGroup = [task];
      groupEnd = taskEnd;
    }
  }

  if (currentGroup.length > 0) {
    groups.push({
      tasks: currentGroup,
      startTime: currentGroup[0].startDate,
      endTime: groupEnd,
    });
  }

  return groups;
}

export function calculateTaskPositions(
  tasks: Task[],
  timelineStart: Date,
  config: TimelineConfig
): Map<string, TaskPosition> {
  const positions = new Map<string, TaskPosition>();
  const overlapGroups = findOverlappingTasks(tasks);

  for (const group of overlapGroups) {
    const totalColumns = group.tasks.length;

    group.tasks.forEach((task, index) => {
      const basePosition = calculateTaskPosition(task, timelineStart, config);

      positions.set(task.id, {
        ...basePosition,
        column: index,
        totalColumns,
        left: (index / totalColumns) * 100,
        width: (1 / totalColumns) * 100,
      });
    });
  }

  return positions;
}

export function getTimelineRange(currentDate: Date, zoomLevel: ZoomLevel): { start: Date; end: Date } {
  const config = ZOOM_CONFIGS[zoomLevel];
  const start = startOfDay(currentDate);
  const end = addDays(start, config.visibleDays);

  return { start, end };
}

export function generateTimeMarkers(start: Date, end: Date, config: TimelineConfig): Array<{ time: Date; label: string; isDay: boolean }> {
  const markers: Array<{ time: Date; label: string; isDay: boolean }> = [];
  let current = startOfDay(start);

  while (current < end) {
    markers.push({
      time: current,
      label: format(current, 'EEE MMM d'),
      isDay: true,
    });

    for (let hour = config.minIncrement; hour < 24; hour += config.minIncrement) {
      const markerTime = addHours(current, hour);
      if (markerTime >= end) break;

      markers.push({
        time: markerTime,
        label: format(markerTime, config.timeFormat),
        isDay: false,
      });
    }

    current = addDays(current, 1);
  }

  return markers;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
