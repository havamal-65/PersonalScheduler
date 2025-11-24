import { useState, useEffect, useCallback } from 'react';
import { TimeEntry } from '../types';
import { getTimeEntries, saveTimeEntries } from '../utils/storage';
import { v4 as uuidv4 } from 'uuid';

export function useTimeTracking() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);

  // Load time entries from storage on mount
  useEffect(() => {
    try {
      const savedEntries = getTimeEntries();
      setTimeEntries(savedEntries);

      // Find any active (uncompleted) entry
      const active = savedEntries.find(entry => !entry.endTime);
      setActiveEntry(active || null);
    } catch (err) {
      console.error('Error loading time entries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save time entries to storage whenever they change
  useEffect(() => {
    if (!loading) {
      saveTimeEntries(timeEntries);
    }
  }, [timeEntries, loading]);

  // Start tracking time for a task
  const startTracking = useCallback((taskId: string, description?: string): TimeEntry | null => {
    // Stop any currently active entry first
    if (activeEntry) {
      stopTracking();
    }

    const newEntry: TimeEntry = {
      id: uuidv4(),
      taskId,
      startTime: new Date(),
      description,
      createdAt: new Date(),
    };

    setTimeEntries(prev => [...prev, newEntry]);
    setActiveEntry(newEntry);

    return newEntry;
  }, [activeEntry]);

  // Stop tracking the current entry
  const stopTracking = useCallback((): TimeEntry | null => {
    if (!activeEntry) return null;

    const completedEntry: TimeEntry = {
      ...activeEntry,
      endTime: new Date(),
    };

    setTimeEntries(prev =>
      prev.map(entry =>
        entry.id === activeEntry.id ? completedEntry : entry
      )
    );
    setActiveEntry(null);

    return completedEntry;
  }, [activeEntry]);

  // Get total time spent on a task (in hours)
  const getTaskTotalTime = useCallback((taskId: string): number => {
    const taskEntries = timeEntries.filter(entry => entry.taskId === taskId);

    let totalMs = 0;
    const now = new Date();

    taskEntries.forEach(entry => {
      const endTime = entry.endTime || now;
      totalMs += endTime.getTime() - entry.startTime.getTime();
    });

    return totalMs / (1000 * 60 * 60); // Convert to hours
  }, [timeEntries]);

  // Get time entries for a specific task
  const getTaskEntries = useCallback((taskId: string): TimeEntry[] => {
    return timeEntries.filter(entry => entry.taskId === taskId);
  }, [timeEntries]);

  // Delete a time entry
  const deleteEntry = useCallback((entryId: string): boolean => {
    setTimeEntries(prev => prev.filter(entry => entry.id !== entryId));

    if (activeEntry?.id === entryId) {
      setActiveEntry(null);
    }

    return true;
  }, [activeEntry]);

  // Update a time entry
  const updateEntry = useCallback((entryId: string, updates: Partial<TimeEntry>): boolean => {
    setTimeEntries(prev =>
      prev.map(entry =>
        entry.id === entryId ? { ...entry, ...updates } : entry
      )
    );

    if (activeEntry?.id === entryId) {
      setActiveEntry(prev => prev ? { ...prev, ...updates } : null);
    }

    return true;
  }, [activeEntry]);

  // Check if a task is currently being tracked
  const isTrackingTask = useCallback((taskId: string): boolean => {
    return activeEntry?.taskId === taskId;
  }, [activeEntry]);

  // Get elapsed time for active entry (in seconds)
  const getActiveElapsedTime = useCallback((): number => {
    if (!activeEntry) return 0;
    return Math.floor((new Date().getTime() - activeEntry.startTime.getTime()) / 1000);
  }, [activeEntry]);

  return {
    timeEntries,
    activeEntry,
    loading,
    startTracking,
    stopTracking,
    getTaskTotalTime,
    getTaskEntries,
    deleteEntry,
    updateEntry,
    isTrackingTask,
    getActiveElapsedTime,
  };
}