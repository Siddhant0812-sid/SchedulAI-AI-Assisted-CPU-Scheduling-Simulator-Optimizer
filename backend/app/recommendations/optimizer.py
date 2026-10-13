from typing import List, Tuple
from ..schemas.scheduling import (
    AlgorithmId,
    AlgorithmResultOutput,
    AlternativeComparison,
    ObjectiveType,
    ProcessInput,
    RecommendationResponse,
    WorkloadFeatures,
)

ALGORITHM_DISPLAY_NAMES = {
    "FCFS": "FCFS",
    "SJF": "SJF",
    "SRTF": "SRTF",
    "PRIORITY": "Priority",
    "PREEMPTIVE_PRIORITY": "Preemptive Priority",
    "RR": "Round Robin",
}

OBJECTIVE_LABELS = {
    "waiting_time": "Minimize Average Waiting Time",
    "turnaround_time": "Minimize Average Turnaround Time",
    "response_time": "Minimize Average Response Time",
}


def extract_workload_features(processes: List[ProcessInput]) -> WorkloadFeatures:
    n = len(processes)
    arrivals = [p.arrival_time for p in processes]
    bursts = [p.burst_time for p in processes]
    priorities = {p.priority for p in processes}

    arrival_spread = max(arrivals) - min(arrivals)
    simultaneous = arrival_spread == 0
    burst_min = min(bursts)
    burst_max = max(bursts)
    burst_mean = sum(bursts) / n
    burst_ratio = burst_max / burst_min if burst_min > 0 else 1.0

    return WorkloadFeatures(
        process_count=n,
        arrival_spread=arrival_spread,
        simultaneous_arrivals=simultaneous,
        burst_min=burst_min,
        burst_max=burst_max,
        burst_mean=round(burst_mean, 2),
        burst_variance_ratio=round(burst_ratio, 2),
        distinct_priorities=len(priorities),
        has_priority_variation=len(priorities) > 1,
    )


def select_rule_based_candidate(
    features: WorkloadFeatures,
    objective: ObjectiveType,
    allowed_algorithms: List[AlgorithmId],
) -> Tuple[AlgorithmId, str]:
    """
    Applies transparent heuristic rules to propose an initial candidate algorithm
    based on workload characteristics and the user's optimization objective.
    """
    if objective == "response_time":
        if "RR" in allowed_algorithms and features.process_count > 1:
            return (
                "RR",
                "For minimizing average response time across multiple processes, Round Robin (RR) is the initial rule-based candidate because time-slicing gives newly arrived jobs quick initial CPU access.",
            )
        if "SRTF" in allowed_algorithms and not features.simultaneous_arrivals:
            return (
                "SRTF",
                "With staggered arrivals and an objective of minimizing response time, SRTF is selected as the initial candidate because short arriving jobs can immediately preempt longer running jobs.",
            )

    if objective in ("waiting_time", "turnaround_time"):
        if not features.simultaneous_arrivals and "SRTF" in allowed_algorithms:
            return (
                "SRTF",
                f"Because processes arrive at different times (spread = {features.arrival_spread}) and burst times range from {features.burst_min} to {features.burst_max}, Preemptive Shortest Job First (SRTF) is the theoretical rule-based candidate for minimizing {objective.replace('_', ' ')}.",
            )
        if features.simultaneous_arrivals and "SJF" in allowed_algorithms:
            return (
                "SJF",
                f"Because all processes arrive simultaneously at t = 0 and burst times vary ({features.burst_min} to {features.burst_max}), non-preemptive SJF is the classic rule-based candidate for minimizing {objective.replace('_', ' ')} without extra preemption overhead.",
            )
        if "SRTF" in allowed_algorithms:
            return (
                "SRTF",
                f"SRTF is the initial rule-based candidate for minimizing average {objective.replace('_', ' ')} by prioritizing the job with the shortest remaining burst time.",
            )
        if "SJF" in allowed_algorithms:
            return (
                "SJF",
                f"SJF is the initial rule-based candidate for minimizing average {objective.replace('_', ' ')} by executing shorter bursts first.",
            )

    # Fallback to first allowed algorithm
    fallback = allowed_algorithms[0]
    return (
        fallback,
        f"{ALGORITHM_DISPLAY_NAMES.get(fallback, fallback)} was selected as the initial candidate from the enabled algorithms.",
    )


def get_objective_metric(result: AlgorithmResultOutput, objective: ObjectiveType) -> float:
    if objective == "waiting_time":
        return result.average_waiting_time
    if objective == "turnaround_time":
        return result.average_turnaround_time
    return result.average_response_time


def build_recommendation(
    processes: List[ProcessInput],
    results: List[AlgorithmResultOutput],
    objective: ObjectiveType,
    time_quantum: int,
) -> RecommendationResponse:
    features = extract_workload_features(processes)
    allowed_ids = [r.algorithm_id for r in results]

    candidate_id, candidate_rationale = select_rule_based_candidate(
        features, objective, allowed_ids
    )
    candidate_name = ALGORITHM_DISPLAY_NAMES.get(candidate_id, candidate_id)

    # Measure and compare actual simulation results from the C++ engine
    eps = 1e-6
    best_val = min(get_objective_metric(r, objective) for r in results)

    tied_results = [
        r for r in results if abs(get_objective_metric(r, objective) - best_val) <= eps
    ]
    tied_names = [r.algorithm_name for r in tied_results]

    # If the rule-based candidate is tied for best, prefer it; otherwise take the first tied winner
    winner = tied_results[0]
    for r in tied_results:
        if r.algorithm_id == candidate_id:
            winner = r
            break

    candidate_matched = any(r.algorithm_id == candidate_id for r in tied_results)

    alternatives: List[AlternativeComparison] = []
    sorted_results = sorted(
        results,
        key=lambda r: (
            get_objective_metric(r, objective),
            r.average_waiting_time,
            r.average_turnaround_time,
            r.average_response_time,
        ),
    )

    for r in sorted_results:
        val = get_objective_metric(r, objective)
        diff = max(0.0, val - best_val)
        is_tied = abs(val - best_val) <= eps
        alternatives.append(
            AlternativeComparison(
                algorithm_id=r.algorithm_id,
                algorithm_name=r.algorithm_name,
                objective_value=round(val, 4),
                difference_from_best=round(diff, 4),
                average_waiting_time=round(r.average_waiting_time, 4),
                average_turnaround_time=round(r.average_turnaround_time, 4),
                average_response_time=round(r.average_response_time, 4),
                throughput=round(r.throughput, 4),
                is_best=(r.algorithm_id == winner.algorithm_id),
                is_tied_best=is_tied,
            )
        )

    # Identify runner-up (first non-tied algorithm)
    non_tied = [a for a in alternatives if not a.is_tied_best]
    runner_up_text = ""
    if non_tied:
        runner_up = non_tied[0]
        runner_up_text = (
            f" It outperformed the next non-tied alternative ({runner_up.algorithm_name} at "
            f"{runner_up.objective_value:.2f}) by {runner_up.difference_from_best:.2f} time units."
        )

    tie_text = ""
    if len(tied_names) > 1:
        tie_text = f" Note: {', '.join(tied_names)} tied with the exact same measured value ({best_val:.2f})."

    match_text = (
        f"Our rule-based initial candidate ({candidate_name}) matched the simulation-verified winner."
        if candidate_matched
        else f"While rules initially suggested {candidate_name}, actual simulation proved {winner.algorithm_name} achieved a better {objective.replace('_', ' ')} ({best_val:.2f})."
    )

    obj_label = OBJECTIVE_LABELS[objective]
    explanation = (
        f"Optimization Objective: {obj_label}. "
        f"Across all simulated algorithms on this {features.process_count}-process workload, "
        f"{winner.algorithm_name} achieved the lowest measured average {objective.replace('_', ' ')} "
        f"of {best_val:.2f}.{runner_up_text}{tie_text} {match_text} "
        f"(Verified via SchedulAI's deterministic C++ simulation-backed optimizer.)"
    )

    # Build transparent trade-offs
    trade_offs: List[str] = []
    if winner.algorithm_id in ("SRTF", "PREEMPTIVE_PRIORITY"):
        segments_count = len([s for s in winner.timeline if s.process_id is not None])
        preemptions = max(0, segments_count - features.process_count)
        trade_offs.append(
            f"Preemption overhead: {winner.algorithm_name} caused {preemptions} preemption(s) across {segments_count} CPU execution slices."
        )
        trade_offs.append(
            "Starvation risk: In continuous streams of short or high-priority jobs, longer or lower-priority processes can experience indefinite postponement."
        )
    elif winner.algorithm_id == "RR":
        segments_count = len([s for s in winner.timeline if s.process_id is not None])
        trade_offs.append(
            f"Context-switch frequency: With time quantum = {time_quantum}, Round Robin used {segments_count} execution slices. While response time is fast ({winner.average_response_time:.2f}), average turnaround time is {winner.average_turnaround_time:.2f}."
        )
    elif winner.algorithm_id in ("SJF", "PRIORITY"):
        trade_offs.append(
            f"Non-preemptive limitation: Once a process starts in {winner.algorithm_name}, newly arriving urgent or shorter jobs must wait until the current burst finishes."
        )
    elif winner.algorithm_id == "FCFS":
        trade_offs.append(
            "Convoy effect sensitivity: FCFS has zero preemption overhead, but if a long burst arrives early, all subsequent processes wait behind it."
        )

    # Compare against best algorithm on other metrics if different
    best_rt_alg = min(results, key=lambda r: r.average_response_time)
    if best_rt_alg.algorithm_id != winner.algorithm_id and (
        winner.average_response_time - best_rt_alg.average_response_time > eps
    ):
        trade_offs.append(
            f"Response time trade-off: {best_rt_alg.algorithm_name} achieved a lower average response time ({best_rt_alg.average_response_time:.2f} vs {winner.average_response_time:.2f})."
        )

    best_wt_alg = min(results, key=lambda r: r.average_waiting_time)
    if best_wt_alg.algorithm_id != winner.algorithm_id and (
        winner.average_waiting_time - best_wt_alg.average_waiting_time > eps
    ):
        trade_offs.append(
            f"Waiting time trade-off: {best_wt_alg.algorithm_name} achieved a lower average waiting time ({best_wt_alg.average_waiting_time:.2f} vs {winner.average_waiting_time:.2f})."
        )

    trade_offs.append(
        "Methodology note: This recommendation is produced by a rule-guided, simulation-backed optimizer (not a trained ML model) verified on the exact input workload."
    )

    return RecommendationResponse(
        recommended_algorithm_id=winner.algorithm_id,
        recommended_algorithm_name=winner.algorithm_name,
        rule_based_candidate_id=candidate_id,
        rule_based_candidate_name=candidate_name,
        candidate_matched_measured_best=candidate_matched,
        objective=objective,
        objective_label=obj_label,
        measured_objective_value=round(best_val, 4),
        tied_algorithms=tied_names,
        workload_features=features,
        rule_candidate_rationale=candidate_rationale,
        explanation=explanation,
        trade_offs=trade_offs,
        alternatives=alternatives,
        recommended_result=winner,
    )

