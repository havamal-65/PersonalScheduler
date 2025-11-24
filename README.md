# Personal Scheduler with Critical Path Analysis

A React-based task management application that helps you visualize your project timeline, identify critical paths, and manage dependencies effectively.

## Features

### 📊 Critical Path Visualization
-   **Interactive Diagram**: Visualize tasks as nodes in a dependency graph.
-   **Critical Path Highlighting**: Automatically identifies and highlights the sequence of tasks that determine the project's minimum duration (Red path).
-   **Lane-Based Layout**: Organizes tasks into lanes, with the Critical Path always in the top lane for easy focus.

### 🕒 Dynamic Timeline
-   **Time-Scaled**: Tasks are positioned horizontally based on their start and end times.
-   **Zoomable Interface**: Seamlessly zoom in for hourly details or zoom out to see weeks/months of the project.
-   **Smart Ticks**: Timeline ticks automatically adjust to show Hours, Days, or Weeks based on the zoom level.

### 📅 Advanced Scheduling
-   **Auto-Scheduling**: Tasks automatically find their start dates based on dependencies.
-   **Scheduling Modes**:
    -   **Start ASAP**: Schedules immediately after dependencies (or today).
    -   **After Last Task**: Appends the task to the end of the project.
    -   **Link to Previous**: Appends AND creates a dependency on the last task.
-   **Resource Leveling**: Basic serial scheduling logic ensures tasks don't overlap if resources are constrained (configurable).

### 📈 Project Metrics
-   **Total Effort (Man Hours)**: Tracks the total sum of work hours required.
-   **Project Span**: Tracks the actual calendar duration from start to finish.
-   **Float/Slack Calculation**: Visualizes how much flexibility each task has before it delays the project.

## Tech Stack
-   **Frontend**: React, TypeScript, Vite
-   **Styling**: Tailwind CSS
-   **Icons**: Lucide React
-   **State Management**: React Hooks

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Build for Production**:
    ```bash
    npm run build
    ```
