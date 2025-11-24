import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock, Timer } from 'lucide-react';
import { Task, TimeEntry } from '../types';

interface TimeTrackerProps {
  task: Task;
  isTracking: boolean;
  activeEntry: TimeEntry | null;
  totalTimeSpent: number; // in hours
  onStart: (taskId: string) => void;
  onStop: () => void;
}

export default function TimeTracker({
  task,
  isTracking,
  activeEntry,
  totalTimeSpent,
  onStart,
  onStop,
}: TimeTrackerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Update elapsed time every second when tracking
  useEffect(() => {
    if (!isTracking || !activeEntry) {
      setElapsedSeconds(0);
      return;
    }

    // Calculate initial elapsed time
    const initialElapsed = Math.floor(
      (new Date().getTime() - activeEntry.startTime.getTime()) / 1000
    );
    setElapsedSeconds(initialElapsed);

    // Update every second
    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (new Date().getTime() - activeEntry.startTime.getTime()) / 1000
      );
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, activeEntry]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHours = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    return `${hours.toFixed(1)}h`;
  };

  // Calculate progress percentage
  const progressPercent = task.estimatedDuration > 0
    ? Math.min((totalTimeSpent / task.estimatedDuration) * 100, 100)
    : 0;

  // Determine if over estimate
  const isOverEstimate = totalTimeSpent > task.estimatedDuration;

  return (
    <div className="flex items-center space-x-4">
      {/* Time stats */}
      <div className="flex items-center space-x-2 text-sm">
        <Clock className="h-4 w-4 text-gray-400" />
        <span className={`${isOverEstimate ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
          {formatHours(totalTimeSpent)}
        </span>
        <span className="text-gray-400">/</span>
        <span className="text-gray-600">{formatHours(task.estimatedDuration)}</span>
      </div>

      {/* Current session timer */}
      {isTracking && (
        <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
          <Timer className="h-4 w-4" />
          <span>{formatTime(elapsedSeconds)}</span>
        </div>
      )}

      {/* Start/Stop button */}
      {task.status !== 'completed' && (
        <button
          onClick={() => isTracking ? onStop() : onStart(task.id)}
          className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            isTracking
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {isTracking ? (
            <>
              <Pause className="h-4 w-4" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>Start</span>
            </>
          )}
        </button>
      )}

      {/* Mini progress bar */}
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isOverEstimate ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(progressPercent, 100)}%` }}
        />
      </div>
    </div>
  );
}