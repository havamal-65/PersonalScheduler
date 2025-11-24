import React, { useState } from 'react';
import { X, Link, Search, AlertTriangle } from 'lucide-react';
import { Task } from '../types';

interface DependencySelectorProps {
  availableTasks: Task[];
  selectedDependencies: string[];
  currentTaskId?: string; // Exclude current task from selection
  onChange: (dependencies: string[]) => void;
}

export default function DependencySelector({
  availableTasks,
  selectedDependencies,
  currentTaskId,
  onChange,
}: DependencySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter out current task and filter by search term
  const filteredTasks = availableTasks.filter(task => {
    if (task.id === currentTaskId) return false;
    if (!searchTerm) return true;
    return task.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Check for circular dependencies
  const wouldCreateCircle = (taskId: string): boolean => {
    // Simple check: if the task we're adding has us in its dependencies, it would create a circle
    const task = availableTasks.find(t => t.id === taskId);
    if (!task) return false;

    // Check if the task depends on currentTaskId (directly or indirectly)
    const visited = new Set<string>();
    const checkDependencies = (id: string): boolean => {
      if (visited.has(id)) return false;
      visited.add(id);

      if (id === currentTaskId) return true;

      const t = availableTasks.find(task => task.id === id);
      if (!t) return false;

      return t.dependencies.some(depId => checkDependencies(depId));
    };

    return checkDependencies(taskId);
  };

  const toggleDependency = (taskId: string) => {
    if (wouldCreateCircle(taskId)) {
      return; // Don't allow circular dependencies
    }

    if (selectedDependencies.includes(taskId)) {
      onChange(selectedDependencies.filter(id => id !== taskId));
    } else {
      onChange([...selectedDependencies, taskId]);
    }
  };

  const removeDependency = (taskId: string) => {
    onChange(selectedDependencies.filter(id => id !== taskId));
  };

  // Get selected task objects
  const selectedTasks = selectedDependencies
    .map(id => availableTasks.find(t => t.id === id))
    .filter((t): t is Task => t !== undefined);

  return (
    <div className="space-y-3">
      {/* Selected Dependencies */}
      {selectedTasks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTasks.map(task => (
            <div
              key={task.id}
              className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              <Link className="h-3 w-3 mr-2" />
              <span className="truncate max-w-32">{task.title}</span>
              <button
                type="button"
                onClick={() => removeDependency(task.id)}
                className="ml-2 hover:text-blue-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field w-full pl-10"
          placeholder="Search tasks to add as dependencies..."
        />
      </div>

      {/* Available Tasks */}
      {filteredTasks.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
          {filteredTasks.map(task => {
            const isSelected = selectedDependencies.includes(task.id);
            const isCircular = wouldCreateCircle(task.id);

            return (
              <div
                key={task.id}
                className={`flex items-center justify-between p-3 ${
                  isCircular
                    ? 'bg-red-50 cursor-not-allowed'
                    : isSelected
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50 cursor-pointer'
                }`}
                onClick={() => !isCircular && toggleDependency(task.id)}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isCircular}
                    onChange={() => {}}
                    className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {task.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {task.status} • {task.estimatedDuration}h
                    </div>
                  </div>
                </div>

                {isCircular && (
                  <div className="flex items-center text-red-600 text-xs">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Circular
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {filteredTasks.length === 0 && searchTerm && (
        <p className="text-sm text-gray-500 text-center py-3">
          No tasks found matching "{searchTerm}"
        </p>
      )}

      {availableTasks.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-3">
          No other tasks available to add as dependencies
        </p>
      )}
    </div>
  );
}