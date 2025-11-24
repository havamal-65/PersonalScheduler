import { v4 as uuidv4 } from 'uuid';
import { Task, TaskStatus, TaskPriority } from '../types';
import { addHours, addDays, isWeekend, startOfDay } from 'date-fns';

export interface CreateTaskInput {
  title: string;
  description?: string;
  estimatedDuration: number; // in hours
  startDate?: Date;
  status?: TaskStatus;
  priority?: TaskPriority;
  dependencies?: string[];
  category?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string;
  progress?: number;
  actualDuration?: number;
}

// Create a new task with calculated end date
export function createTask(input: CreateTaskInput): Task {
  const now = new Date();
  const startDate = input.startDate || now;
  const endDate = calculateEndDate(startDate, input.estimatedDuration);

  return {
    id: uuidv4(),
    title: input.title,
    description: input.description,
    estimatedDuration: input.estimatedDuration,
    actualDuration: 0,
    startDate,
    endDate,
    status: input.status || 'pending',
    priority: input.priority || 'medium',
    dependencies: input.dependencies || [],
    progress: 0,
    category: input.category,
    createdAt: now,
    updatedAt: now,
  };
}

// Update an existing task
export function updateTask(existingTask: Task, updates: Omit<UpdateTaskInput, 'id'>): Task {
  const updatedTask = {
    ...existingTask,
    ...updates,
    updatedAt: new Date(),
  };

  // Recalculate end date if start date or duration changed
  if (updates.startDate || updates.estimatedDuration) {
    updatedTask.endDate = calculateEndDate(
      updates.startDate || existingTask.startDate,
      updates.estimatedDuration || existingTask.estimatedDuration
    );
  }

  return updatedTask;
}

// Calculate end date based on working days/hours
export function calculateEndDate(startDate: Date, durationInHours: number, workingHoursPerDay = 8): Date {
  let currentDate = startOfDay(startDate);
  let remainingHours = durationInHours;

  while (remainingHours > 0) {
    // Skip weekends
    if (!isWeekend(currentDate)) {
      const hoursForToday = Math.min(remainingHours, workingHoursPerDay);
      remainingHours -= hoursForToday;
      
      if (remainingHours <= 0) {
        // Task finishes on this day
        return addHours(currentDate, hoursForToday);
      }
    }
    
    currentDate = addDays(currentDate, 1);
  }

  return currentDate;
}

// Check if a task can be started (all dependencies are completed)
export function canStartTask(task: Task, allTasks: Task[]): boolean {
  if (task.dependencies.length === 0) return true;

  return task.dependencies.every(depId => {
    const dependency = allTasks.find(t => t.id === depId);
    return dependency?.status === 'completed';
  });
}

// Get all tasks that depend on a given task
export function getDependentTasks(taskId: string, allTasks: Task[]): Task[] {
  return allTasks.filter(task => task.dependencies.includes(taskId));
}

// Calculate the earliest start date for a task based on dependencies
export function calculateEarliestStartDate(task: Task, allTasks: Task[]): Date {
  if (task.dependencies.length === 0) {
    return task.startDate;
  }

  let latestDependencyEnd = new Date(0); // Very early date

  task.dependencies.forEach(depId => {
    const dependency = allTasks.find(t => t.id === depId);
    if (dependency && dependency.endDate > latestDependencyEnd) {
      latestDependencyEnd = dependency.endDate;
    }
  });

  return latestDependencyEnd > task.startDate ? latestDependencyEnd : task.startDate;
}

// Sort tasks by priority and then by start date
export function sortTasks(tasks: Task[]): Task[] {
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  
  return [...tasks].sort((a, b) => {
    // First sort by priority (high to low)
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then by start date (earliest first)
    return a.startDate.getTime() - b.startDate.getTime();
  });
}

// Filter tasks by status
export function filterTasksByStatus(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter(task => task.status === status);
}

// Filter tasks by category
export function filterTasksByCategory(tasks: Task[], category?: string): Task[] {
  if (!category) return tasks.filter(task => !task.category);
  return tasks.filter(task => task.category === category);
}

// Get task statistics
export function getTaskStats(tasks: Task[]) {
  const stats = {
    total: tasks.length,
    completed: 0,
    inProgress: 0,
    pending: 0,
    blocked: 0,
    totalEstimatedHours: 0,
    totalActualHours: 0,
    averageProgress: 0,
  };

  tasks.forEach(task => {
    stats[task.status === 'in_progress' ? 'inProgress' : task.status]++;
    stats.totalEstimatedHours += task.estimatedDuration;
    stats.totalActualHours += task.actualDuration;
  });

  if (tasks.length > 0) {
    stats.averageProgress = tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length;
  }

  return stats;
}

// Validate task before creation/update
export function validateTask(input: CreateTaskInput | UpdateTaskInput): string[] {
  const errors: string[] = [];

  if ('title' in input && (!input.title || input.title.trim().length === 0)) {
    errors.push('Title is required');
  }

  if ('estimatedDuration' in input && (input.estimatedDuration <= 0)) {
    errors.push('Estimated duration must be greater than 0');
  }

  if ('progress' in input && input.progress !== undefined) {
    if (input.progress < 0 || input.progress > 100) {
      errors.push('Progress must be between 0 and 100');
    }
  }

  return errors;
}