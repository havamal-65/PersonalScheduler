import React, { useRef, useEffect, useState } from 'react';
import { Task, ZoomLevel } from '../types';
import { TaskBlock } from './TaskBlock';
import {
  ZOOM_CONFIGS,
  calculateTaskPositions,
  getTimelineRange,
  generateTimeMarkers,
} from '../utils/timelineUtils';
import { format, differenceInMinutes } from 'date-fns';

interface VisualTimelineProps {
  tasks: Task[];
  zoomLevel: ZoomLevel;
  currentDate: Date;
  onTaskClick: (task: Task) => void;
  onTimelineClick: (date: Date) => void;
  selectedTaskId?: string;
}

export function VisualTimeline({
  tasks,
  zoomLevel,
  currentDate,
  onTaskClick,
  onTimelineClick,
  selectedTaskId,
}: VisualTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [nowLinePosition, setNowLinePosition] = useState(0);

  const config = ZOOM_CONFIGS[zoomLevel];
  const { start, end } = getTimelineRange(currentDate, zoomLevel);
  const markers = generateTimeMarkers(start, end, config);
  const positions = calculateTaskPositions(tasks, start, config);

  const totalHeight = config.visibleDays * 24 * config.pixelsPerHour;

  useEffect(() => {
    const now = new Date();
    const minutesFromStart = differenceInMinutes(now, start);
    const hoursFromStart = minutesFromStart / 60;
    setNowLinePosition(hoursFromStart * config.pixelsPerHour);

    const interval = setInterval(() => {
      const now = new Date();
      const minutesFromStart = differenceInMinutes(now, start);
      const hoursFromStart = minutesFromStart / 60;
      setNowLinePosition(hoursFromStart * config.pixelsPerHour);
    }, 60000);

    return () => clearInterval(interval);
  }, [start, config]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('timeline-bg')) {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top + e.currentTarget.scrollTop;
      const hours = y / config.pixelsPerHour;
      const clickedDate = new Date(start.getTime() + hours * 60 * 60 * 1000);
      onTimelineClick(clickedDate);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-gray-50">
      {/* Time markers column */}
      <div className="w-24 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="sticky top-0 h-12 bg-gray-100 border-b border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
          Time
        </div>
        <div className="relative" style={{ height: totalHeight }}>
          {markers.map((marker, idx) => {
            const minutesFromStart = differenceInMinutes(marker.time, start);
            const hoursFromStart = minutesFromStart / 60;
            const top = hoursFromStart * config.pixelsPerHour;

            return (
              <div
                key={idx}
                className={`absolute right-0 pr-2 text-xs ${
                  marker.isDay
                    ? 'font-semibold text-gray-700 -translate-y-2'
                    : 'text-gray-500'
                }`}
                style={{ top: `${top}px` }}
              >
                {marker.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline area */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative"
        onClick={handleTimelineClick}
      >
        <div className="sticky top-0 h-12 bg-gray-100 border-b border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 z-10">
          {format(currentDate, 'MMMM yyyy')}
        </div>
        <div className="relative timeline-bg" style={{ height: totalHeight }}>
          {/* Grid lines */}
          {markers.map((marker, idx) => {
            const minutesFromStart = differenceInMinutes(marker.time, start);
            const hoursFromStart = minutesFromStart / 60;
            const top = hoursFromStart * config.pixelsPerHour;

            return (
              <div
                key={idx}
                className={`absolute w-full ${
                  marker.isDay
                    ? 'border-t-2 border-gray-300'
                    : 'border-t border-gray-200'
                }`}
                style={{ top: `${top}px` }}
              />
            );
          })}

          {/* Now line */}
          {nowLinePosition >= 0 && nowLinePosition <= totalHeight && (
            <div
              className="absolute w-full border-t-2 border-red-500 z-20"
              style={{ top: `${nowLinePosition}px` }}
            >
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full" />
              <div className="absolute -top-1 left-2 text-xs font-medium text-red-500 bg-white px-1 rounded">
                Now
              </div>
            </div>
          )}

          {/* Task blocks */}
          <div className="absolute inset-0 px-4">
            {tasks.map((task) => {
              const position = positions.get(task.id);
              if (!position) return null;

              return (
                <TaskBlock
                  key={task.id}
                  task={task}
                  position={position}
                  onClick={onTaskClick}
                  isSelected={task.id === selectedTaskId}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
