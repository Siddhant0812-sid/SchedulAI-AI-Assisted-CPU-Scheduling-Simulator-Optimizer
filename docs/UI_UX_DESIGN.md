# SchedulAI — UI/UX Design Specification

## 1. Design Vision

SchedulAI should feel like a modern technical dashboard for exploring Operating Systems concepts.

The interface should prioritize clarity, accurate data presentation, interactive experimentation, and easy comparison between algorithms.

**Design direction:** Clean dark technical workspace with restrained accent colors, readable charts, and a clear visual hierarchy.

## 2. Primary User Journey

1. Open the Scheduler Workspace.
2. Add processes or load a preset.
3. Select scheduling algorithms and Round Robin quantum.
4. Choose an optimization objective.
5. Run the simulation.
6. Inspect Gantt charts and process metrics.
7. Compare algorithm performance.
8. Review the recommendation and its explanation.
9. Explore process states.
10. Export results to CSV.

## 3. Navigation

The application shall have four primary sections:

- **Workspace** — inputs and simulation controls.
- **Comparison** — Gantt charts, metrics, and performance analysis.
- **Process Explorer** — PCB-like details and state transitions.
- **AI Insights** — recommendation, explanation, and trade-offs.

The navigation should remain consistent across the application.

## 4. Workspace Screen

### Purpose

Allow users to define the workload and launch a simulation.

### Layout

Header:
- SchedulAI logo and title.
- Current workspace status.
- Reset or clear action.

Main area:
- Process input table.
- Algorithm selection.
- Round Robin configuration.
- Optimization objective.
- Preset selection.
- Run Simulation action.

### Process table columns

| Column | Purpose |
|---|---|
| PID | Unique process identifier |
| Arrival Time | Time at which the process becomes available |
| Burst Time | Total required CPU execution time |
| Priority | Scheduling priority |
| Actions | Edit or remove the process |

Provide controls for adding a process and loading a sample workload.

### Validation behavior

- Highlight the invalid field.
- Explain what is wrong.
- Preserve other valid inputs.
- Prevent invalid submissions.
- Do not rely only on color to communicate errors.

### Algorithm selection

Provide selectable options for:
- FCFS
- SJF
- SRTF
- Priority
- Preemptive Priority
- Round Robin

The interface should visually distinguish preemptive from non-preemptive variants.

Only show the time-quantum field when Round Robin is selected.

## 5. Comparison Screen

### Purpose

Help users understand how scheduling algorithms differ on the same workload.

### Top summary metrics

Display:
- Average waiting time.
- Average turnaround time.
- Average response time.
- Throughput, if enabled.

Each metric should include a short tooltip or help description.

### Gantt chart

Display execution segments horizontally along a time axis.

Requirements:
- Use consistent process colors across algorithms.
- Display process IDs inside sufficiently large segments.
- Show start and end times.
- Distinguish CPU idle intervals.
- Provide readable tooltips for narrow segments.
- Preserve actual preemption boundaries.
- Support horizontal scrolling for long schedules.

Do not rely on color alone to identify a process. Include labels and accessible tooltips.

### Algorithm comparison table

| Algorithm | Avg. WT | Avg. TAT | Avg. RT | Best for selected objective |
|---|---:|---:|---:|---|
| FCFS | Measured result | Measured result | Measured result | Derived from comparison |
| SJF | Measured result | Measured result | Measured result | Derived from comparison |
| SRTF | Measured result | Measured result | Measured result | Derived from comparison |
| Priority | Measured result | Measured result | Measured result | Derived from comparison |
| Preemptive Priority | Measured result | Measured result | Measured result | Derived from comparison |
| Round Robin | Measured result | Measured result | Measured result | Derived from comparison |

The table must show actual simulation results, not static example values.

The selected objective should be visible beside the comparison.

## 6. Process Explorer Screen

### Purpose

Explain what happens to individual processes during scheduling.

### Process detail panel

Display:
- PID.
- Arrival time.
- Burst time.
- Priority.
- Completion time.
- Turnaround time.
- Waiting time.
- Response time.

### State timeline

Show transitions between:
- New.
- Ready.
- Running.
- Terminated.

A transition back to Ready should be shown when a process is preempted.

Do not show Blocked unless I/O behavior is implemented.

### Interaction

Selecting a process should highlight its segments in the Gantt chart and show its metrics.

The state timeline must be derived from actual simulation events.

## 7. AI Insights Screen

### Purpose

Explain the recommended scheduling strategy and its trade-offs.

### Recommendation panel

Display:
- Recommended algorithm.
- Selected optimization objective.
- Measured objective value.
- Difference from the next-best alternative, where meaningful.
- Workload characteristics that influenced the candidate.
- A plain-language explanation.
- Relevant trade-offs.

### Example explanation format

“Your selected objective is minimizing average waiting time. SRTF achieved the lowest measured average waiting time for this workload. However, it may preempt running processes more often than non-preemptive SJF. The result applies to this simulation and does not guarantee that SRTF is best for every workload.”

This is an example of the explanation style, not a hardcoded result.

### Honesty about AI

The first release uses transparent rules and actual simulation results. Label the feature as a simulation-backed recommendation or optimizer unless a trained and evaluated ML model has been integrated.

## 8. Visual Design System

### Color direction

Use a dark neutral background with subtle panel contrast and a small number of accent colors.

Suggested semantic roles:
- Background: deep charcoal or navy.
- Panels: slightly lighter neutral surface.
- Primary action: blue or cyan.
- Success or verified result: green, used sparingly.
- Warning: amber.
- Error: red.
- Main text: high-contrast near-white.
- Secondary text: muted gray.

Assign process colors from a consistent palette and maintain sufficient contrast.

### Typography

Use a modern sans-serif typeface for interface text.

Use a monospaced typeface for:
- Process IDs when appropriate.
- Timeline values.
- Technical data.
- Debug or execution details.

Use clear headings and compact metric labels.

### Components

Create reusable components for:
- Process input table.
- Algorithm selector.
- Time-quantum control.
- Metric cards.
- Gantt chart.
- Algorithm comparison table.
- Recommendation panel.
- Process detail panel.
- State timeline.
- Toasts and error messages.
- CSV export action.

## 9. Interaction States

Every major section shall account for:

### Empty state
Explain how to add processes or load a preset.

### Loading state
Show that the simulation is running and temporarily disable duplicate submissions.

### Success state
Display the calculated results and charts.

### Validation error
Identify the invalid field and explain how to correct it.

### Backend error
Show a user-friendly message and allow retrying.

### Long timeline
Allow scrolling without compressing all segments until they become unreadable.

### No comparison result
Explain that the user must select at least one valid algorithm and run a simulation.

## 10. Accessibility and Responsiveness

- Support keyboard navigation.
- Use labels for all form controls.
- Provide visible focus indicators.
- Use text in addition to color to communicate status.
- Ensure readable contrast.
- Use responsive layouts for smaller screens.
- Allow horizontal scrolling for wide data tables and Gantt charts.
- Provide tooltips or alternative textual summaries for chart information.

## 11. Frontend Data Handling

The frontend shall use typed request and response structures that match the FastAPI API contracts.

It should:
- Validate basic form inputs before submission.
- Treat backend results as the source of truth.
- Keep workload inputs when a request fails.
- Display backend validation messages.
- Avoid embedding fake metrics into the production result views.
- Use mock data only for initial layout development or explicit demo mode.

## 12. UI Acceptance Criteria

- A user can add, edit, and remove processes.
- A user can load presets and configure algorithms.
- Invalid input produces clear feedback.
- Simulation results render without hardcoded values.
- Gantt charts show accurate execution intervals.
- The comparison table uses actual measured metrics.
- Selecting a process reveals its details.
- The recommendation includes the objective and explanation.
- CSV export is discoverable.
- The interface remains usable at common desktop and smaller screen sizes.
