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

// Forward pass: Calculate ES and EF for all tasks
function forwardPass(
  tasks: Task[],
  sortedIds: string[],
  predecessors: Map<string, string[]>
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
    };
  }

  const { predecessors, successors } = buildDependencyGraph(tasks);
  const sortedIds = topologicalSort(tasks, predecessors);

  // Handle case where topological sort fails (cycles)
  if (sortedIds.length !== tasks.length) {
    console.warn('Dependency cycle detected, some tasks excluded from CPM calculation');
  }

  // Forward pass
  const forwardResults = forwardPass(tasks, sortedIds, predecessors);

  // Calculate project duration (max EF of all tasks)
  let projectDuration = 0;
  forwardResults.forEach(({ ef }) => {
    if (ef > projectDuration) {
      projectDuration = ef;
    }
  });

  // Backward pass
  const backwardResults = backwardPass(tasks, sortedIds, successors, projectDuration);

  // Combine results and identify critical path
  const taskData = new Map<string, CPMTaskData>();
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  sortedIds.forEach(taskId => {
    const task = taskMap.get(taskId);
    if (!task) return;

    const forward = forwardResults.get(taskId);
    const backward = backwardResults.get(taskId);

    if (forward && backward) {
      const float = backward.ls - forward.es;
      taskData.set(taskId, {
        taskId,
        duration: task.estimatedDuration,
        es: forward.es,
        ef: forward.ef,
        ls: backward.ls,
        lf: backward.lf,
        float,
        isCritical: Math.abs(float) < 0.001, // Account for floating point
      });
    }
  });

  // Build critical path by following tasks with zero float
  const criticalPath = buildCriticalPath(tasks, taskData, predecessors);

  return {
    taskData,
    criticalPath,
    projectDuration,
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
