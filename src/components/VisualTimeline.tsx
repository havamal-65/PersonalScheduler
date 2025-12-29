import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Task, ZoomLevel } from '../types';
import { TaskBlock } from './TaskBlock';
import {
  ZOOM_CONFIGS,
  calculateTaskPositions,
  generateTimeMarkers,
} from '../utils/timelineUtils';
import { format, differenceInMinutes, addDays, startOfDay } from 'date-fns';

interface VisualTimelineProps {
  tasks: Task[];
  zoomLevel: ZoomLevel;
  currentDate: Date;
  onTaskClick: (task: Task) => void;
  onTimelineClick: (date: Date) => void;
  selectedTaskId?: string;
}

const INITIAL_BUFFER_DAYS = 30;
const LOAD_MORE_DAYS = 30;
const SCROLL_THRESHOLD = 0.15;

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
  const [rangeStart, setRangeStart] = useState(() => addDays(startOfDay(currentDate), -INITIAL_BUFFER_DAYS));
  const [rangeEnd, setRangeEnd] = useState(() => addDays(startOfDay(currentDate), INITIAL_BUFFER_DAYS));
  const isLoadingRef = useRef(false);

  const config = ZOOM_CONFIGS[zoomLevel];
  const markers = generateTimeMarkers(rangeStart, rangeEnd, config);
  const positions = calculateTaskPositions(tasks, rangeStart, config);

  const totalDays = Math.ceil(differenceInMinutes(rangeEnd, rangeStart) / (60 * 24));
  const totalHeight = totalDays * 24 * config.pixelsPerHour;

  // Reset range when zoom level or current date changes
  useEffect(() => {
    const newStart = addDays(startOfDay(currentDate), -INITIAL_BUFFER_DAYS);
    const newEnd = addDays(startOfDay(currentDate), INITIAL_BUFFER_DAYS);
    setRangeStart(newStart);
    setRangeEnd(newEnd);
  }, [zoomLevel, currentDate]);

  // Scroll to current date when currentDate or range changes
  useEffect(() => {
    if (timelineRef.current) {
      const minutesFromStart = differenceInMinutes(currentDate, rangeStart);
      const hoursFromStart = minutesFromStart / 60;
      const scrollPosition = hoursFromStart * config.pixelsPerHour;

      const offset = timelineRef.current.clientHeight / 2;
      timelineRef.current.scrollTop = Math.max(0, scrollPosition - offset);
    }
  }, [currentDate, rangeStart, config.pixelsPerHour]);

  // Update "now" line position
  useEffect(() => {
    const updateNowLine = () => {
      const now = new Date();
      const minutesFromStart = differenceInMinutes(now, rangeStart);
      const hoursFromStart = minutesFromStart / 60;
      setNowLinePosition(hoursFromStart * config.pixelsPerHour);
    };

    updateNowLine();
    const interval = setInterval(updateNowLine, 60000);
    return () => clearInterval(interval);
  }, [rangeStart]);

  // Handle infinite scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;

    // Sync scroll with time markers column
    const timeColumn = target.previousElementSibling;
    if (timeColumn) {
      timeColumn.scrollTop = target.scrollTop;
    }

    if (isLoadingRef.current) return;

    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;

    const distanceFromTop = scrollTop;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    const threshold = scrollHeight * SCROLL_THRESHOLD;

    // Load more content at the top (past dates)
    if (distanceFromTop < threshold) {
      isLoadingRef.current = true;

      const oldScrollHeight = scrollHeight;
      const newStart = addDays(rangeStart, -LOAD_MORE_DAYS);

      setRangeStart(newStart);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (timelineRef.current) {
            const newScrollHeight = timelineRef.current.scrollHeight;
            const heightAdded = newScrollHeight - oldScrollHeight;
            timelineRef.current.scrollTop = scrollTop + heightAdded;
            isLoadingRef.current = false;
          }
        });
      });
    }

    // Load more content at the bottom (future dates)
    if (distanceFromBottom < threshold) {
      isLoadingRef.current = true;

      const newEnd = addDays(rangeEnd, LOAD_MORE_DAYS);
      setRangeEnd(newEnd);

      requestAnimationFrame(() => {
        isLoadingRef.current = false;
      });
    }
  }, [rangeStart, rangeEnd]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('timeline-bg')) {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top + e.currentTarget.scrollTop;
      const hours = y / config.pixelsPerHour;
      const clickedDate = new Date(rangeStart.getTime() + hours * 60 * 60 * 1000);
      onTimelineClick(clickedDate);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header row */}
      <div className="flex flex-shrink-0">
        <div className="w-24 h-12 bg-gray-100 border-b border-r border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
          Time
        </div>
        <div className="flex-1 h-12 bg-gray-100 border-b border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
          {format(currentDate, 'MMMM yyyy')}
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Time markers column - scrolls with timeline */}
        <div className="w-24 bg-white border-r border-gray-200 flex-shrink-0 overflow-hidden">
          <div className="relative" style={{ height: totalHeight }}>
            {markers.map((marker, idx) => {
              const minutesFromStart = differenceInMinutes(marker.time, rangeStart);
              const hoursFromStart = minutesFromStart / 60;
              const top = hoursFromStart * config.pixelsPerHour;

              return (
                <div
                  key={`${marker.time.getTime()}-${idx}`}
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
          onScroll={handleScroll}
        >
          <div className="relative timeline-bg" style={{ height: totalHeight }}>
          {/* Grid lines */}
          {markers.map((marker, idx) => {
            const minutesFromStart = differenceInMinutes(marker.time, rangeStart);
            const hoursFromStart = minutesFromStart / 60;
            const top = hoursFromStart * config.pixelsPerHour;

            return (
              <div
                key={`grid-${marker.time.getTime()}-${idx}`}
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
    </div>
  );
}
