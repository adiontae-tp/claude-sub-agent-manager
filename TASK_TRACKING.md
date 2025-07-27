# Task Tracking Guide for Agents

This guide explains how agents should track and update their task progress.

## Task Structure

Each agent has a task file located at: `.claude/tasks/{agent-name}-tasks.json`

**Important**: Tasks only appear in the Task Queue UI after the task file is created. Tasks in the agent markdown files are not shown until they're properly tracked.

Example task structure:
```json
[
  {
    "description": "Implement user authentication",
    "status": "in-progress",
    "queued": true,
    "progress": 45,
    "subtasks": [
      {
        "description": "Create login form",
        "completed": true
      },
      {
        "description": "Implement JWT tokens",
        "completed": false
      }
    ]
  }
]
```

## Task States

- `pending`: Task not started yet
- `in-progress`: Currently working on this task
- `completed`: Task is finished
- `blocked`: Task cannot proceed due to dependencies or issues

## API Endpoints

### Get Your Tasks
```bash
# Get all tasks assigned to you
curl http://localhost:3001/api/get-agent-tasks/{project-dir}/{agent-name}
```

This will return your tasks or create the task file if it doesn't exist yet.

### Update Task Progress

```bash
# Update task progress
curl -X POST http://localhost:3001/api/update-task-progress/{project-dir}/{agent-name}/{task-index} \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in-progress",
    "progress": 75,
    "subtasks": [
      {"description": "Setup database", "completed": true},
      {"description": "Create API endpoints", "completed": true},
      {"description": "Write tests", "completed": false}
    ]
  }'
```

**Note**: If the task file doesn't exist, this endpoint will create it from your agent markdown file.

## Workflow

1. **When receiving tasks from Claude**: First mark them as queued
   ```bash
   curl -X POST http://localhost:3001/api/update-task-progress/./agent-name/0 \
     -d '{"queued": true}'
   ```

2. **When starting work**: Update status to "in-progress"
   ```bash
   curl -X POST http://localhost:3001/api/update-task-progress/./agent-name/0 \
     -d '{"status": "in-progress", "progress": 0}'
   ```

3. **During work**: Update progress and subtasks
4. **When complete**: Set status to "completed" and progress to 100

## Best Practices

1. **Mark tasks as queued first**: This shows them in the Active Task Queue
2. **Update status when starting**: Set status to "in-progress"
3. **Track progress**: Update the progress percentage (0-100) as you work
4. **Break down into subtasks**: Create subtasks for complex work
5. **Mark completion**: Set status to "completed" and progress to 100 when done
6. **Report blockers**: Set status to "blocked" if you can't proceed

## Example Workflow

```bash
# 1. Start working on task 0
curl -X POST http://localhost:3001/api/update-task-progress/./ui-designer/0 \
  -d '{"status": "in-progress", "progress": 0}'

# 2. Update progress and add subtasks
curl -X POST http://localhost:3001/api/update-task-progress/./ui-designer/0 \
  -d '{
    "progress": 30,
    "subtasks": [
      {"description": "Design mockups", "completed": true},
      {"description": "Implement components", "completed": false}
    ]
  }'

# 3. Complete the task
curl -X POST http://localhost:3001/api/update-task-progress/./ui-designer/0 \
  -d '{"status": "completed", "progress": 100}'
```

## Direct File Updates

Alternatively, agents can directly read and update their task JSON file:

```bash
# Read current tasks
cat .claude/tasks/ui-designer-tasks.json

# Update tasks (be careful to maintain valid JSON)
echo '[{"description": "Create login page", "status": "completed", "progress": 100, "queued": true, "subtasks": []}]' > .claude/tasks/ui-designer-tasks.json
```

## Integration with Claude Sub-Agent Manager

The Task Order view in the web interface automatically reads these task files and displays:
- Task status with color coding
- Progress bars
- Subtask completion
- Separate columns for queued and unqueued tasks

This ensures real-time visibility of agent work progress.