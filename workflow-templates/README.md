# Workflow Templates

This directory contains pre-built workflow templates that can be used to quickly set up common development workflows.

## Available Templates

### Feature Implementation (`feature-implementation.json`)
Complete workflow for implementing a new user-facing feature:
1. **Architect**: Define architecture and data needs
2. **Designer**: Design UI scaffolding and layout
3. **Developer**: Implement logic, state, and data flow
4. **Tester**: Test full flow for usability and bugs
5. **Developer**: Final code review and merge

### Bug Fix (`bug-fix.json`)
Systematic approach to fixing bugs:
1. **Tester**: Reproduce and document the bug
2. **Architect**: Analyze root cause and plan fix
3. **Developer**: Implement the bug fix
4. **Tester**: Verify fix and test edge cases

### Design Review (`design-review.json`)
Review and improve existing UI/UX:
1. **Designer**: Audit current design implementation
2. **Tester**: Test user experience and accessibility
3. **Designer**: Create improved design specifications
4. **Developer**: Implement design improvements

### Performance Optimization (`performance-optimization.json`)
Identify and fix performance bottlenecks:
1. **Tester**: Profile and identify performance issues
2. **Architect**: Analyze architecture for optimization opportunities
3. **Developer**: Implement performance optimizations
4. **Tester**: Verify performance improvements

## Using Templates

Templates can be used in two ways:

1. **Traditional**: Create individual tasks for each step with specific instructions
2. **Single Task**: Provide one overarching task description that applies to the entire workflow

### Example - Single Task Usage:
- Workflow: "Feature Implementation"
- Task: "Implement user profile editing feature with avatar upload"
- Result: Each agent receives the same task but performs their specific role

## Creating Custom Templates

To create a new workflow template:

1. Create a new `.json` file in this directory
2. Follow the structure:
```json
{
  "name": "Template Name",
  "description": "What this workflow accomplishes",
  "tasks": [
    {
      "description": "Step description",
      "agentId": "agent-identifier",
      "instructions": "Additional instructions for this step"
    }
  ]
}
```

3. Use agent IDs that match your agent templates:
   - `architect`
   - `designer`
   - `developer`
   - `tester`

## Best Practices

- Keep workflows focused on a single objective
- Order tasks logically based on dependencies
- Include CLAUDE.md updates in instructions
- Balance work across different agents
- Test workflows before sharing