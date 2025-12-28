import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Task } from '../types';

const STORAGE_KEY = 'scheduler-tasks';

function loadTasks(): Task[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return parsed.map((task: any) => ({
      ...task,
      startDate: new Date(task.startDate),
      createdAt: new Date(task.createdAt),
    }));
  } catch (err) {
    console.error('Error loading tasks:', err);
    return [];
  }
}

function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Error saving tasks:', err);
  }
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  duration: number; // in minutes
  startDate: Date;
  color?: string;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTasks(loadTasks());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      saveTasks(tasks);
    }
  }, [tasks, loading]);

  const addTask = useCallback((input: CreateTaskInput) => {
    const newTask: Task = {
      id: uuidv4(),
      title: input.title.trim(),
      description: input.description?.trim(),
      duration: input.duration,
      startDate: input.startDate,
      completed: false,
      color: input.color,
      createdAt: new Date(),
    };

    setTasks(prev => [...prev, newTask]);
  }, []);

  const updateTask = useCallback((updatedTask: Task) => {
    setTasks(prev => prev.map(task => task.id === updatedTask.id ? updatedTask : task));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);

  const getTaskById = useCallback((taskId: string): Task | undefined => {
    return tasks.find(task => task.id === taskId);
  }, [tasks]);

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    getTaskById,
  };
}