export interface Task {
  id: string;
  title: string;
  description?: string;
  estimatedDuration: number; // in hours
  actualDuration: number; // tracked time in hours
  startDate: Date;
  endDate: Date; // calculated from startDate + estimatedDuration
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  dependencies: string[]; // array of task IDs
  progress: number; // 0-100 percentage
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  color: string; // hex color for visual differentiation
  description?: string;
  createdAt: Date;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  startTime: Date;
  endTime?: Date; // undefined if currently active
  description?: string;
  createdAt: Date;
}

export interface AppSettings {
  workingHoursPerDay: number;
  workingDays: number[]; // 0-6, Sunday-Saturday
  defaultView: 'critical-path' | 'gantt' | 'list' | 'board';
}

export interface AppState {
  tasks: Task[];
  projects: Project[];
  timeEntries: TimeEntry[];
  settings: AppSettings;
}

export type TaskStatus = Task['status'];
export type TaskPriority = Task['priority'];
export type ViewMode = AppSettings['defaultView'];

// Re-export CPM types for convenience
export type { CPMTaskData, CPMResult } from '../utils/criticalPathUtils';