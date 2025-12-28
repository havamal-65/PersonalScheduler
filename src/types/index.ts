export interface Task {
  id: string;
  title: string;
  description?: string;
  duration: number; // in minutes
  startDate: Date;
  completed: boolean;
  color?: string; // optional color for visual distinction
  createdAt: Date;
}

export type ZoomLevel = 'day' | 'three-day' | 'week' | 'month';

export interface TimelineSettings {
  zoomLevel: ZoomLevel;
  currentDate: Date; // the date currently centered in view
}
