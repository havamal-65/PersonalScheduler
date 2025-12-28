import { ZoomLevel } from '../types';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar } from 'lucide-react';
import { addDays, format } from 'date-fns';

interface TimelineControlsProps {
  zoomLevel: ZoomLevel;
  currentDate: Date;
  onZoomChange: (zoom: ZoomLevel) => void;
  onDateChange: (date: Date) => void;
}

const ZOOM_LEVELS: ZoomLevel[] = ['day', 'three-day', 'week', 'month'];

const ZOOM_LABELS: Record<ZoomLevel, string> = {
  day: 'Day',
  'three-day': '3 Days',
  week: 'Week',
  month: 'Month',
};

export function TimelineControls({
  zoomLevel,
  currentDate,
  onZoomChange,
  onDateChange,
}: TimelineControlsProps) {
  const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);

  const handleZoomIn = () => {
    if (currentIndex > 0) {
      onZoomChange(ZOOM_LEVELS[currentIndex - 1]);
    }
  };

  const handleZoomOut = () => {
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      onZoomChange(ZOOM_LEVELS[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const days = zoomLevel === 'day' ? 1 : zoomLevel === 'three-day' ? 3 : zoomLevel === 'week' ? 7 : 30;
    onDateChange(addDays(currentDate, -days));
  };

  const handleNext = () => {
    const days = zoomLevel === 'day' ? 1 : zoomLevel === 'three-day' ? 3 : zoomLevel === 'week' ? 7 : 30;
    onDateChange(addDays(currentDate, days));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={handleToday}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1.5"
        >
          <Calendar className="w-4 h-4" />
          Today
        </button>

        <div className="flex items-center border border-gray-300 rounded">
          <button
            onClick={handlePrevious}
            className="px-2 py-1.5 text-gray-700 hover:bg-gray-50 border-r border-gray-300"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="px-2 py-1.5 text-gray-700 hover:bg-gray-50"
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-sm font-medium text-gray-700 min-w-[200px] text-center">
          {format(currentDate, 'MMMM d, yyyy')}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Zoom:</span>
        <div className="flex items-center border border-gray-300 rounded">
          <button
            onClick={handleZoomIn}
            disabled={currentIndex === 0}
            className="px-2 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed border-r border-gray-300"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="px-3 py-1.5 text-sm font-medium text-gray-700 min-w-[80px] text-center bg-gray-50">
            {ZOOM_LABELS[zoomLevel]}
          </div>
          <button
            onClick={handleZoomOut}
            disabled={currentIndex === ZOOM_LEVELS.length - 1}
            className="px-2 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed border-l border-gray-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
