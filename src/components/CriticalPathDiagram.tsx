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
  column: number;
  row: number;
}

// Node dimensions for advanced mode
const NODE_WIDTH = 180;
const NODE_HEIGHT = 100;
// Node dimensions for simple mode
const SIMPLE_NODE_WIDTH = 140;
const SIMPLE_NODE_HEIGHT = 60;

const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 40;
const PADDING = 40;

export default function CriticalPathDiagram({ tasks, onTaskClick }: CriticalPathDiagramProps) {
  const [zoom, setZoom] = useState(1);
  const [showLegend, setShowLegend] = useState(true);
  const [simpleMode, setSimpleMode] = useState(true); // Default to simple mode for beginners
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic dimensions based on mode
  const nodeWidth = simpleMode ? SIMPLE_NODE_WIDTH : NODE_WIDTH;
  const nodeHeight = simpleMode ? SIMPLE_NODE_HEIGHT : NODE_HEIGHT;

  // Calculate CPM data
  const cpmResult = useMemo(() => calculateCriticalPath(tasks), [tasks]);
  const { taskData, criticalPath, projectDuration } = cpmResult;

  // Calculate node positions using a layered layout
  const nodePositions = useMemo(() => {
    const positions = new Map<string, NodePosition>();
    if (tasks.length === 0) return positions;

    // Group tasks by their "column" based on ES value
    // Tasks with similar ES should be in the same column
    const columnsMap = new Map<number, string[]>();

    // Determine columns based on ES
    const esValues = new Set<number>();
    taskData.forEach((data) => {
      esValues.add(data.es);
    });
    const sortedES = Array.from(esValues).sort((a, b) => a - b);
    const esToColumn = new Map(sortedES.map((es, idx) => [es, idx]));

    // Assign tasks to columns
    tasks.forEach(task => {
      const data = taskData.get(task.id);
      if (data) {
        const column = esToColumn.get(data.es) || 0;
        if (!columnsMap.has(column)) {
          columnsMap.set(column, []);
        }
        columnsMap.get(column)!.push(task.id);
      }
    });

    // Calculate positions using dynamic dimensions
    columnsMap.forEach((taskIds, column) => {
      // Sort tasks within column by whether they're critical (critical first)
      const sortedTaskIds = taskIds.sort((a, b) => {
        const aData = taskData.get(a);
        const bData = taskData.get(b);
        if (aData?.isCritical && !bData?.isCritical) return -1;
        if (!aData?.isCritical && bData?.isCritical) return 1;
        return 0;
      });

      sortedTaskIds.forEach((taskId, row) => {
        positions.set(taskId, {
          x: PADDING + column * (nodeWidth + HORIZONTAL_GAP),
          y: PADDING + row * (nodeHeight + VERTICAL_GAP),
          column,
          row,
        });
      });
    });

    return positions;
  }, [tasks, taskData, nodeWidth, nodeHeight]);

  // Calculate SVG dimensions
  const svgDimensions = useMemo(() => {
    let maxX = 400;
    let maxY = 300;

    nodePositions.forEach((pos) => {
      maxX = Math.max(maxX, pos.x + nodeWidth + PADDING);
      maxY = Math.max(maxY, pos.y + nodeHeight + PADDING);
    });

    return { width: maxX, height: maxY };
  }, [nodePositions, nodeWidth, nodeHeight]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
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
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-2 bg-white rounded-lg shadow-md p-2">
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-sm text-gray-600 min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          title="Reset zoom"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button
          onClick={() => setSimpleMode(!simpleMode)}
          className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
            simpleMode ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
          }`}
          title={simpleMode ? 'Switch to detailed view' : 'Switch to simple view'}
        >
          {simpleMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          <span className="text-xs font-medium">{simpleMode ? 'Simple' : 'Detailed'}</span>
        </button>
        <button
          onClick={() => setShowLegend(!showLegend)}
          className={`p-1.5 rounded transition-colors ${
            showLegend ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
          }`}
          title="Toggle legend"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {/* Day Summary */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-md p-3">
        <div className="text-sm">
          <div className="font-medium text-gray-900">Total Time Needed</div>
          <div className="text-lg font-bold text-purple-600">
            {formatHoursForDisplay(projectDuration)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {criticalPath.length} must-do item{criticalPath.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-md p-3">
          <div className="text-xs font-medium text-gray-700 mb-2">Legend</div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-rose-500 rounded" />
              <span className="text-xs text-gray-600">Must do (no flexibility)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-400 rounded" />
              <span className="text-xs text-gray-600">Important (little flexibility)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-400 rounded" />
              <span className="text-xs text-gray-600">Can wait a bit</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-emerald-400 rounded" />
              <span className="text-xs text-gray-600">Flexible timing</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="text-xs text-gray-500">
                <div><strong>ES</strong> = Early Start</div>
                <div><strong>EF</strong> = Early Finish</div>
                <div><strong>LS</strong> = Late Start</div>
                <div><strong>LF</strong> = Late Finish</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diagram Container */}
      <div
        ref={containerRef}
        className="overflow-auto border rounded-lg bg-gray-50"
        style={{ maxHeight: '70vh' }}
      >
        <svg
          width={svgDimensions.width * zoom}
          height={svgDimensions.height * zoom}
          className="min-w-full"
        >
          <g transform={`scale(${zoom})`}>
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
                    nodeWidth={nodeWidth}
                    nodeHeight={nodeHeight}
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
                  nodeWidth={nodeWidth}
                  nodeHeight={nodeHeight}
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

// Task Node Component (AON Box)
interface TaskNodeProps {
  task: Task;
  cpmData: CPMTaskData;
  position: NodePosition;
  onClick: () => void;
  simpleMode: boolean;
  nodeWidth: number;
  nodeHeight: number;
}

function TaskNode({ task, cpmData, position, onClick, simpleMode, nodeWidth, nodeHeight }: TaskNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { es, ef, ls, lf, float, isCritical } = cpmData;

  // Determine color based on criticality and float
  const getColorClass = () => {
    if (isCritical) return { bg: 'fill-rose-100', border: 'stroke-rose-500', indicator: 'fill-rose-500' };
    if (float <= 8) return { bg: 'fill-orange-100', border: 'stroke-orange-400', indicator: 'fill-orange-400' };
    if (float <= 40) return { bg: 'fill-yellow-100', border: 'stroke-yellow-500', indicator: 'fill-yellow-500' };
    return { bg: 'fill-emerald-100', border: 'stroke-emerald-400', indicator: 'fill-emerald-400' };
  };

  const colors = getColorClass();

  // Status indicator position
  const statusColors: Record<string, string> = {
    pending: 'fill-slate-400',
    in_progress: 'fill-purple-500',
    completed: 'fill-emerald-600',
    blocked: 'fill-amber-500',
  };

  // Simple mode: compact node with just name, duration, and color
  if (simpleMode) {
    const maxTitleLen = 14;
    return (
      <g
        className="cursor-pointer"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        transform={`translate(${position.x}, ${position.y})`}
      >
        {/* Hover highlight background */}
        {isHovered && (
          <rect
            x={-4}
            y={-4}
            width={nodeWidth + 8}
            height={nodeHeight + 8}
            rx={10}
            className="fill-blue-200 opacity-40"
          />
        )}
        {/* Main box */}
        <rect
          x={0}
          y={0}
          width={nodeWidth}
          height={nodeHeight}
          rx={8}
          className={`${colors.bg} ${colors.border}`}
          strokeWidth={isHovered ? (isCritical ? 4 : 3) : (isCritical ? 3 : 2)}
        />
        {/* Criticality indicator bar */}
        <rect
          x={0}
          y={0}
          width={6}
          height={nodeHeight}
          rx={3}
          className={colors.indicator}
        />
        {/* Task name */}
        <text
          x={nodeWidth / 2}
          y={24}
          textAnchor="middle"
          className="font-semibold fill-gray-900"
          style={{ fontSize: '12px' }}
        >
          {task.title.length > maxTitleLen ? task.title.substring(0, maxTitleLen - 2) + '...' : task.title}
        </text>
        {/* Duration */}
        <text
          x={nodeWidth / 2}
          y={42}
          textAnchor="middle"
          className="fill-gray-600"
          style={{ fontSize: '11px' }}
        >
          {formatHoursForDisplay(task.estimatedDuration)}
        </text>
        {/* Status indicator */}
        <circle
          cx={nodeWidth - 12}
          cy={12}
          r={5}
          className={statusColors[task.status]}
        />
        {/* Critical badge */}
        {isCritical && (
          <text
            x={nodeWidth / 2}
            y={56}
            textAnchor="middle"
            className="fill-rose-600 font-bold"
            style={{ fontSize: '8px' }}
          >
            MUST DO
          </text>
        )}
      </g>
    );
  }

  // Advanced mode: full AON box with ES/EF/LS/LF
  return (
    <g
      className="cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      transform={`translate(${position.x}, ${position.y})`}
    >
      {/* Hover highlight background */}
      {isHovered && (
        <rect
          x={-4}
          y={-4}
          width={nodeWidth + 8}
          height={nodeHeight + 8}
          rx={12}
          className="fill-blue-200 opacity-40"
        />
      )}
      {/* Main box */}
      <rect
        x={0}
        y={0}
        width={nodeWidth}
        height={nodeHeight}
        rx={8}
        className={`${colors.bg} ${colors.border}`}
        strokeWidth={isHovered ? (isCritical ? 4 : 3) : (isCritical ? 3 : 2)}
      />

      {/* Criticality indicator bar */}
      <rect
        x={0}
        y={0}
        width={6}
        height={nodeHeight}
        rx={3}
        className={colors.indicator}
      />

      {/* Task name */}
      <text
        x={nodeWidth / 2}
        y={24}
        textAnchor="middle"
        className="text-sm font-semibold fill-gray-900"
        style={{ fontSize: '12px' }}
      >
        {task.title.length > 18 ? task.title.substring(0, 16) + '...' : task.title}
      </text>

      {/* Duration */}
      <text
        x={nodeWidth / 2}
        y={40}
        textAnchor="middle"
        className="fill-gray-600"
        style={{ fontSize: '10px' }}
      >
        Duration: {formatHoursForDisplay(task.estimatedDuration)}
      </text>

      {/* Divider line */}
      <line
        x1={10}
        y1={50}
        x2={nodeWidth - 10}
        y2={50}
        className="stroke-gray-300"
        strokeWidth={1}
      />

      {/* ES / EF Row */}
      <g transform="translate(0, 58)">
        <text x={20} y={0} className="fill-gray-500" style={{ fontSize: '9px' }}>ES</text>
        <text x={20} y={12} className="fill-gray-800 font-medium" style={{ fontSize: '11px' }}>
          {formatHoursForDisplay(es)}
        </text>

        <text x={nodeWidth - 40} y={0} className="fill-gray-500" style={{ fontSize: '9px' }}>EF</text>
        <text x={nodeWidth - 40} y={12} className="fill-gray-800 font-medium" style={{ fontSize: '11px' }}>
          {formatHoursForDisplay(ef)}
        </text>
      </g>

      {/* LS / LF Row */}
      <g transform="translate(0, 82)">
        <text x={20} y={0} className="fill-gray-500" style={{ fontSize: '9px' }}>LS</text>
        <text x={20} y={12} className="fill-gray-800 font-medium" style={{ fontSize: '11px' }}>
          {formatHoursForDisplay(ls)}
        </text>

        <text x={nodeWidth - 40} y={0} className="fill-gray-500" style={{ fontSize: '9px' }}>LF</text>
        <text x={nodeWidth - 40} y={12} className="fill-gray-800 font-medium" style={{ fontSize: '11px' }}>
          {formatHoursForDisplay(lf)}
        </text>
      </g>

      {/* Float/Slack in center */}
      <g transform={`translate(${nodeWidth / 2 - 20}, 58)`}>
        <text x={20} y={0} textAnchor="middle" className="fill-gray-500" style={{ fontSize: '9px' }}>Float</text>
        <text
          x={20}
          y={14}
          textAnchor="middle"
          className={`font-bold ${isCritical ? 'fill-rose-600' : 'fill-gray-700'}`}
          style={{ fontSize: '12px' }}
        >
          {isCritical ? '0' : formatHoursForDisplay(float)}
        </text>
      </g>

      {/* Status indicator */}
      <circle
        cx={nodeWidth - 12}
        cy={12}
        r={5}
        className={statusColors[task.status]}
      />
    </g>
  );
}

// Dependency Arrow Component
interface DependencyArrowProps {
  from: NodePosition;
  to: NodePosition;
  isCritical?: boolean;
  nodeWidth: number;
  nodeHeight: number;
}

function DependencyArrow({ from, to, isCritical, nodeWidth, nodeHeight }: DependencyArrowProps) {
  // Calculate connection points
  const fromX = from.x + nodeWidth;
  const fromY = from.y + nodeHeight / 2;
  const toX = to.x;
  const toY = to.y + nodeHeight / 2;

  // Create a curved path
  const midX = (fromX + toX) / 2;

  // Determine vertical direction for backward arrows
  const verticalOffset = to.row > from.row ? 1 : -1;

  let path: string;
  if (to.column > from.column) {
    // Normal left-to-right flow
    path = `M ${fromX} ${fromY}
            C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
  } else {
    // Backward arrow (for potential loops or same-column dependencies)
    const curve = 40;
    path = `M ${fromX} ${fromY}
            C ${fromX + curve} ${fromY},
              ${fromX + curve} ${fromY + (verticalOffset * 60)},
              ${midX} ${fromY + (verticalOffset * 80)}
            S ${toX - curve} ${toY}, ${toX} ${toY}`;
  }

  return (
    <g>
      <defs>
        <marker
          id={`arrowhead-${isCritical ? 'critical' : 'normal'}`}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
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
        strokeWidth={isCritical ? 2.5 : 1.5}
        strokeDasharray={isCritical ? undefined : '4,2'}
        markerEnd={`url(#arrowhead-${isCritical ? 'critical' : 'normal'})`}
      />
    </g>
  );
}
