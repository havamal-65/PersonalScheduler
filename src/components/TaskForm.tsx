import { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertCircle, Link, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '../types';
import { CreateTaskInput } from '../utils/taskUtils';
import DependencySelector from './DependencySelector';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: CreateTaskInput) => void;
  editingTask?: Task;
  title?: string;
  allTasks?: Task[]; // For dependency selection
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'high', label: 'High', color: 'text-red-600' },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
];

// Duration presets in hours
const DURATION_PRESETS = [
  { label: '1h', hours: 1 },
  { label: '4h', hours: 4 },
  { label: '1d', hours: 8 },
  { label: '3d', hours: 24 },
  { label: '1w', hours: 40 },
];

export default function TaskForm({ isOpen, onClose, onSubmit, editingTask, title, allTasks = [] }: TaskFormProps) {
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: '',
    estimatedDuration: 8,
    startDate: new Date(),
    priority: 'medium',
    status: 'pending',
    category: '',
    dependencies: [],
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(8); // Default to 1d

  // Reset form when editing task changes or dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setFormData({
          title: editingTask.title,
          description: editingTask.description || '',
          estimatedDuration: editingTask.estimatedDuration,
          startDate: editingTask.startDate,
          priority: editingTask.priority,
          status: editingTask.status,
          category: editingTask.category || '',
          dependencies: editingTask.dependencies,
        });
        setShowAdvanced(true); // Show advanced when editing
        setAutoSchedule(false); // Don't auto-schedule when editing
        // Check if duration matches a preset
        const preset = DURATION_PRESETS.find(p => p.hours === editingTask.estimatedDuration);
        setSelectedPreset(preset ? preset.hours : null);
      } else {
        setFormData({
          title: '',
          description: '',
          estimatedDuration: 8,
          startDate: new Date(),
          priority: 'medium',
          status: 'pending',
          category: '',
          dependencies: [],
        });
        setShowAdvanced(false);
        setAutoSchedule(true);
        setSelectedPreset(8);
      }
      setErrors([]);
    }
  }, [isOpen, editingTask]);

  // Calculate auto-scheduled start date based on dependencies
  const getAutoScheduledStartDate = (): Date => {
    if (!formData.dependencies || formData.dependencies.length === 0) {
      return new Date(); // Start today if no dependencies
    }

    // Find the latest end date among all dependencies
    let latestEnd = new Date();
    formData.dependencies.forEach(depId => {
      const depTask = allTasks.find(t => t.id === depId);
      if (depTask && depTask.endDate > latestEnd) {
        latestEnd = depTask.endDate;
      }
    });

    return latestEnd;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Basic validation
    const newErrors: string[] = [];
    if (!formData.title.trim()) {
      newErrors.push('Title is required');
    }
    if (formData.estimatedDuration <= 0) {
      newErrors.push('Duration must be greater than 0');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    // If auto-scheduling, calculate the start date
    const submitData = {
      ...formData,
      startDate: autoSchedule ? getAutoScheduledStartDate() : formData.startDate,
    };

    onSubmit(submitData);
    onClose();
  };

  const handleDurationPreset = (hours: number) => {
    setSelectedPreset(hours);
    setFormData(prev => ({ ...prev, estimatedDuration: hours }));
  };

  const handleCustomDuration = (value: number) => {
    setSelectedPreset(null);
    setFormData(prev => ({ ...prev, estimatedDuration: Math.max(0.5, value) }));
  };

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().slice(0, 16);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {title || (editingTask ? 'Edit Task' : 'Add New Task')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Please fix the following errors:
                  </h3>
                  <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Name *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="input-field w-full"
              placeholder="What needs to be done?"
              autoFocus
              required
            />
          </div>

          {/* Duration Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="inline h-4 w-4 mr-1" />
              Duration *
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.hours}
                  type="button"
                  onClick={() => handleDurationPreset(preset.hours)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    selectedPreset === preset.hours
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedPreset(null)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  selectedPreset === null
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Custom
              </button>
            </div>
            {selectedPreset === null && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.estimatedDuration}
                  onChange={(e) => handleCustomDuration(parseFloat(e.target.value) || 0)}
                  className="input-field w-24"
                  min="0.5"
                  step="0.5"
                />
                <span className="text-sm text-gray-500">hours</span>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {formData.estimatedDuration < 8
                ? `${formData.estimatedDuration} hour${formData.estimatedDuration !== 1 ? 's' : ''}`
                : `${(formData.estimatedDuration / 8).toFixed(1)} working day${formData.estimatedDuration !== 8 ? 's' : ''}`
              }
            </p>
          </div>

          {/* Auto-Schedule Toggle */}
          <div className="bg-blue-50 rounded-lg p-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSchedule}
                onChange={(e) => setAutoSchedule(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2 flex items-center text-sm font-medium text-blue-900">
                <Zap className="h-4 w-4 mr-1" />
                Auto-schedule
              </span>
            </label>
            <p className="text-xs text-blue-700 mt-1 ml-6">
              {autoSchedule
                ? formData.dependencies?.length
                  ? 'Will start after selected dependencies complete'
                  : 'Will start today'
                : 'Manual start date below'
              }
            </p>
          </div>

          {/* Manual Start Date (only if not auto-scheduling) */}
          {!autoSchedule && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                Start Date
              </label>
              <input
                type="datetime-local"
                value={formatDateForInput(formData.startDate!)}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  startDate: new Date(e.target.value)
                }))}
                className="input-field w-full"
              />
            </div>
          )}

          {/* Dependencies */}
          {allTasks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Link className="inline h-4 w-4 mr-1" />
                Depends On
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Tasks that must finish before this one starts
              </p>
              <DependencySelector
                availableTasks={allTasks}
                selectedDependencies={formData.dependencies || []}
                currentTaskId={editingTask?.id}
                onChange={(deps) => setFormData(prev => ({ ...prev, dependencies: deps }))}
              />
            </div>
          )}

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors w-full py-2"
          >
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            {showAdvanced ? 'Hide' : 'Show'} advanced options
          </button>

          {/* Advanced Options (collapsible) */}
          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field w-full"
                  rows={2}
                  placeholder="Add details (optional)"
                />
              </div>

              {/* Priority and Status Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      priority: e.target.value as TaskPriority
                    }))}
                    className="input-field w-full"
                  >
                    {PRIORITY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      status: e.target.value as TaskStatus
                    }))}
                    className="input-field w-full"
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g., Design, Development, Testing"
                />
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              {editingTask ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
