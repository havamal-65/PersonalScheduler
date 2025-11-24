import React from 'react';
import { Clock, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { Task } from '../types';

interface StatsDashboardProps {
  tasks: Task[];
  getTaskTotalTime: (taskId: string) => number;
}

export default function StatsDashboard({ tasks, getTaskTotalTime }: StatsDashboardProps) {
  // Calculate statistics
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');

  // Total estimated vs actual for completed tasks
  let totalEstimated = 0;
  let totalActual = 0;
  let accurateEstimates = 0;
  let underEstimates = 0;
  let overEstimates = 0;

  completedTasks.forEach(task => {
    const actualTime = getTaskTotalTime(task.id);
    totalEstimated += task.estimatedDuration;
    totalActual += actualTime;

    const ratio = task.estimatedDuration > 0 ? actualTime / task.estimatedDuration : 1;

    if (ratio >= 0.8 && ratio <= 1.2) {
      accurateEstimates++;
    } else if (ratio < 0.8) {
      overEstimates++; // Finished faster than estimated
    } else {
      underEstimates++; // Took longer than estimated
    }
  });

  // Estimation accuracy percentage
  const estimationAccuracy = completedTasks.length > 0
    ? (accurateEstimates / completedTasks.length) * 100
    : 0;

  // Average deviation from estimates
  const avgDeviation = totalEstimated > 0
    ? ((totalActual - totalEstimated) / totalEstimated) * 100
    : 0;

  // Time tracking for in-progress tasks
  let inProgressTracked = 0;
  let inProgressEstimated = 0;
  inProgressTasks.forEach(task => {
    inProgressTracked += getTaskTotalTime(task.id);
    inProgressEstimated += task.estimatedDuration;
  });

  const formatHours = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    }
    return `${(hours / 8).toFixed(1)}d`;
  };

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Day at a Glance</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estimation Accuracy */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Planning Accuracy</span>
            <Target className="h-5 w-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {estimationAccuracy.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {accurateEstimates} of {completedTasks.length} tasks within 20% of estimate
          </div>
          <div className="mt-3 flex space-x-2 text-xs">
            <span className="text-green-600">{overEstimates} faster</span>
            <span className="text-gray-400">•</span>
            <span className="text-red-600">{underEstimates} slower</span>
          </div>
        </div>

        {/* Total Time Tracked */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Time Tracked</span>
            <Clock className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatHours(totalActual + inProgressTracked)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            vs {formatHours(totalEstimated + inProgressEstimated)} estimated
          </div>
          <div className="mt-3">
            <div className={`text-sm font-medium ${avgDeviation > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {avgDeviation > 0 ? (
                <span className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {avgDeviation.toFixed(0)}% over estimates
                </span>
              ) : (
                <span className="flex items-center">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  {Math.abs(avgDeviation).toFixed(0)}% under estimates
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Completed</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {completedTasks.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            of {tasks.length} total tasks
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">In Progress</span>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {inProgressTasks.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatHours(inProgressTracked)} tracked / {formatHours(inProgressEstimated)} estimated
          </div>
          {inProgressTasks.length > 0 && inProgressEstimated > 0 && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    inProgressTracked > inProgressEstimated ? 'bg-amber-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${Math.min((inProgressTracked / inProgressEstimated) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}