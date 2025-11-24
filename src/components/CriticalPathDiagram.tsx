import { useMemo, useState, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Info, Eye, EyeOff } from 'lucide-react';
import { Task } from '../types';
import {
  calculateCriticalPath,
  formatHoursForDisplay,
  CPMTaskData
} from '../utils/criticalPathUtils';

interface CriticalPathDiagramProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  lane: number;
}

// Layout constants
const LANE_HEIGHT = 120;
const PADDING_TOP = 60; // Space for timeline
const PADDING_LEFT = 20;
const BASE_PIXELS_PER_HOUR = 60; // Base scale

type TimeUnit = 'hour' | 'day' | 'week';

export default function CriticalPathDiagram({ tasks, onTaskClick }: CriticalPathDiagramProps) {
  const [zoom, setZoom] = useState(1);
  const [showLegend, setShowLegend] = useState(true);
  const [simpleMode, setSimpleMode] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate CPM data
  const cpmResult = useMemo(() => calculateCriticalPath(tasks), [tasks]);
  const { taskData, criticalPath, projectDuration, projectStartDate, totalManHours } = cpmResult;

  // Determine Time Unit based on Zoom
  const timeUnit: TimeUnit = useMemo(() => {
    const pixelsPerHour = BASE_PIXELS_PER_HOUR * zoom;
    if (pixelsPerHour < 10) return 'week';
    if (pixelsPerHour < 30) return 'day';
    return 'hour';
  }, [zoom]);

  // Calculate node positions using Time-Scaled Layout
  const { nodePositions, totalLanes } = useMemo(() => {
    const positions = new Map<string, NodePosition>();
    if (tasks.length === 0) return { nodePositions: positions, totalLanes: 0 };

    const pixelsPerHour = BASE_PIXELS_PER_HOUR;
    const laneTasks = new Map<number, CPMTaskData[]>();

    // 1. Assign Critical Path to Lane 0
    const criticalTasks = tasks.filter(t => taskData.get(t.id)?.isCritical);
    laneTasks.set(0, []);
    criticalTasks.forEach(task => {
      const data = taskData.get(task.id);
      if (data) laneTasks.get(0)!.push(data);
    });

    // 2. Assign other tasks to lanes using greedy packing
    const nonCriticalTasks = tasks
      .filter(t => !taskData.get(t.id)?.isCritical)
      .sort((a, b) => (taskData.get(a.id)?.es || 0) - (taskData.get(b.id)?.es || 0));

    nonCriticalTasks.forEach(task => {
      const data = taskData.get(task.id);
      if (!data) return;

      let laneIndex = 1;
      let placed = false;

      while (!placed) {
        if (!laneTasks.has(laneIndex)) {
          laneTasks.set(laneIndex, []);
        }

        const tasksInLane = laneTasks.get(laneIndex)!;
        // Check for overlap
        const hasOverlap = tasksInLane.some(existing => {
          // Add a small buffer to avoid visual crowding
          return !(data.ef <= existing.es || data.es >= existing.ef);
        });

        if (!hasOverlap) {
          tasksInLane.push(data);
          placed = true;
        } else {
          laneIndex++;
        }
      }
    });

    // 3. Calculate Coordinates
    let maxLane = 0;
    laneTasks.forEach((laneData, laneIndex) => {
      maxLane = Math.max(maxLane, laneIndex);
      laneData.forEach(data => {
        positions.set(data.taskId, {
          x: PADDING_LEFT + (data.es * pixelsPerHour),
          y: PADDING_TOP + (laneIndex * LANE_HEIGHT),
          width: Math.max(data.duration * pixelsPerHour, 60), // Min width for visibility
          height: 60,
          lane: laneIndex,
        });
      });
    });

    return { nodePositions: positions, totalLanes: maxLane + 1 };
  }, [tasks, taskData]);

  // Calculate SVG dimensions
  const svgDimensions = useMemo(() => {
    const width = PADDING_LEFT + (projectDuration * BASE_PIXELS_PER_HOUR) + 200; // Extra space at end
    const height = PADDING_TOP + (totalLanes * LANE_HEIGHT) + 40;
    return { width, height };
  }, [projectDuration, totalLanes]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.1)); // Allow zooming out further
  const handleResetZoom = () => setZoom(1);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Info className="h-12 w-12 mb-4 text-purple-300" />
        <p className="text-lg">Nothing planned yet</p>
        <p className="text-sm">Add activities to see what matters most today</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* Header with Summary and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        {/* Day Summary */}
        <div className="flex gap-8">
          <div>
            <div className="text-sm font-medium text-gray-500">Total Effort</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-800">
                {formatHoursForDisplay(totalManHours)}
              </span>
              <span className="text-sm text-gray-500">
                (Man Hours)
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Project Span</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-600">
                {formatHoursForDisplay(projectDuration)}
              </span>
              <span className="text-sm text-gray-500">
                ({criticalPath.length} critical item{criticalPath.length !== 1 ? 's' : ''})
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-gray-600"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600 min-w-[3rem] text-center font-medium">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-gray-600"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-gray-600"
            title="Reset zoom"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onClick={() => setSimpleMode(!simpleMode)}
            className={`p-1.5 rounded transition-all flex items-center gap-1.5 ${simpleMode
              ? 'bg-white shadow-sm text-green-700'
              : 'hover:bg-white hover:shadow-sm text-gray-600'
              }`}
            title={simpleMode ? 'Switch to detailed view' : 'Switch to simple view'}
          >
            {simpleMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span className="text-xs font-medium">{simpleMode ? 'Simple' : 'Detailed'}</span>
          </button>
          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`p-1.5 rounded transition-all ${showLegend
              ? 'bg-white shadow-sm text-purple-700'
              : 'hover:bg-white hover:shadow-sm text-gray-600'
              }`}
            title={showLegend ? "Hide legend" : "Show legend"}
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Legend Sidebar */}
        {showLegend && (
          <div className="w-full md:w-64 flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="text-sm font-semibold text-gray-800 mb-3">Legend</div>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 bg-rose-500 rounded mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-gray-900">Must do</div>
                  <div className="text-[10px] text-gray-500">Critical Path (Lane 1)</div>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 bg-orange-400 rounded mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-gray-900">Important</div>
                  <div className="text-[10px] text-gray-500">Little flexibility</div>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 bg-yellow-400 rounded mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-gray-900">Can wait</div>
                  <div className="text-[10px] text-gray-500">Some flexibility</div>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 bg-emerald-400 rounded mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-gray-900">Flexible</div>
                  <div className="text-[10px] text-gray-500">Maximum flexibility</div>
                </div>
              </div>

              <div className="border-t pt-3 mt-1">
                <div className="text-xs font-medium text-gray-700 mb-2">Metrics</div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-600">
                  <div className="bg-gray-50 p-1.5 rounded">
                    <strong>ES</strong>: Early Start
                  </div>
                  <div className="bg-gray-50 p-1.5 rounded">
                    <strong>EF</strong>: Early Finish
                  </div>
                  <div className="bg-gray-50 p-1.5 rounded">
                    <strong>LS</strong>: Late Start
                  </div>
                  <div className="bg-gray-50 p-1.5 rounded">
                    <strong>LF</strong>: Late Finish
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Diagram Container */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto border rounded-lg bg-gray-50/50 w-full"
          style={{ maxHeight: '70vh', minHeight: '400px' }}
        >
          <svg
            width={svgDimensions.width * zoom}
            height={svgDimensions.height * zoom}
            className="min-w-full"
          >
            <g transform={`scale(${zoom})`}>
              {/* Timeline Header */}
              <TimelineHeader
                width={svgDimensions.width}
                projectDuration={projectDuration}
                pixelsPerHour={BASE_PIXELS_PER_HOUR}
                timeUnit={timeUnit}
                projectStartDate={projectStartDate}
                zoom={zoom}
              />

              {/* Lane Backgrounds */}
              {Array.from({ length: totalLanes }).map((_, i) => (
                <rect
                  key={`lane-${i}`}
                  x={0}
                  y={PADDING_TOP + (i * LANE_HEIGHT)}
                  width={svgDimensions.width}
                  height={LANE_HEIGHT}
                  className={i % 2 === 0 ? 'fill-white' : 'fill-gray-50/50'}
                />
              ))}

              {/* Lane Labels */}
              {Array.from({ length: totalLanes }).map((_, i) => (
                <text
                  key={`label-${i}`}
                  x={10}
                  y={PADDING_TOP + (i * LANE_HEIGHT) + 20}
                  className="fill-gray-400 font-medium uppercase tracking-wider"
                  style={{ fontSize: `${10 / zoom}px` }}
                >
                  {i === 0 ? 'Critical Path' : `Lane ${i + 1}`}
                </text>
              ))}

              {/* Dependency Arrows */}
              {tasks.map(task =>
                task.dependencies.map(depId => {
                  const fromPos = nodePositions.get(depId);
                  const toPos = nodePositions.get(task.id);
                  if (!fromPos || !toPos) return null;

                  const fromData = taskData.get(depId);
                  const toData = taskData.get(task.id);
                  const isCriticalLink = fromData?.isCritical && toData?.isCritical;

                  return (
                    <DependencyArrow
                      key={`${depId}-${task.id}`}
                      from={fromPos}
                      to={toPos}
                      isCritical={isCriticalLink}
                      zoom={zoom}
                    />
                  );
                })
              )}

              {/* Task Nodes */}
              {tasks.map(task => {
                const pos = nodePositions.get(task.id);
                const data = taskData.get(task.id);
                if (!pos || !data) return null;

                return (
                  <TaskNode
                    key={task.id}
                    task={task}
                    cpmData={data}
                    position={pos}
                    onClick={() => onTaskClick(task)}
                    simpleMode={simpleMode}
                    zoom={zoom}
                  />
                );
              })}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

// Timeline Header Component
function TimelineHeader({
  width,
  projectDuration,
  pixelsPerHour,
  timeUnit,
  projectStartDate,
  zoom
}: {
  width: number,
  projectDuration: number,
  pixelsPerHour: number,
  timeUnit: TimeUnit,
  projectStartDate: Date,
  zoom: number
}) {
  const projectEndTime = new Date(projectStartDate.getTime() + projectDuration * 60 * 60 * 1000);

  // Determine tick interval and start time based on time unit
  let tickIntervalMs = 60 * 60 * 1000; // default 1 hour
  let startTime = new Date(projectStartDate);

  if (timeUnit === 'day') {
    tickIntervalMs = 24 * 60 * 60 * 1000;
    // Align to next midnight
    startTime.setHours(0, 0, 0, 0);
    if (startTime < projectStartDate) {
      startTime = new Date(startTime.getTime() + tickIntervalMs);
    }
  } else if (timeUnit === 'week') {
    tickIntervalMs = 7 * 24 * 60 * 60 * 1000;
    // Align to next Monday (assuming week starts on Monday)
    const day = startTime.getDay();
    const diff = startTime.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startTime.setDate(diff);
    startTime.setHours(0, 0, 0, 0);
    // If aligned start is before project start, move to next week
    // Actually for weeks, we might want to show the current week even if it started before
    // But to be consistent with "next tick", let's find the first Monday after or at project start
    while (startTime < projectStartDate) {
      startTime = new Date(startTime.getTime() + tickIntervalMs);
    }
  } else {
    // Hour alignment
    startTime.setMinutes(0, 0, 0);
    if (startTime < projectStartDate) {
      startTime = new Date(startTime.getTime() + tickIntervalMs);
    }
  }

  const ticks = [];
  let currentTick = new Date(startTime);
  // Add a buffer to end time to ensure we cover the whole width
  const endTickTime = projectEndTime.getTime() + tickIntervalMs;

  while (currentTick.getTime() <= endTickTime) {
    ticks.push(new Date(currentTick));
    currentTick = new Date(currentTick.getTime() + tickIntervalMs);
  }

  return (
    <g>
      <rect x={0} y={0} width={width} height={PADDING_TOP} className="fill-white" />
      <line
        x1={0}
        y1={PADDING_TOP}
        x2={width}
        y2={PADDING_TOP}
        className="stroke-gray-200"
        strokeWidth={1 / zoom}
      />

      {ticks.map((tickDate, i) => {
        // Calculate x position relative to project start
        const timeDiffHours = (tickDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60);
        const x = PADDING_LEFT + (timeDiffHours * pixelsPerHour);

        if (x < 0) return null; // Don't render ticks before start (shouldn't happen with logic above but safety)

        let label = '';
        if (timeUnit === 'day') {
          // Format: "Mon 24"
          label = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric' }).format(tickDate);
        } else if (timeUnit === 'week') {
          // Format: "Week of Nov 24"
          const weekStart = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(tickDate);
          label = `Week of ${weekStart}`;
        } else {
          // Format: "10:00"
          label = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: false }).format(tickDate);
        }

        return (
          <g key={i} transform={`translate(${x}, 0)`}>
            <line
              x1={0}
              y1={PADDING_TOP - 10}
              x2={0}
              y2={PADDING_TOP}
              className="stroke-gray-300"
              strokeWidth={1 / zoom}
            />
            <text
              x={0}
              y={PADDING_TOP - 15}
              textAnchor="middle"
              className="fill-gray-500 font-medium"
              style={{ fontSize: `${10 / zoom}px` }}
            >
              {label}
            </text>
            {/* Grid line down */}
            <line
              x1={0}
              y1={PADDING_TOP}
              x2={0}
              y2={10000} // Arbitrary large number to cover height
              className="stroke-gray-100"
              strokeDasharray={`${4 / zoom},${4 / zoom}`}
              strokeWidth={1 / zoom}
            />
          </g>
        );
      })}
    </g>
  );
}

// Task Node Component
interface TaskNodeProps {
  task: Task;
  cpmData: CPMTaskData;
  position: NodePosition;
  onClick: () => void;
  simpleMode: boolean;
  zoom: number;
}

function TaskNode({ task, cpmData, position, onClick, simpleMode, zoom }: TaskNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { isCritical, float } = cpmData;

  // Determine color based on criticality and float
  const getColorClass = () => {
    if (isCritical) return { bg: 'fill-rose-100', border: 'stroke-rose-500', indicator: 'fill-rose-500' };
    if (float <= 8) return { bg: 'fill-orange-100', border: 'stroke-orange-400', indicator: 'fill-orange-400' };
    if (float <= 40) return { bg: 'fill-yellow-100', border: 'stroke-yellow-500', indicator: 'fill-yellow-500' };
    return { bg: 'fill-emerald-100', border: 'stroke-emerald-400', indicator: 'fill-emerald-400' };
  };

  const colors = getColorClass();

  return (
    <g
      className="cursor-pointer transition-opacity hover:opacity-90"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      transform={`translate(${position.x}, ${position.y + (LANE_HEIGHT - position.height) / 2})`}
    >
      {/* Main box */}
      <rect
        x={0}
        y={0}
        width={position.width}
        height={position.height}
        rx={6 / zoom}
        className={`${colors.bg} ${colors.border}`}
        strokeWidth={(isHovered ? (isCritical ? 3 : 2) : (isCritical ? 2 : 1)) / zoom}
      />

      {/* Progress bar (visual only for now) */}
      <rect
        x={0}
        y={position.height - (4 / zoom)}
        width={position.width}
        height={4 / zoom}
        className={colors.indicator}
        clipPath={`inset(0 0 0 0 round 0 0 ${6 / zoom}px ${6 / zoom}px)`}
      />

      {/* Content */}
      <foreignObject x={0} y={0} width={position.width} height={position.height - (4 / zoom)}>
        <div className="h-full flex flex-col justify-center items-center p-[2px] text-center overflow-hidden">
          <div
            className="font-semibold text-gray-900 truncate w-full leading-tight"
            style={{ fontSize: `${12 / zoom}px` }}
          >
            {task.title}
          </div>
          {!simpleMode && (
            <div
              className="text-gray-600 leading-tight"
              style={{ fontSize: `${10 / zoom}px`, marginTop: `${4 / zoom}px` }}
            >
              {formatHoursForDisplay(task.estimatedDuration)}
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
}

// Dependency Arrow Component
interface DependencyArrowProps {
  from: NodePosition;
  to: NodePosition;
  isCritical?: boolean;
  zoom: number;
}

function DependencyArrow({ from, to, isCritical, zoom }: DependencyArrowProps) {
  const fromX = from.x + from.width;
  const fromY = from.y + (LANE_HEIGHT / 2);
  const toX = to.x;
  const toY = to.y + (LANE_HEIGHT / 2);

  // Curvy path
  const midX = (fromX + toX) / 2;
  const path = `M ${fromX} ${fromY} 
                C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;

  return (
    <g>
      <defs>
        <marker
          id={`arrowhead-${isCritical ? 'critical' : 'normal'}`}
          markerWidth={10}
          markerHeight={7}
          refX={9}
          refY={3.5}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            className={isCritical ? 'fill-rose-500' : 'fill-gray-400'}
          />
        </marker>
      </defs>
      <path
        d={path}
        fill="none"
        className={isCritical ? 'stroke-rose-500' : 'stroke-gray-400'}
        strokeWidth={(isCritical ? 2 : 1) / zoom}
        strokeDasharray={isCritical ? undefined : `${4 / zoom},${2 / zoom}`}
        markerEnd={`url(#arrowhead-${isCritical ? 'critical' : 'normal'})`}
      />
    </g>
  );
}
