import { useState, useRef, useEffect } from 'react';
import { Plus, Zap, Clock, Calendar } from 'lucide-react';

interface QuickAddProps {
  onAdd: (parsed: ParsedTask) => void;
  disabled?: boolean;
}

export interface ParsedTask {
  title: string;
  duration: number; // in minutes
  startDate: Date;
}

// Parse natural language duration (returns minutes)
function parseDuration(text: string): { duration: number; remaining: string } {
  const patterns = [
    // Hours
    { regex: /(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?/i, multiplier: 60 },
    { regex: /(\d+(?:\.\d+)?)\s*hours?/i, multiplier: 60 },
    // Minutes
    { regex: /(\d+)\s*m(?:ins?|inutes?)?/i, multiplier: 1 },
    { regex: /(\d+)\s*minutes?/i, multiplier: 1 },
    // Days (assume 8 working hours)
    { regex: /(\d+(?:\.\d+)?)\s*d(?:ays?)?/i, multiplier: 480 },
    { regex: /(\d+(?:\.\d+)?)\s*days?/i, multiplier: 480 },
  ];

  for (const { regex, multiplier } of patterns) {
    const match = text.match(regex);
    if (match) {
      const value = parseFloat(match[1]);
      const duration = value * multiplier;
      const remaining = text.replace(match[0], '').trim();
      return { duration, remaining };
    }
  }

  return { duration: 60, remaining: text }; // Default 1 hour (60 minutes)
}


// Parse time expressions like "tomorrow", "next week"
function parseStartDate(text: string): { date: Date; remaining: string } {
  const now = new Date();
  const patterns: { regex: RegExp; getDate: () => Date }[] = [
    { 
      regex: /\btomorrow\b/i, 
      getDate: () => {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
      }
    },
    { 
      regex: /\bnext\s*week\b/i, 
      getDate: () => {
        const d = new Date(now);
        d.setDate(d.getDate() + 7);
        d.setHours(9, 0, 0, 0);
        return d;
      }
    },
    { 
      regex: /\btoday\b/i, 
      getDate: () => now 
    },
    { 
      regex: /\bthis\s*afternoon\b/i, 
      getDate: () => {
        const d = new Date(now);
        d.setHours(14, 0, 0, 0);
        return d;
      }
    },
    { 
      regex: /\bthis\s*evening\b/i, 
      getDate: () => {
        const d = new Date(now);
        d.setHours(17, 0, 0, 0);
        return d;
      }
    },
  ];

  for (const { regex, getDate } of patterns) {
    const match = text.match(regex);
    if (match) {
      const remaining = text.replace(match[0], '').trim();
      return { date: getDate(), remaining };
    }
  }

  return { date: now, remaining: text };
}

// Main parser
export function parseQuickAdd(input: string): ParsedTask {
  let text = input.trim();

  // Parse in order: duration, date
  const { duration, remaining: afterDuration } = parseDuration(text);
  const { date, remaining: title } = parseStartDate(afterDuration);

  // Clean up the title
  const cleanTitle = title
    .replace(/\s+/g, ' ')
    .replace(/^[-,.:]+|[-,.:]+$/g, '')
    .trim();

  return {
    title: cleanTitle || input.trim(),
    duration,
    startDate: date,
  };
}

// Format duration for display (input is minutes)
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function QuickAdd({ onAdd, disabled }: QuickAddProps) {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<ParsedTask | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (input.trim()) {
      setPreview(parseQuickAdd(input));
    } else {
      setPreview(null);
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    
    const parsed = parseQuickAdd(input);
    onAdd(parsed);
    setInput('');
    setPreview(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setInput('');
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className={`flex items-center bg-white border-2 rounded-xl transition-all ${
          isFocused ? 'border-blue-400 shadow-lg' : 'border-gray-200 shadow-sm'
        }`}>
          <div className="pl-4">
            <Zap className={`h-5 w-5 ${isFocused ? 'text-blue-500' : 'text-gray-400'}`} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder='Try "Review document 2h" or "Call mom 30m tomorrow"'
            className="flex-1 px-3 py-4 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
            disabled={disabled}
          />
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className={`m-2 p-2 rounded-lg transition-all ${
              input.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </form>

      {/* Live Preview */}
      {preview && isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Preview</div>
          <div className="flex items-center justify-between">
            <div className="font-medium text-gray-900 truncate flex-1">
              {preview.title || <span className="text-gray-400 italic">Enter task name...</span>}
            </div>
            <div className="flex items-center space-x-2 ml-3">
              <span className="flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                <Clock className="h-3 w-3 mr-1" />
                {formatDuration(preview.duration)}
              </span>
              {preview.startDate.getTime() > Date.now() + 60000 && (
                <span className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  <Calendar className="h-3 w-3 mr-1" />
                  {preview.startDate.toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Press Enter to add • Esc to cancel
          </div>
        </div>
      )}

      {/* Help Text */}
      {!input && !isFocused && (
        <div className="mt-2 flex items-center justify-center space-x-4 text-xs text-gray-400">
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">30m</kbd> <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">2h</kbd> <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">1d</kbd> for duration</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">tomorrow</kbd> to schedule</span>
        </div>
      )}
    </div>
  );
}
