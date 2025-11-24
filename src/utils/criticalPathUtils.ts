import { Task } from '../types';

export interface CPMTaskData {
  taskId: string;
  duration: number; // in hours
  es: number; // Early Start (hours from project start)
  ef: number; // Early Finish (hours from project start)
  ls: number; // Late Start (hours from project start)
  lf: number; // Late Finish (hours from project start)
  float: number; // Total float/slack (LS - ES or LF - EF)
  isCritical: boolean; // True if float === 0
}

export interface CPMResult {
  taskData: Map<string, CPMTaskData>;
  criticalPath: string[]; // Array of task IDs in order
  projectDuration: number; // Total project duration in hours
  projectStartDate: Date; // Earliest start date of all tasks
  totalManHours: number; // Sum of all task durations
}

// Build adjacency list for tasks based on dependencies
function buildDependencyGraph(tasks: Task[]): {
  predecessors: Map<string, string[]>;
  successors: Map<string, string[]>;
} {
  const predecessors = new Map<string, string[]>();
  const successors = new Map<string, string[]>();

  // Initialize all tasks
  tasks.forEach(task => {
    predecessors.set(task.id, []);
    successors.set(task.id, []);
  });

  // Build relationships
  tasks.forEach(task => {
    task.dependencies.forEach(depId => {
      // depId is a predecessor of task.id
      const preds = predecessors.get(task.id) || [];
      preds.push(depId);
      predecessors.set(task.id, preds);

      // task.id is a successor of depId
      const succs = successors.get(depId) || [];
      succs.push(task.id);
      successors.set(depId, succs);
    });
  });

  return { predecessors, successors };
}

// Topological sort using Kahn's algorithm
function topologicalSort(tasks: Task[], predecessors: Map<string, string[]>): string[] {
  const inDegree = new Map<string, number>();
  const result: string[] = [];
  const queue: string[] = [];

  // Calculate in-degrees
  tasks.forEach(task => {
    const preds = predecessors.get(task.id) || [];
    // Only count predecessors that exist in the task list
    const validPreds = preds.filter(predId => tasks.some(t => t.id === predId));
    inDegree.set(task.id, validPreds.length);
  });

  // Find all tasks with no dependencies (in-degree 0)
  tasks.forEach(task => {
    if (inDegree.get(task.id) === 0) {
      queue.push(task.id);
    }
  });

  while (queue.length > 0) {
    const taskId = queue.shift()!;
    result.push(taskId);

    // Find all tasks that depend on this one
    tasks.forEach(task => {
      if (task.dependencies.includes(taskId)) {
        const newDegree = (inDegree.get(task.id) || 0) - 1;
        inDegree.set(task.id, newDegree);
        if (newDegree === 0) {
          queue.push(task.id);
        }
      }
    });
  }

  return result;
}

// Helper to calculate hours between two dates
function getHoursDifference(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

// Forward pass: Calculate ES and EF for all tasks
function forwardPass(
  tasks: Task[],
  sortedIds: string[],
  predecessors: Map<string, string[]>,
  projectStartDate: Date
): Map<string, { es: number; ef: number }> {
  const results = new Map<string, { es: number; ef: number }>();
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  sortedIds.forEach(taskId => {
    const task = taskMap.get(taskId);
    if (!task) return;

    const preds = predecessors.get(taskId) || [];
    // Only consider predecessors that exist in our task list
    const validPreds = preds.filter(predId => results.has(predId));

    let es = 0;
    if (validPreds.length > 0) {
      // ES = max(EF of all predecessors)
      es = Math.max(...validPreds.map(predId => results.get(predId)!.ef));
    }

    // Enforce Start Date Constraint
    // ES cannot be earlier than the task's scheduled start date relative to project start
    const startOffset = getHoursDifference(projectStartDate, new Date(task.startDate));
    if (startOffset > es) {
      es = startOffset;
    }

    const ef = es + task.estimatedDuration;
    results.set(taskId, { es, ef });
  });

  return results;
}

// Backward pass: Calculate LS and LF for all tasks
function backwardPass(
  tasks: Task[],
  sortedIds: string[],
  successors: Map<string, string[]>,
  projectDuration: number
): Map<string, { ls: number; lf: number }> {
  const results = new Map<string, { ls: number; lf: number }>();
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  // Process in reverse topological order
  const reversedIds = [...sortedIds].reverse();

  reversedIds.forEach(taskId => {
    const task = taskMap.get(taskId);
    if (!task) return;

    const succs = successors.get(taskId) || [];
    // Only consider successors that exist in our results
    const validSuccs = succs.filter(succId => results.has(succId));

    let lf: number;
    if (validSuccs.length === 0) {
      // No successors - LF = project duration
      lf = projectDuration;
    } else {
      // LF = min(LS of all successors)
      lf = Math.min(...validSuccs.map(succId => results.get(succId)!.ls));
    }

    const ls = lf - task.estimatedDuration;
    results.set(taskId, { ls, lf });
  });

  return results;
}

// Main CPM calculation function
export function calculateCriticalPath(tasks: Task[]): CPMResult {
  if (tasks.length === 0) {
    return {
      taskData: new Map(),
      criticalPath: [],
      projectDuration: 0,
      projectStartDate: new Date(),
      totalManHours: 0,
    };
  }

  // Determine Project Start Date (earliest start date of all tasks)
  // We use this as the anchor (t=0)
  const projectStartDate = tasks.reduce((min, task) => {
    const start = new Date(task.startDate);
    return start < min ? start : min;
  }, new Date(tasks[0].startDate));

  const { predecessors, successors } = buildDependencyGraph(tasks);
  const sortedIds = topologicalSort(tasks, predecessors);

  // Handle case where topological sort fails (cycles)
  if (sortedIds.length !== tasks.length) {
    console.warn('Dependency cycle detected, some tasks excluded from CPM calculation');
  }

  // 1. Logical Forward Pass (Infinite Resources)
  // We need this to calculate logical float and criticality
  const logicalForward = forwardPass(tasks, sortedIds, predecessors, projectStartDate);

  // Calculate logical project duration
  let logicalDuration = 0;
  logicalForward.forEach(({ ef }) => {
    if (ef > logicalDuration) {
      logicalDuration = ef;
    }
  });

  // 2. Logical Backward Pass
  const logicalBackward = backwardPass(tasks, sortedIds, successors, logicalDuration);

  // 3. Serial Scheduling (Resource Constrained - 1 Person)
  // We use the Logical Late Start (LS) as the priority rule (Minimum Slack)
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const scheduledTasks = new Map<string, { es: number; ef: number }>();

  // Track unscheduled tasks and their current unsatisfied dependency count
  const currentInDegree = new Map<string, number>();
  tasks.forEach(task => {
    const preds = predecessors.get(task.id) || [];
    currentInDegree.set(task.id, preds.length);
  });

  // Ready queue contains tasks with all predecessors scheduled
  let readyQueue: string[] = [];
  tasks.forEach(task => {
    if ((currentInDegree.get(task.id) || 0) === 0) {
      readyQueue.push(task.id);
    }
  });

  let currentTime = 0;
  const totalTasks = tasks.length;
  let scheduledCount = 0;

  while (scheduledCount < totalTasks && readyQueue.length > 0) {
    // Sort ready queue by Logical LS (ascending) -> "Minimum Slack" rule
    // If tie, use Logical Duration (descending) -> "Longest Processing Time"
    readyQueue.sort((a, b) => {
      const lsA = logicalBackward.get(a)?.ls || 0;
      const lsB = logicalBackward.get(b)?.ls || 0;
      if (Math.abs(lsA - lsB) > 0.001) return lsA - lsB;

      const durA = taskMap.get(a)?.estimatedDuration || 0;
      const durB = taskMap.get(b)?.estimatedDuration || 0;
      return durB - durA;
    });

    // Pick the highest priority task
    const nextTaskId = readyQueue.shift()!;
    const nextTask = taskMap.get(nextTaskId)!;

    // Determine Earliest Possible Start based on:
    // 1. Resource availability (currentTime)
    // 2. Task Start Date constraint
    const startOffset = getHoursDifference(projectStartDate, new Date(nextTask.startDate));
    const es = Math.max(currentTime, startOffset);

    const ef = es + nextTask.estimatedDuration;
    scheduledTasks.set(nextTaskId, { es, ef });

    // Resource becomes free after this task finishes
    currentTime = ef;
    scheduledCount++;

    // Update successors
    const succs = successors.get(nextTaskId) || [];
    succs.forEach(succId => {
      const newDegree = (currentInDegree.get(succId) || 0) - 1;
      currentInDegree.set(succId, newDegree);
      if (newDegree === 0) {
        readyQueue.push(succId);
      }
    });
  }

  // 4. Combine Results
  // We use the Serial Schedule for positions (ES/EF)
  // We use the Logical CPM for metadata (Float, Criticality) to show "structural" importance
  const taskData = new Map<string, CPMTaskData>();

  sortedIds.forEach(taskId => {
    const task = taskMap.get(taskId);
    if (!task) return;

    const logicalFwd = logicalForward.get(taskId);
    const logicalBwd = logicalBackward.get(taskId);
    const serial = scheduledTasks.get(taskId);

    if (logicalFwd && logicalBwd && serial) {
      const logicalFloat = logicalBwd.ls - logicalFwd.es;

      taskData.set(taskId, {
        taskId,
        duration: task.estimatedDuration,
        // Use Serial times for the diagram layout
        es: serial.es,
        ef: serial.ef,
        // For LS/LF in serial mode, they are effectively same as ES/EF because there's no gaps
        ls: serial.es,
        lf: serial.ef,
        // Keep logical float to show flexibility relative to dependencies
        float: logicalFloat,
        isCritical: Math.abs(logicalFloat) < 0.001,
      });
    }
  });

  // Build critical path (Logical)
  const criticalPath = buildCriticalPath(tasks, taskData, predecessors);

  // Calculate Total Man Hours (Sum of all task durations)
  const totalManHours = tasks.reduce((sum, task) => sum + task.estimatedDuration, 0);

  return {
    taskData,
    criticalPath,
    projectDuration: currentTime, // Total duration is now the sum of sequential tasks
    projectStartDate,
    totalManHours,
  };
}

// Build the critical path by tracing from start to end
function buildCriticalPath(
  tasks: Task[],
  taskData: Map<string, CPMTaskData>,
  predecessors: Map<string, string[]>
): string[] {
  // Find all critical tasks
  const criticalTasks = tasks.filter(t => {
    const data = taskData.get(t.id);
    return data?.isCritical;
  });

  if (criticalTasks.length === 0) return [];

  // Find starting critical tasks (no critical predecessors)
  const startingTasks = criticalTasks.filter(task => {
    const preds = predecessors.get(task.id) || [];
    return !preds.some(predId => taskData.get(predId)?.isCritical);
  });

  // Build path from each starting task
  const path: string[] = [];
  const visited = new Set<string>();

  function traverse(taskId: string) {
    if (visited.has(taskId)) return;

    const data = taskData.get(taskId);
    if (!data?.isCritical) return;

    visited.add(taskId);
    path.push(taskId);

    // Find critical successors
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const criticalSuccessors = tasks
        .filter(t => t.dependencies.includes(taskId) && taskData.get(t.id)?.isCritical)
        .sort((a, b) => (taskData.get(a.id)?.es || 0) - (taskData.get(b.id)?.es || 0));

      criticalSuccessors.forEach(succ => traverse(succ.id));
    }
  }

  // Sort starting tasks by ES and traverse
  startingTasks
    .sort((a, b) => (taskData.get(a.id)?.es || 0) - (taskData.get(b.id)?.es || 0))
    .forEach(task => traverse(task.id));

  return path;
}

// Convert hours to display format for the diagram
export function formatHoursForDisplay(hours: number, workingHoursPerDay = 8): string {
  if (hours < workingHoursPerDay) {
    return `${hours.toFixed(1)}h`;
  }
  const days = hours / workingHoursPerDay;
  if (days < 5) {
    return `${days.toFixed(1)}d`;
  }
  const weeks = days / 5;
  return `${weeks.toFixed(1)}w`;
}

// Get color class based on float value
export function getFloatColorClass(float: number, isCritical: boolean): string {
  if (isCritical) return 'bg-red-500';
  if (float <= 8) return 'bg-orange-400'; // Less than 1 day slack
  if (float <= 40) return 'bg-yellow-400'; // Less than 1 week slack
  return 'bg-green-400'; // More than 1 week slack
}
