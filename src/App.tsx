import { useState } from 'react';
import { ZoomLevel, Task } from './types';
import { useTasks, CreateTaskInput } from './hooks/useTasks';
import QuickAdd, { ParsedTask } from './components/QuickAdd';
import { VisualTimeline } from './components/VisualTimeline';
import { TimelineControls } from './components/TimelineControls';
import { TaskEditModal } from './components/TaskEditModal';
import { Calendar } from 'lucide-react';

function App() {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks();

  const handleQuickAdd = (parsed: ParsedTask) => {
    const taskInput: CreateTaskInput = {
      title: parsed.title,
      duration: parsed.duration,
      startDate: parsed.startDate,
    };
    addTask(taskInput);
  };

  const handleTimelineClick = (date: Date) => {
    const newTask: CreateTaskInput = {
      title: 'New Task',
      duration: 60,
      startDate: date,
    };
    addTask(newTask);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleTaskSave = (task: Task) => {
    updateTask(task);
    setSelectedTask(null);
  };

  const handleTaskDelete = (taskId: string) => {
    deleteTask(taskId);
    setSelectedTask(null);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setSelectedTask(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-8 w-8 text-blue-500 animate-pulse mx-auto mb-2" />
          <p className="text-gray-600">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Visual Scheduler</h1>
                <p className="text-sm text-gray-500">See your time, manage your day</p>
              </div>
            </div>
            {tasks.length > 0 && (
              <div className="text-sm text-gray-600">
                {tasks.filter(t => t.completed).length} / {tasks.length} completed
              </div>
            )}
          </div>

          {/* Quick Add */}
          <QuickAdd onAdd={handleQuickAdd} disabled={loading} />
        </div>
      </header>

      {/* Timeline Controls */}
      <TimelineControls
        zoomLevel={zoomLevel}
        currentDate={currentDate}
        onZoomChange={setZoomLevel}
        onDateChange={setCurrentDate}
      />

      {/* Visual Timeline */}
      <VisualTimeline
        tasks={tasks}
        zoomLevel={zoomLevel}
        currentDate={currentDate}
        onTaskClick={handleTaskClick}
        onTimelineClick={handleTimelineClick}
        selectedTaskId={selectedTask?.id}
      />

      {/* Task Edit Modal */}
      <TaskEditModal
        task={selectedTask}
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
      />
    </div>
  );
}

export default App;
