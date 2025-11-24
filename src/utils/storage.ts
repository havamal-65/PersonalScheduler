import { Task, Project, TimeEntry, AppSettings } from '../types';

const STORAGE_KEYS = {
  TASKS: 'personal-gantt-tasks',
  PROJECTS: 'personal-gantt-projects', 
  TIME_ENTRIES: 'personal-gantt-time-entries',
  SETTINGS: 'personal-gantt-settings',
} as const;

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  workingHoursPerDay: 8,
  workingDays: [1, 2, 3, 4, 5], // Monday to Friday
  defaultView: 'list',
};

// Generic storage functions
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    const parsed = JSON.parse(item);
    // Convert date strings back to Date objects
    return convertDatesFromStorage(parsed);
  } catch (error) {
    console.error(`Error reading from localStorage for key ${key}:`, error);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage for key ${key}:`, error);
    return false;
  }
}

// Convert date strings back to Date objects when loading from storage
function convertDatesFromStorage(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(convertDatesFromStorage);
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && isDateString(value)) {
        converted[key] = new Date(value);
      } else if (typeof value === 'object') {
        converted[key] = convertDatesFromStorage(value);
      } else {
        converted[key] = value;
      }
    }
    return converted;
  }
  
  return obj;
}

function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}

// Task storage functions
export function getTasks(): Task[] {
  return getFromStorage(STORAGE_KEYS.TASKS, []);
}

export function saveTasks(tasks: Task[]): boolean {
  return saveToStorage(STORAGE_KEYS.TASKS, tasks);
}

// Project storage functions
export function getProjects(): Project[] {
  return getFromStorage(STORAGE_KEYS.PROJECTS, []);
}

export function saveProjects(projects: Project[]): boolean {
  return saveToStorage(STORAGE_KEYS.PROJECTS, projects);
}

// Time entry storage functions
export function getTimeEntries(): TimeEntry[] {
  return getFromStorage(STORAGE_KEYS.TIME_ENTRIES, []);
}

export function saveTimeEntries(entries: TimeEntry[]): boolean {
  return saveToStorage(STORAGE_KEYS.TIME_ENTRIES, entries);
}

// Settings storage functions
export function getSettings(): AppSettings {
  return getFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function saveSettings(settings: AppSettings): boolean {
  return saveToStorage(STORAGE_KEYS.SETTINGS, settings);
}

// Clear all data (for reset functionality)
export function clearAllData(): boolean {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}