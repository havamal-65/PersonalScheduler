import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types';
import { getTasks, saveTasks } from '../utils/storage';
import { createTask, updateTask, validateTask, CreateTaskInput, UpdateTaskInput } from '../utils/taskUtils';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tasks from storage on mount
  useEffect(() => {
    try {
      const savedTasks = getTasks();
      setTasks(savedTasks);
      setError(null);
    } catch (err) {
      setError('Failed to load tasks');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save tasks to storage whenever tasks change
  useEffect(() => {
    if (!loading) {
      const success = saveTasks(tasks);
      if (!success) {
        setError('Failed to save tasks');
      }
    }
  }, [tasks, loading]);

  // Add a new task
  const addTask = useCallback((input: CreateTaskInput): { success: boolean; errors?: string[]; task?: Task } => {
    try {
      const errors = validateTask(input);
      if (errors.length > 0) {
        return { success: false, errors };
      }

      const newTask = createTask(input);
      setTasks(prev => [...prev, newTask]);
      setError(null);
      
      return { success: true, task: newTask };
    } catch (err) {
      const errorMsg = 'Failed to add task';
      setError(errorMsg);
      console.error('Error adding task:', err);
      return { success: false, errors: [errorMsg] };
    }
  }, []);

  // Update an existing task
  const updateTaskById = useCallback((updates: UpdateTaskInput): { success: boolean; errors?: string[] } => {
    try {
      const errors = validateTask(updates);
      if (errors.length > 0) {
        return { success: false, errors };
      }

      setTasks(prev => prev.map(task => {
        if (task.id === updates.id) {
          return updateTask(task, updates);
        }
        return task;
      }));
      
      setError(null);
      return { success: true };
    } catch (err) {
      const errorMsg = 'Failed to update task';
      setError(errorMsg);
      console.error('Error updating task:', err);
      return { success: false, errors: [errorMsg] };
    }
  }, []);

  // Delete a task
  const deleteTask = useCallback((taskId: string): boolean => {
    try {
      setTasks(prev => prev.filter(task => task.id !== taskId));
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to delete task');
      console.error('Error deleting task:', err);
      return false;
    }
  }, []);

  // Get a single task by ID
  const getTaskById = useCallback((taskId: string): Task | undefined => {
    return tasks.find(task => task.id === taskId);
  }, [tasks]);

  // Clear all tasks
  const clearAllTasks = useCallback((): boolean => {
    try {
      setTasks([]);
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to clear tasks');
      console.error('Error clearing tasks:', err);
      return false;
    }
  }, []);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask: updateTaskById,
    deleteTask,
    getTaskById,
    clearAllTasks,
  };
}