import { useState } from 'react';
import { Calendar, List, BarChart3, Plus, Filter, PieChart, GitBranch } from 'lucide-react';
import { Task, TaskStatus, ViewMode } from './types';
import { useTasks } from './hooks/useTasks';
import { useTimeTracking } from './hooks/useTimeTracking';
import { sortTasks, getTaskStats } from './utils/taskUtils';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import GanttChart from './components/GanttChart';
import CriticalPathDiagram from './components/CriticalPathDiagram';
import StatsDashboard from './components/StatsDashboard';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('critical-path');
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [showStats, setShowStats] = useState(true);

  const { tasks, loading, error, addTask, updateTask, deleteTask } = useTasks();
  const {
    activeEntry,
    startTracking,
    stopTracking,
    getTaskTotalTime,
  } = useTimeTracking();

  // Filter and sort tasks
  const filteredTasks = tasks.filter(task => 
    statusFilter === 'all' || task.status === statusFilter
  );
  const sortedTasks = sortTasks(filteredTasks);
  const stats = getTaskStats(tasks);

  const handleAddTask = () => {
    setEditingTask(undefined);
    setIsTaskFormOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    if (editingTask) {
      updateTask({ ...formData, id: editingTask.id });
    } else {
      addTask(formData);
    }
    setIsTaskFormOpen(false);
    setEditingTask(undefined);
  };

  const handleStatusUpdate = (taskId: string, status: TaskStatus) => {
    updateTask({ id: taskId, status });
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTask(taskId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 text-primary-500 animate-pulse mx-auto mb-2" />
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-primary-500" />
              <h1 className="ml-3 text-xl font-semibold text-gray-900">
                Personal Gantt
              </h1>
              {/* Task count */}
              {tasks.length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
                  {stats.completed}/{stats.total} tasks completed
                </span>
              )}
            </div>
            
            {/* View Toggle and Actions */}
            <div className="flex items-center space-x-4">
              {/* Status Filter */}
              {tasks.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
                    className="input-field text-sm py-1"
                  >
                    <option value="all">All Tasks ({stats.total})</option>
                    <option value="pending">Pending ({stats.pending})</option>
                    <option value="in_progress">In Progress ({stats.inProgress})</option>
                    <option value="completed">Completed ({stats.completed})</option>
                    <option value="blocked">Blocked ({stats.blocked})</option>
                  </select>
                </div>
              )}

              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCurrentView('critical-path')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'critical-path'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <GitBranch className="h-4 w-4 mr-2" />
                  Critical Path
                </button>
                <button
                  onClick={() => setCurrentView('gantt')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'gantt'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Gantt
                </button>
                <button
                  onClick={() => setCurrentView('list')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="h-4 w-4 mr-2" />
                  List
                </button>
              </div>
              
              {/* Stats Toggle */}
              {tasks.length > 0 && (
                <button
                  onClick={() => setShowStats(!showStats)}
                  className={`p-2 rounded-lg transition-colors ${
                    showStats ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title={showStats ? 'Hide stats' : 'Show stats'}
                >
                  <PieChart className="h-5 w-5" />
                </button>
              )}

              <button
                onClick={handleAddTask}
                className="btn-primary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Stats Dashboard */}
        {showStats && tasks.length > 0 && (
          <StatsDashboard
            tasks={tasks}
            getTaskTotalTime={getTaskTotalTime}
          />
        )}

        <div className="card">
          {currentView === 'critical-path' && (
            <CriticalPathDiagram
              tasks={sortedTasks}
              onTaskClick={handleEditTask}
            />
          )}
          {currentView === 'gantt' && (
            <GanttChart
              tasks={sortedTasks}
              onTaskClick={handleEditTask}
            />
          )}
          {currentView === 'list' && (
            <TaskList
              tasks={sortedTasks}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onUpdateStatus={handleStatusUpdate}
              activeTrackingTaskId={activeEntry?.taskId || null}
              activeEntry={activeEntry}
              onStartTracking={startTracking}
              onStopTracking={stopTracking}
              getTaskTotalTime={getTaskTotalTime}
            />
          )}
        </div>
      </main>

      {/* Task Form Modal */}
      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        onSubmit={handleFormSubmit}
        editingTask={editingTask}
        allTasks={tasks}
      />
    </div>
  );
}

export default App;