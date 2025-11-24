import React from 'react';
import {
  Calendar,
  Clock,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Flag,
  Timer
} from 'lucide-react';
import { Task, TaskStatus, TimeEntry } from '../types';
import { formatDistance } from 'date-fns';

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  // Time tracking props (optional)
  activeTrackingTaskId?: string | null;
  activeEntry?: TimeEntry | null;
  onStartTracking?: (taskId: string) => void;
  onStopTracking?: () => void;
  getTaskTotalTime?: (taskId: string) => number;
}

const STATUS_CONFIG = {
  pending: { 
    color: 'bg-gray-100 text-gray-800', 
    icon: AlertCircle, 
    label: 'Pending' 
  },
  in_progress: { 
    color: 'bg-blue-100 text-blue-800', 
    icon: Play, 
    label: 'In Progress' 
  },
  completed: { 
    color: 'bg-green-100 text-green-800', 
    icon: CheckCircle, 
    label: 'Completed' 
  },
  blocked: { 
    color: 'bg-red-100 text-red-800', 
    icon: Pause, 
    label: 'Blocked' 
  },
};

const PRIORITY_CONFIG = {
  low: { color: 'text-green-600', bgColor: 'bg-green-50' },
  medium: { color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  high: { color: 'text-red-600', bgColor: 'bg-red-50' },
};

export default function TaskList({
  tasks,
  onEdit,
  onDelete,
  onUpdateStatus,
  activeTrackingTaskId,
  activeEntry,
  onStartTracking,
  onStopTracking,
  getTaskTotalTime,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No tasks yet
        </h3>
        <p className="text-gray-500">
          Create your first task to get started with project planning.
        </p>
      </div>
    );
  }

  const getNextStatus = (currentStatus: TaskStatus): TaskStatus | null => {
    switch (currentStatus) {
      case 'pending':
        return 'in_progress';
      case 'in_progress':
        return 'completed';
      case 'blocked':
        return 'in_progress';
      default:
        return null;
    }
  };

  const getStatusActionLabel = (currentStatus: TaskStatus): string => {
    switch (currentStatus) {
      case 'pending':
        return 'Start';
      case 'in_progress':
        return 'Complete';
      case 'blocked':
        return 'Resume';
      default:
        return 'Update';
    }
  };

  const formatDuration = (hours: number): string => {
    if (hours < 1) {
      return `${(hours * 60).toFixed(0)}min`;
    }
    if (hours < 8) {
      return `${hours}h`;
    }
    const days = (hours / 8).toFixed(1);
    return `${days}d`;
  };

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const StatusIcon = STATUS_CONFIG[task.status].icon;
        const nextStatus = getNextStatus(task.status);
        const isOverdue = task.status !== 'completed' && new Date() > task.endDate;
        const isTrackingThis = activeTrackingTaskId === task.id;
        const trackedTime = getTaskTotalTime ? getTaskTotalTime(task.id) : 0;

        return (
          <div
            key={task.id}
            className={`card hover:shadow-md transition-shadow ${
              isOverdue ? 'ring-2 ring-red-200' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Header Row */}
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {task.title}
                  </h3>
                  
                  {/* Priority Flag */}
                  <div className={`${PRIORITY_CONFIG[task.priority].bgColor} ${PRIORITY_CONFIG[task.priority].color} px-2 py-1 rounded-full flex items-center text-xs font-medium`}>
                    <Flag className="h-3 w-3 mr-1" />
                    {task.priority.toUpperCase()}
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`${STATUS_CONFIG[task.status].color} px-2 py-1 rounded-full flex items-center text-xs font-medium`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {STATUS_CONFIG[task.status].label}
                  </div>
                </div>

                {/* Description */}
                {task.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {task.description}
                  </p>
                )}

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Progress: {task.progress}%</span>
                    <span>
                      {formatDuration(trackedTime || task.actualDuration)} / {formatDuration(task.estimatedDuration)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        task.progress === 100 ? 'bg-green-500' :
                        trackedTime > task.estimatedDuration ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(task.progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Time Tracking Controls */}
                {onStartTracking && onStopTracking && task.status !== 'completed' && (
                  <div className="mb-3 flex items-center space-x-3">
                    {isTrackingThis ? (
                      <button
                        onClick={onStopTracking}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                      >
                        <Pause className="h-4 w-4" />
                        <span>Stop Tracking</span>
                        {activeEntry && (
                          <span className="bg-red-200 px-2 py-0.5 rounded text-xs animate-pulse">
                            <Timer className="h-3 w-3 inline mr-1" />
                            Active
                          </span>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => onStartTracking(task.id)}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                        disabled={!!activeTrackingTaskId}
                      >
                        <Play className="h-4 w-4" />
                        <span>Track Time</span>
                      </button>
                    )}
                    {trackedTime > 0 && (
                      <span className={`text-sm ${trackedTime > task.estimatedDuration ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        <Clock className="h-4 w-4 inline mr-1" />
                        {formatDuration(trackedTime)} tracked
                        {trackedTime > task.estimatedDuration && ' (over estimate!)'}
                      </span>
                    )}
                  </div>
                )}

                {/* Meta Information */}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>
                      {formatDistance(task.startDate, new Date(), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Due {formatDistance(task.endDate, new Date(), { addSuffix: true })}</span>
                    {isOverdue && (
                      <span className="ml-1 text-red-600 font-medium">(Overdue)</span>
                    )}
                  </div>
                  {task.category && (
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {task.category}
                    </span>
                  )}
                </div>

                {/* Dependencies */}
                {task.dependencies.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    <span>Depends on {task.dependencies.length} task(s)</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 ml-4">
                {nextStatus && (
                  <button
                    onClick={() => onUpdateStatus(task.id, nextStatus)}
                    className="btn-primary text-xs px-3 py-1"
                  >
                    {getStatusActionLabel(task.status)}
                  </button>
                )}
                
                <button
                  onClick={() => onEdit(task)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Edit task"
                >
                  <Edit className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => onDelete(task.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}