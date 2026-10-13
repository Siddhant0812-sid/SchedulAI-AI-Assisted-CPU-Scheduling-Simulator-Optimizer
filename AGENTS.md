# SchedulAI — AI Coding Agent Instructions

## Project Context

SchedulAI is an AI-integrated CPU scheduling simulator for an Operating Systems mini-project.

Read the following documents before making significant changes:
- `docs/PRD.md`
- `docs/TRD.md`
- `docs/ARCHITECTURE.md`
- `docs/UI_UX_DESIGN.md`

## Most Important Rule

**Modify the existing C++ scheduling backend incrementally. Do not replace it wholesale or create a separate competing implementation without first inspecting the current source.**

## Existing Backend

The current C++ implementation includes:
- FCFS
- Non-preemptive SJF
- Non-preemptive Priority
- SRTF
- Round Robin
- Gantt chart printing
- Scheduling metrics
- Algorithm comparison

Inspect the actual files before assuming their exact contents or signatures.

The target also includes preemptive Priority Scheduling.

## Development Rules

1. Inspect relevant files before modifying them.
2. Explain the planned changes briefly before substantial refactoring.
3. Preserve working functionality unless a change is justified.
4. Prefer small, testable modifications.
5. Do not duplicate scheduling logic in Python.
6. Separate scheduling calculations from terminal printing.
7. Keep algorithm outputs consistent.
8. Use structured JSON for engine/API communication.
9. Keep the initial implementation database-free.
10. Do not claim a trained ML model exists unless it has actually been implemented and evaluated.
11. Never fabricate benchmark results or test outcomes.
12. Keep documentation aligned with implemented behavior.

## Correctness Requirements

- Arrival times must be non-negative.
- Burst times and priorities must be positive.
- Round Robin quantum must be positive.
- Lower numeric priority means higher priority.
- Preemptive and non-preemptive algorithms must be distinct.
- CPU idle intervals must be represented correctly.
- Response time must use the first CPU execution time.
- Identical inputs must produce deterministic results.
- Every algorithm must receive an independent copy of the workload.
- Validate input limits and protect time calculations from overflow.

## Recommendation Requirements

The recommendation must state the optimization objective.

Run the supported algorithms on the same workload when comparing their measured results.

Distinguish:
- The rule-based initial candidate.
- The algorithm with the best measured result.
- The explanation and trade-offs.

Describe the initial implementation as a simulation-backed optimizer, not a trained AI model.

## Testing Requirements

Before declaring a task complete:
1. Compile the C++ engine.
2. Run relevant C++ tests.
3. Run backend tests for changed API or service code.
4. Verify frontend behavior when applicable.
5. Report which tests actually ran and any remaining limitations.

## Working Style

- Use beginner-friendly explanations.
- When changing existing code, identify the files and functions involved.
- Explain important modifications and why they are necessary.
- Avoid unnecessary dependencies.
- Do not proceed with large unrelated changes.
- Ask before changing the architecture or removing working functionality.

## Project Completion Goal

Deliver a working application with six scheduling variants, accurate metrics, Gantt charts, algorithm comparison, transparent recommendations, process-state visualization, workload presets, CSV export, and documented tests.
