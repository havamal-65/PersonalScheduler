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


// Parse specific time like "3pm", "3:30pm", "15:00"
function parseTime(text: string): { time: { hour: number; minute: number } | null; remaining: string } {
  const timePatterns = [
    // 3pm, 3PM, 11am
    { regex: /\b(\d{1,2})\s*(pm|PM|am|AM)\b/, handler: (match: RegExpMatchArray) => {
      let hour = parseInt(match[1]);
      const isPM = match[2].toLowerCase() === 'pm';
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      return { hour, minute: 0 };
    }},
    // 3:30pm, 3:30PM, 11:45am
    { regex: /\b(\d{1,2}):(\d{2})\s*(pm|PM|am|AM)\b/, handler: (match: RegExpMatchArray) => {
      let hour = parseInt(match[1]);
      const minute = parseInt(match[2]);
      const isPM = match[3].toLowerCase() === 'pm';
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      return { hour, minute };
    }},
    // 15:00, 09:30 (24-hour format)
    { regex: /\b([01]?\d|2[0-3]):([0-5]\d)\b/, handler: (match: RegExpMatchArray) => {
      return { hour: parseInt(match[1]), minute: parseInt(match[2]) };
    }},
  ];

  for (const { regex, handler } of timePatterns) {
    const match = text.match(regex);
    if (match) {
      const remaining = text.replace(match[0], '').trim();
      return { time: handler(match), remaining };
    }
  }

  return { time: null, remaining: text };
}

// Parse day of week like "monday", "next friday", "this thursday"
function parseDayOfWeek(text: string): { dayOffset: number | null; remaining: string } {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  const daysOfWeek: { [key: string]: number } = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4, thur: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
  };

  // Try "next monday", "this friday", etc.
  const nextThisPattern = /\b(next|this)\s+(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)\b/i;
  let match = text.match(nextThisPattern);
  if (match) {
    const modifier = match[1].toLowerCase();
    const dayName = match[2].toLowerCase();
    const targetDay = daysOfWeek[dayName];

    let daysUntil = targetDay - currentDay;
    if (modifier === 'next') {
      // Next week's day
      if (daysUntil <= 0) daysUntil += 7;
      daysUntil += 7; // Force next week
    } else {
      // This week's day
      if (daysUntil < 0) daysUntil += 7;
      if (daysUntil === 0 && now.getHours() >= 17) daysUntil = 7; // If past 5pm, assume next week
    }

    const remaining = text.replace(match[0], '').trim();
    return { dayOffset: daysUntil, remaining };
  }

  // Try just day name: "monday", "friday"
  const dayPattern = /\b(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)\b/i;
  match = text.match(dayPattern);
  if (match) {
    const dayName = match[1].toLowerCase();
    const targetDay = daysOfWeek[dayName];

    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7; // Default to next occurrence

    const remaining = text.replace(match[0], '').trim();
    return { dayOffset: daysUntil, remaining };
  }

  return { dayOffset: null, remaining: text };
}

// Parse date expressions like "tomorrow", "next week", "monday at 3pm"
function parseStartDate(text: string): { date: Date; remaining: string } {
  const now = new Date();
  let workingText = text;
  let baseDate = new Date(now);

  // First, try to parse day of week
  const { dayOffset, remaining: afterDay } = parseDayOfWeek(workingText);
  if (dayOffset !== null) {
    baseDate.setDate(baseDate.getDate() + dayOffset);
    baseDate.setHours(9, 0, 0, 0); // Default to 9am
    workingText = afterDay;
  }

  // Remove common connectors like "at", "on"
  workingText = workingText.replace(/\b(at|on)\b/gi, '').trim();

  // Then, try to parse specific time
  const { time, remaining: afterTime } = parseTime(workingText);
  if (time) {
    baseDate.setHours(time.hour, time.minute, 0, 0);
    workingText = afterTime;
  }

  // If we found day or time, return that
  if (dayOffset !== null || time !== null) {
    return { date: baseDate, remaining: workingText };
  }

  // Otherwise, try relative date patterns
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
    {
      regex: /\bthis\s*morning\b/i,
      getDate: () => {
        const d = new Date(now);
        d.setHours(9, 0, 0, 0);
        return d;
      }
    },
    {
      regex: /\btonight\b/i,
      getDate: () => {
        const d = new Date(now);
        d.setHours(19, 0, 0, 0);
        return d;
      }
    },
  ];

  for (const { regex, getDate } of patterns) {
    const match = workingText.match(regex);
    if (match) {
      const remaining = workingText.replace(match[0], '').trim();
      return { date: getDate(), remaining };
    }
  }

  return { date: now, remaining: workingText };
}

// Main parser
export function parseQuickAdd(input: string): ParsedTask {
  let text = input.trim();
  let workingText = text;
  let baseDate = new Date();
  let duration = 60; // Default 1 hour

  // First, try to parse day of week (before duration to avoid conflicts)
  const { dayOffset, remaining: afterDay } = parseDayOfWeek(workingText);
  if (dayOffset !== null) {
    baseDate.setDate(baseDate.getDate() + dayOffset);
    baseDate.setHours(9, 0, 0, 0); // Default to 9am
    workingText = afterDay;
  }

  // Remove common connectors like "at", "on"
  workingText = workingText.replace(/\b(at|on)\b/gi, '').trim();

  // Then, try to parse specific time
  const { time, remaining: afterTime } = parseTime(workingText);
  if (time) {
    baseDate.setHours(time.hour, time.minute, 0, 0);
    workingText = afterTime;
  }

  // Parse duration from remaining text
  const { duration: parsedDuration, remaining: afterDuration } = parseDuration(workingText);
  duration = parsedDuration;
  workingText = afterDuration;

  // If no day was found yet, try relative patterns like "tomorrow", "tonight"
  if (dayOffset === null) {
    const { date, remaining: afterRelative } = parseStartDate(workingText);
    if (date.getTime() !== new Date().getTime() || workingText.match(/\b(tomorrow|tonight|today|afternoon|evening|morning)\b/i)) {
      baseDate = date;
      workingText = afterRelative;
    }
  }

  // Clean up the title
  const cleanTitle = workingText
    .replace(/\s+/g, ' ')
    .replace(/^[-,.:]+|[-,.:]+$/g, '')
    .trim();

  return {
    title: cleanTitle || input.trim(),
    duration,
    startDate: baseDate,
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
            placeholder='Try "Call mom 30m thursday at 3pm" or "Review document 2h tomorrow"'
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
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">30m</kbd> <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">2h</kbd> for duration</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">monday</kbd> <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">next friday</kbd> for days</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">3pm</kbd> <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">2:30pm</kbd> for times</span>
        </div>
      )}
    </div>
  );
}
