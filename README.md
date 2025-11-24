# DayFlow - Visualize Your Day

A personal task scheduler that helps you visualize and plan your day with an intuitive timeline view.

## Features

- **Priority Flow View** - See what matters most and identify must-do items at a glance
- **Timeline View** - Visualize your activities on an interactive timeline
- **List View** - Traditional task list with progress tracking
- **Time Tracking** - Track time spent on each activity
- **Insights Dashboard** - See your planning accuracy and daily progress

## Getting Started

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
npm run build
```

## How to Use

1. **Add a Task** - Click the "Add Task" button to create your first activity
2. **Set Priority** - Mark items as Low, Medium, or High priority
3. **Add Dependencies** - Link tasks that depend on each other
4. **Track Progress** - Use the time tracker to log actual time spent
5. **Switch Views** - Toggle between Priority Flow, Timeline, and List views

## Task Statuses

| Status | Description |
|--------|-------------|
| To Do | Not started yet |
| Doing | Currently working on |
| Done | Completed |
| On Hold | Paused or blocked |

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Lucide Icons
- date-fns
