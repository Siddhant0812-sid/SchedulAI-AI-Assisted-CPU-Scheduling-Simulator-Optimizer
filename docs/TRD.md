# SchedulAI — Technical Requirements Document (TRD)

## 1. Purpose

This document defines the implementation technologies, backend behavior, API contracts, data structures, validation rules, testing approach, and technical constraints for SchedulAI.

The existing C++ scheduling implementation is the starting point for the project. The first development task is to inspect, test, and refactor that code before connecting it to the frontend.

## 2. Technology Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Scheduling engine | C++17 | Execute scheduling algorithms and calculate results |
| Backend API | Python, FastAPI | Validation, orchestration, recommendations, CSV export |
| Frontend | React, Vite, TypeScript | User interface and interactions |
| Visualization | Recharts or custom React SVG | Metric charts and Gantt timelines |
| Engine integration | JSON over subprocess | Communicate with the C++ executable |
| C++ JSON library | nlohmann/json | Parse requests and serialize results |
| Backend testing | pytest | API, validation, and recommendation tests |
| Frontend testing | Vitest and React Testing Library | Component and interaction tests |
| C++ testing | Lightweight test harness or a C++ test framework | Algorithm correctness |
| Version control | Git and GitHub | Source control and collaboration |

The initial version shall not require a database.

## 3. Existing Backend Integration

The current C++ source includes a `Process` structure, a `Segment` structure, a `SchedulingResult` structure, and implementations for FCFS, SJF, non-preemptive Priority, SRTF, and Round Robin.

### Existing functions to preserve and adapt

- `printGanttChart(...)`
- `fcfs(...)`
- `sjf(...)`
- `priorityScheduling(...)`
- `srtf(...)`
- `roundRobin(...)`
- `compareAlgorithms(...)`

The exact function signatures may be adjusted after inspecting the source.

### Required modifications

1. Separate calculation logic from terminal printing.
2. Return structured per-process metrics and timeline segments.
3. Add preemptive Priority Scheduling.
4. Standardize tie-breaking and priority semantics.
5. Preserve correct CPU idle intervals.
6. Preserve first-response-time tracking during preemption.
7. Return consistent output for every algorithm.
8. Validate inputs before simulation.
9. Add deterministic automated tests.
10. Provide JSON input/output for API integration.

Do not replace the existing code wholesale before checking its correctness and identifying the smallest necessary changes.

### Suggested result structures

```cpp
struct Process {
    int id;
    int arrivalTime;
    int burstTime;
    int priority;
};

struct ProcessMetrics {
    int processId;
    int completionTime;
    int turnaroundTime;
    int waitingTime;
    int responseTime;
};

struct Segment {
    int processId;  // Use a reserved value or an explicit type for idle.
    int startTime;
    int endTime;
};

struct SchedulingResult {
    string algorithmName;
    vector<ProcessMetrics> processMetrics;
    vector<Segment> timeline;
    double averageWaitingTime;
    double averageTurnaroundTime;
    double averageResponseTime;
};
```

These are proposed target structures, not a claim that the current source already uses them. The final structure should be agreed upon during refactoring. An explicit segment type or nullable process ID is preferable to ambiguous process-name strings.

Use a suitable integer type for simulation time and protect against overflow.

## 4. Scheduling Semantics

### FCFS
Execute available processes in arrival order. Use a deterministic tie-breaker, such as process ID, for simultaneous arrivals.

### Non-preemptive SJF
When the CPU becomes available, select the arrived process with the smallest burst time. Once started, the process runs until completion.

### SRTF
At each scheduling decision, select the arrived process with the smallest remaining execution time. Preserve response time from the first CPU start.

### Non-preemptive Priority
Select the arrived process with the smallest numeric priority. Once started, it runs until completion.

### Preemptive Priority
Select the highest-priority available process. A newly arrived process with a higher priority may preempt the running process. Lower numeric values represent higher priority.

### Round Robin
Use a ready queue and a configurable positive time quantum. Newly arrived processes must enter the queue in a consistently defined order. Define and test the ordering of arrivals that occur at a time-slice boundary.

## 5. Metric Calculation

For every process:

- Completion time: time when the process finishes.
- Turnaround time: completion time minus arrival time.
- Waiting time: turnaround time minus burst time for the CPU-only model.
- Response time: first execution time minus arrival time.

For a workload of n processes:

- Average WT = sum of all waiting times / n.
- Average TAT = sum of all turnaround times / n.
- Average RT = sum of all response times / n.

Use full precision internally and round only for display.

If throughput is displayed, define the elapsed interval explicitly. For a simulation starting at time zero, throughput may be calculated as n divided by the time of the final completion, provided that the denominator is positive.

## 6. Backend Architecture

The FastAPI backend shall be divided into:

- `main.py`: create the FastAPI application.
- `routes/`: API endpoints.
- `schemas/`: request and response validation models.
- `services/`: invoke the C++ engine and transform results.
- `recommendations/`: recommendation logic and objective comparison.
- `tests/`: API and service tests.

The C++ executable shall be compiled once during development or deployment. FastAPI shall invoke the compiled executable with a controlled subprocess interface, send JSON input, and parse JSON output.

Use argument lists rather than shell command strings. Apply execution timeouts, input-size limits, and clear error handling.

## 7. API Contracts

### POST `/api/simulate`

Request:

```json
{
  "processes": [
    {"id": 1, "arrival_time": 0, "burst_time": 6, "priority": 2},
    {"id": 2, "arrival_time": 1, "burst_time": 4, "priority": 1},
    {"id": 3, "arrival_time": 2, "burst_time": 8, "priority": 3}
  ],
  "algorithms": ["FCFS", "SJF", "SRTF", "PRIORITY", "PREEMPTIVE_PRIORITY", "RR"],
  "time_quantum": 2
}
```

Response should include:
- Algorithm identifier and display name.
- Per-process metrics.
- Average metrics.
- Gantt timeline segments.
- Optional throughput and context-switch statistics when implemented.

### POST `/api/recommend`

Request should contain the workload, selected objective, and any relevant scheduling configuration.

Supported objectives may include:
- Minimize average waiting time.
- Minimize average turnaround time.
- Minimize average response time.

The response should include:
- Recommended algorithm.
- Selected objective.
- Recommendation explanation.
- Measured results for the recommended algorithm.
- Comparison with alternatives.
- Relevant trade-offs.

If multiple algorithms tie, report the tie or apply a documented deterministic tie-breaker.

### GET `/api/presets`

Return predefined workloads with labels and descriptions.

### POST `/api/export/csv`

Export process metrics and algorithm comparison results. Validate the requested export data and return a CSV response.

### GET `/api/health`

Return a lightweight health status. If appropriate, expose engine availability separately from general API health.

## 8. Recommendation Logic

The initial implementation shall use transparent rules and simulation-backed comparison.

Suggested workflow:
1. Analyze workload characteristics.
2. Produce an initial candidate and explanation.
3. Simulate the supported algorithms on the same workload.
4. Select the best measured result for the chosen objective.
5. Explain the trade-offs and whether the initial candidate matched the measured winner.

For example, Round Robin may be discussed for responsiveness in interactive workloads, while SRTF may be considered when minimizing waiting time is the objective. These are tendencies, not guarantees.

If the application selects the minimum measured waiting time after running all algorithms, describe it as a **simulation-backed optimizer**, not a trained AI model.

A future trained model must have a documented training dataset, features, held-out evaluation, and performance comparison against simple baselines.

## 9. Validation and Error Handling

Validate:
- At least one process is present.
- Process IDs are unique.
- Arrival times are non-negative.
- Burst times and priorities are positive.
- Round Robin quantum is positive.
- Algorithm identifiers are supported.
- Workload size and time values remain within configured limits.

Handle:
- Invalid JSON.
- Invalid user inputs.
- C++ execution failure.
- Engine timeout.
- Malformed engine output.
- CSV generation failure.

Return clear client errors for invalid input and generic server errors for unexpected internal failures. Keep debugging details in server logs, not in public API responses.

## 10. Testing Strategy

### C++ engine tests
- Each algorithm with one process.
- Processes arriving simultaneously.
- CPU idle before the first arrival.
- Idle gaps between processes.
- Preemption by shorter jobs.
- Preemption by higher-priority jobs.
- Round Robin with multiple arrivals.
- Equal burst times and equal priorities.
- Correct completion, turnaround, waiting, and response times.

### Backend tests
- Valid and invalid request schemas.
- Engine invocation and timeout.
- JSON parsing.
- Recommendation objective correctness.
- CSV content and headers.

### Frontend tests
- Adding and editing processes.
- Form validation.
- Rendering results.
- Selecting an optimization objective.
- Handling loading and error states.
- Export interactions.

### Integration tests
Verify that frontend inputs flow through FastAPI into the C++ engine and that the resulting timeline and metrics are rendered correctly.

## 11. Performance and Safety

- Limit the maximum number of processes and maximum simulation time.
- Prefer event-driven simulation for long workloads where practical.
- Avoid spawning uncontrolled numbers of engine processes.
- Do not recompile the engine for each request.
- Keep the C++ engine stateless between requests.
- Do not use a database in the initial version.

## 12. Build and Run Strategy

The C++ engine must compile and pass tests independently before backend integration.

The backend must run and return valid JSON before frontend development depends on it.

The frontend must be tested against real API responses rather than permanently relying on mock data.

Exact build commands and platform-specific compiler requirements shall be documented in the README after the project environment is confirmed.

## 13. Technical Definition of Done

- Existing backend reviewed and refactored.
- Six algorithms implemented and tested.
- Structured engine output verified.
- API endpoints implemented.
- Frontend integration complete.
- Metrics and Gantt charts verified.
- Recommendation explanation consistent with measured results.
- CSV export verified.
- Setup and testing instructions documented.
