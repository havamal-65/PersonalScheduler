import React, { useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Task } from '../types';
import {
  calculateTimelineRange,
  getDatePosition,
  getTaskWidth,
  generateDateMarkers,
  generateMonthMarkers,
  getTodayPosition,
  formatDuration,
} from '../utils/dateUtils';

interface GanttChartProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const STATUS_COLORS = {
  pending: 'bg-slate-400',
  in_progress: 'bg-purple-500',
  completed: 'bg-emerald-500',
  blocked: 'bg-amber-400',
};

const PRIORITY_BORDERS = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-red-500',
};

export default function GanttChart({ tasks, onTaskClick }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = normal, higher = more zoomed in
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  // Calculate timeline range with padding
  const timelineRange = useMemo(
    () => calculateTimelineRange(tasks, 3),
    [tasks]
  );

  // Generate date markers
  const dateMarkers = useMemo(
    () => generateDateMarkers(timelineRange),
    [timelineRange]
  );

  // Generate month markers
  const monthMarkers = useMemo(
    () => generateMonthMarkers(timelineRange),
    [timelineRange]
  );

  // Today's position
  const todayPosition = useMemo(
    () => getTodayPosition(timelineRange),
    [timelineRange]
  );

  // Sort tasks by start date
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
    [tasks]
  );

  // Calculate the minimum width based on zoom
  const timelineWidth = Math.max(100, timelineRange.totalDays * 40 * zoomLevel);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, 4));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.5, 0.5));

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-purple-300 mb-4">
          <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Your timeline is empty</h3>
        <p className="text-gray-500">Add activities to see your day unfold on the timeline.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="text-sm text-gray-600">
          Showing {tasks.length} task{tasks.length !== 1 ? 's' : ''} •
          {' '}{format(timelineRange.start, 'MMM d')} - {format(timelineRange.end, 'MMM d, yyyy')}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-500 w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div className="flex flex-1 overflow-hidden border border-gray-200 rounded-lg">
        {/* Task Names Column (Fixed) */}
        <div className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200">
          {/* Header */}
          <div className="h-16 border-b border-gray-200 flex items-center px-4 font-medium text-gray-700 bg-gray-100">
            Task Name
          </div>

          {/* Task Names */}
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 4rem)' }}>
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                className={`h-12 flex items-center px-4 border-b border-gray-100 cursor-pointer transition-colors ${
                  hoveredTask === task.id ? 'bg-purple-50' : 'hover:bg-gray-100'
                }`}
                onMouseEnter={() => setHoveredTask(task.id)}
                onMouseLeave={() => setHoveredTask(null)}
                onClick={() => onTaskClick?.(task)}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium text-gray-900">
                    {task.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDuration(task.estimatedDuration)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Area (Scrollable) */}
        <div className="flex-1 overflow-x-auto" ref={containerRef}>
          <div style={{ minWidth: `${timelineWidth}%` }}>
            {/* Month Headers */}
            <div className="h-8 border-b border-gray-200 bg-gray-100 flex relative">
              {monthMarkers.map((marker, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 h-full flex items-center justify-center text-xs font-medium text-gray-700 border-r border-gray-300"
                  style={{
                    left: `${marker.start}%`,
                    width: `${marker.width}%`,
                  }}
                >
                  {marker.label}
                </div>
              ))}
            </div>

            {/* Day Headers */}
            <div className="h-8 border-b border-gray-200 bg-gray-50 flex relative">
              {dateMarkers.map((marker, idx) => {
                const dayWidth = 100 / timelineRange.totalDays;
                return (
                  <div
                    key={idx}
                    className={`absolute top-0 h-full flex items-center justify-center text-xs border-r border-gray-100 ${
                      marker.isToday
                        ? 'bg-purple-100 text-purple-700 font-bold'
                        : marker.isWeekend
                        ? 'bg-gray-100 text-gray-400'
                        : 'text-gray-600'
                    }`}
                    style={{
                      left: `${idx * dayWidth}%`,
                      width: `${dayWidth}%`,
                    }}
                  >
                    {marker.label}
                  </div>
                );
              })}
            </div>

            {/* Task Bars */}
            <div className="relative" style={{ height: `${sortedTasks.length * 48}px` }}>
              {/* Today line */}
              {todayPosition !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-purple-500 z-10"
                  style={{ left: `${todayPosition}%` }}
                >
                  <div className="absolute -top-6 -left-3 bg-purple-500 text-white text-xs px-1 rounded">
                    Today
                  </div>
                </div>
              )}

              {/* Weekend shading */}
              {dateMarkers.map((marker, idx) => {
                if (!marker.isWeekend) return null;
                const dayWidth = 100 / timelineRange.totalDays;
                return (
                  <div
                    key={`weekend-${idx}`}
                    className="absolute top-0 bottom-0 bg-gray-50"
                    style={{
                      left: `${idx * dayWidth}%`,
                      width: `${dayWidth}%`,
                    }}
                  />
                );
              })}

              {/* Dependency lines */}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: '100%', height: '100%' }}
              >
                {sortedTasks.map((task, taskIndex) => {
                  return task.dependencies.map(depId => {
                    const depTask = sortedTasks.find(t => t.id === depId);
                    if (!depTask) return null;

                    const depIndex = sortedTasks.findIndex(t => t.id === depId);
                    if (depIndex === -1) return null;

                    // Calculate line coordinates (in percentages)
                    const depEndX = getDatePosition(depTask.endDate, timelineRange);
                    const taskStartX = getDatePosition(task.startDate, timelineRange);

                    // Y positions (center of task bars)
                    const depY = depIndex * 48 + 24;
                    const taskY = taskIndex * 48 + 24;

                    // Create a path from dependency end to task start
                    const midX = (depEndX + taskStartX) / 2;

                    return (
                      <g key={`${task.id}-${depId}`}>
                        <path
                          d={`M ${depEndX}% ${depY}
                              C ${midX}% ${depY},
                                ${midX}% ${taskY},
                                ${taskStartX}% ${taskY}`}
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                          markerEnd="url(#arrowhead)"
                        />
                      </g>
                    );
                  });
                })}
                {/* Arrow marker definition */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill="#94a3b8"
                    />
                  </marker>
                </defs>
              </svg>

              {/* Task bars */}
              {sortedTasks.map((task, index) => {
                const left = getDatePosition(task.startDate, timelineRange);
                const width = getTaskWidth(task, timelineRange);

                return (
                  <div
                    key={task.id}
                    className="absolute h-12 flex items-center px-1"
                    style={{ top: `${index * 48}px`, left: 0, right: 0 }}
                  >
                    {/* Task bar container */}
                    <div
                      className={`absolute h-8 rounded shadow-sm cursor-pointer transition-all border-l-4 ${
                        PRIORITY_BORDERS[task.priority]
                      } ${hoveredTask === task.id ? 'ring-2 ring-purple-300 shadow-md' : ''}`}
                      style={{
                        left: `${left}%`,
                        width: `${Math.max(width, 2)}%`,
                      }}
                      onMouseEnter={() => setHoveredTask(task.id)}
                      onMouseLeave={() => setHoveredTask(null)}
                      onClick={() => onTaskClick?.(task)}
                    >
                      {/* Background */}
                      <div className={`absolute inset-0 rounded-r ${STATUS_COLORS[task.status]} opacity-30`} />

                      {/* Progress bar */}
                      <div
                        className={`absolute top-0 bottom-0 left-0 rounded-r ${STATUS_COLORS[task.status]}`}
                        style={{ width: `${task.progress}%` }}
                      />

                      {/* Task label */}
                      <div className="relative h-full flex items-center px-2 text-xs font-medium text-gray-800 truncate">
                        {width > 5 && task.title}
                      </div>
                    </div>

                    {/* Tooltip on hover */}
                    {hoveredTask === task.id && (
                      <div
                        className="absolute z-20 bg-gray-900 text-white text-xs rounded py-2 px-3 shadow-lg pointer-events-none"
                        style={{
                          left: `${left + width / 2}%`,
                          transform: 'translateX(-50%)',
                          bottom: '100%',
                          marginBottom: '4px',
                        }}
                      >
                        <div className="font-medium mb-1">{task.title}</div>
                        <div className="text-gray-300">
                          {format(task.startDate, 'MMM d')} - {format(task.endDate, 'MMM d')}
                        </div>
                        <div className="text-gray-300">
                          Progress: {task.progress}% • Duration: {formatDuration(task.estimatedDuration)}
                        </div>
                        {task.dependencies.length > 0 && (
                          <div className="text-gray-400 mt-1 text-[10px]">
                            Depends on: {task.dependencies.map(depId => {
                              const dep = sortedTasks.find(t => t.id === depId);
                              return dep?.title || 'Unknown';
                            }).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-4 text-xs text-gray-600">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded bg-slate-400 mr-2" />
          To Do
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded bg-purple-500 mr-2" />
          Doing
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded bg-emerald-500 mr-2" />
          Done
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded bg-amber-400 mr-2" />
          On Hold
        </div>
        <div className="border-l border-gray-300 pl-6 flex items-center">
          <div className="w-1 h-3 bg-emerald-500 mr-1" />
          <span className="mr-2">Low</span>
          <div className="w-1 h-3 bg-yellow-500 mr-1" />
          <span className="mr-2">Med</span>
          <div className="w-1 h-3 bg-rose-500 mr-1" />
          <span>High Priority</span>
        </div>
      </div>
    </div>
  );
}