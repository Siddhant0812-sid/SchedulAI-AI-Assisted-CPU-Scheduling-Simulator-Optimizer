# SchedulAI — Product Requirements Document (PRD)

**Project Name:** SchedulAI  
**Project Type:** AI-Integrated Operating Systems Mini-Project  
**Target Users:** Operating Systems students, educators, and learners  
**Primary Platform:** Web application  
**Project Duration:** 1–2 weeks for the initial version  
**Implementation Approach:** C++ scheduling engine, Python backend, React frontend

## 1. Product Overview

SchedulAI is an interactive CPU scheduling simulator that allows users to create process workloads, execute multiple CPU scheduling algorithms, compare their performance, and understand which algorithm is suitable for a given workload.

The application combines conventional Operating Systems scheduling concepts with explainable, simulation-backed recommendations.

Users can enter process arrival times, burst times, and priorities. SchedulAI then calculates scheduling metrics, displays execution timelines, and explains the advantages and disadvantages of the tested algorithms.

The existing C++ scheduling implementation will serve as the starting point for the scheduling engine. It will be modified to support structured results, additional algorithms, automated testing, and integration with the web application.

## 2. Problem Statement

CPU scheduling algorithms behave differently depending on workload characteristics. An algorithm that performs well for one workload may perform poorly for another.

Manually calculating completion time, turnaround time, waiting time, response time, and execution order is time-consuming and makes comparisons difficult.

Students also need a clear way to visualize scheduling decisions and understand the trade-offs between algorithms.

SchedulAI addresses these problems through automated simulation, visual comparisons, and transparent algorithm recommendations.

## 3. Product Goals

- Implement and compare six CPU scheduling variants.
- Accept process-level workload inputs.
- Calculate accurate scheduling metrics.
- Visualize CPU execution using Gantt charts.
- Provide a transparent recommendation based on workload characteristics and measured results.
- Visualize simplified PCB information and process-state transitions.
- Export results to CSV.
- Provide automated tests for scheduling correctness.
- Demonstrate practical Operating Systems concepts through an interactive application.

## 4. Target Users

### Primary users
- Operating Systems students learning CPU scheduling.
- Students preparing for practical examinations and viva examinations.
- Educators demonstrating scheduling algorithms.

### Secondary users
- Developers exploring scheduling behavior and performance metrics.

## 5. Functional Requirements

### FR-01: Process Input

Users shall be able to add, edit, and remove processes.

Each process shall include:
- Process ID
- Arrival time
- Burst time
- Priority

Validation rules:
- Arrival time must be zero or greater.
- Burst time must be greater than zero.
- Priority must be a positive integer.
- Process IDs must be unique.
- Time quantum must be positive when Round Robin is selected.
- Invalid, missing, or excessively large inputs must be rejected safely.

### FR-02: Scheduling Algorithms

The application shall support:

1. First Come, First Served (FCFS)
2. Non-preemptive Shortest Job First (SJF)
3. Preemptive Shortest Job First / Shortest Remaining Time First (SRTF)
4. Non-preemptive Priority Scheduling
5. Preemptive Priority Scheduling
6. Round Robin (RR)

**Priority convention:** A smaller numeric priority value represents a higher priority.

SJF and Priority scheduling shall be clearly distinguished from their preemptive variants.

### FR-03: Scheduling Simulation

The engine shall simulate process execution using arrival time, burst time, priority, and the selected scheduling policy.

It shall correctly handle:
- Processes arriving at different times.
- Simultaneous arrivals.
- CPU idle periods.
- Preemption.
- Round Robin time slices.
- Process completion.
- Deterministic tie-breaking.

### FR-04: Performance Metrics

For each process, calculate:

- Completion Time (CT)
- Turnaround Time (TAT)
- Waiting Time (WT)
- Response Time (RT)

Formulas:

- TAT = CT − Arrival Time
- WT = TAT − Burst Time
- RT = First CPU Start Time − Arrival Time

For CPU-only workloads without I/O blocking, waiting time is calculated as turnaround time minus burst time.

For every selected algorithm, calculate average waiting time, average turnaround time, and average response time.

Throughput may also be displayed, defined as completed processes divided by the elapsed simulation interval.

### FR-05: Gantt Chart

The application shall display a timeline showing:
- Process execution intervals.
- Start and end times.
- CPU idle intervals.
- Preempted and resumed processes.

Adjacent execution intervals for the same process may be merged only when doing so preserves the actual execution timeline.

### FR-06: Algorithm Comparison

Users shall be able to compare selected algorithms using:
- Average waiting time.
- Average turnaround time.
- Average response time.
- Throughput, where applicable.
- Execution order and Gantt charts.

The application shall identify the algorithm with the best measured value for the selected optimization objective.

### FR-07: Recommendation Engine

SchedulAI shall provide an explainable recommendation.

The recommendation system shall:
1. Inspect workload characteristics.
2. Explain the initial candidate or recommendation.
3. Evaluate algorithms using the scheduling engine.
4. Compare measured results using a clearly selected objective.
5. Report the verified result and trade-offs.

The initial implementation shall use transparent rules and simulation-backed verification rather than claiming to use a trained machine-learning model.

A future version may use a trained decision-tree model evaluated on held-out synthetic workloads.

### FR-08: PCB and Process-State Explorer

The application shall display simplified Process Control Block information, including process ID, arrival time, burst time, priority, and calculated metrics.

It shall visualize applicable state transitions:

New → Ready → Running → Ready (if preempted) → Terminated.

The implementation shall not display a Blocked state unless I/O blocking is explicitly modeled.

### FR-09: Workload Presets

The application shall provide sample workloads for:
- Processes arriving simultaneously.
- Processes arriving at different times.
- Short and long jobs mixed together.
- Different priority levels.
- CPU idle periods.
- Workloads demonstrating preemption.
- Round Robin quantum comparisons.

Users shall also be able to enter custom workloads.

### FR-10: CSV Export

Users shall be able to export process metrics and algorithm comparison results to CSV.

### FR-11: Automated Testing

The project shall include tests for:
- All scheduling algorithms.
- Metric calculations.
- CPU idle intervals.
- Simultaneous arrivals.
- Preemption and resumption.
- Round Robin queue behavior.
- Invalid input.
- Recommendation correctness.

## 6. Non-Functional Requirements

### Performance
- Small classroom workloads should simulate interactively.
- The backend shall avoid recompiling the C++ engine for every request.
- Input size and simulation runtime shall be bounded.

### Reliability
- Scheduling calculations must be deterministic for identical inputs.
- One algorithm's simulation must not modify another algorithm's input data.
- Invalid requests must return useful errors.

### Usability
- Metrics and scheduling terminology shall be explained.
- Results shall be visually distinguishable and easy to compare.
- Empty states, validation errors, and loading states shall be handled.

### Maintainability
- Scheduling logic, API logic, recommendation logic, and frontend components shall remain separate.
- The existing C++ engine shall be refactored incrementally and covered by tests.

### Security
- Validate all user input on the backend.
- Avoid shell-string construction from user-controlled values.
- Do not expose internal paths, stack traces, or executable details to users.

## 7. Scope

### Initial release
- Six scheduling variants.
- Process input and validation.
- Scheduling metrics and Gantt charts.
- Algorithm comparison.
- Explainable simulation-backed recommendation.
- Basic PCB and state visualization.
- Workload presets.
- CSV export.
- Automated tests.

### Optional extensions
- Trained ML recommendation model.
- Automatic time-quantum tuning.
- Context-switch overhead simulation.
- Custom workload generation.
- Downloadable reports and additional analytics.

### Out of scope
- Replacing the host operating system's actual kernel scheduler.
- A bootable operating system.
- Real-time kernel process management.
- Database integration in the initial release.
- Claims of machine learning without a trained and evaluated model.

## 8. Acceptance Criteria

The initial release is considered complete when:

- All six scheduling variants produce correct, tested results.
- The original C++ backend has been adapted instead of discarded without review.
- The API returns structured results.
- The frontend displays metrics and Gantt charts.
- Algorithm comparisons use identical workload inputs.
- Recommendation explanations agree with the measured results.
- Invalid inputs are handled gracefully.
- CSV export works.
- The application can be demonstrated using predefined workloads.
- The README documents setup, execution, architecture, and limitations.

## 9. Success Measures

- All required scheduling algorithms pass deterministic tests.
- Average metrics match independently calculated expected results.
- No unsupported claims of AI or machine-learning capability are made.
- A user can run a workload, compare algorithms, and understand the recommendation without manually calculating the metrics.

## 10. Key Product Principle

**The recommendation system suggests; the scheduling engine calculates; verification determines the reported result.**
