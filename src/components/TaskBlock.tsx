import React from 'react';
import { Task } from '../types';
import { TaskPosition, formatDuration } from '../utils/timelineUtils';
import { Check } from 'lucide-react';

interface TaskBlockProps {
  task: Task;
  position: TaskPosition;
  onClick: (task: Task) => void;
  isSelected?: boolean;
}

export function TaskBlock({ task, position, onClick, isSelected = false }: TaskBlockProps) {
  const color = task.color || '#3b82f6';
  const isCompleted = task.completed;

  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${position.top}px`,
    height: `${position.height}px`,
    left: `${position.left}%`,
    width: `${position.width}%`,
    backgroundColor: isCompleted ? '#d1d5db' : color,
    opacity: isCompleted ? 0.6 : 0.9,
    borderRadius: '6px',
    border: isSelected ? '2px solid #1f2937' : '1px solid rgba(255,255,255,0.2)',
    cursor: 'pointer',
    overflow: 'hidden',
    padding: '8px',
    transition: 'all 0.2s ease',
  };

  const showDetails = position.height > 40;
  const showDuration = position.height > 60;

  return (
    <div
      style={style}
      onClick={() => onClick(task)}
      className="hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="flex items-start gap-2 h-full">
        {isCompleted && (
          <Check className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div
            className="font-medium text-white text-sm leading-tight"
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: showDetails ? 2 : 1,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {task.title}
          </div>
          {showDuration && (
            <div className="text-xs text-white/80 mt-1">
              {formatDuration(task.duration)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
