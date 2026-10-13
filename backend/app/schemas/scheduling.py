from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator, model_validator

AlgorithmId = Literal[
    "FCFS",
    "SJF",
    "SRTF",
    "PRIORITY",
    "PREEMPTIVE_PRIORITY",
    "RR",
]

ObjectiveType = Literal[
    "waiting_time",
    "turnaround_time",
    "response_time",
]

ALL_ALGORITHMS: List[AlgorithmId] = [
    "FCFS",
    "SJF",
    "SRTF",
    "PRIORITY",
    "PREEMPTIVE_PRIORITY",
    "RR",
]


class ProcessInput(BaseModel):
    id: int = Field(..., gt=0, le=10000, description="Unique positive process identifier")
    arrival_time: int = Field(..., ge=0, le=100000, description="Non-negative arrival time")
    burst_time: int = Field(..., gt=0, le=100000, description="Positive CPU burst time")
    priority: int = Field(1, gt=0, le=10000, description="Positive priority (smaller value = higher priority)")


class SimulationRequest(BaseModel):
    processes: List[ProcessInput] = Field(..., min_length=1, max_length=200)
    algorithms: List[AlgorithmId] = Field(
        default_factory=lambda: list(ALL_ALGORITHMS),
        min_length=1,
    )
    time_quantum: int = Field(2, gt=0, le=10000, description="Positive time quantum for Round Robin")

    @field_validator("processes")
    @classmethod
    def validate_unique_ids(cls, processes: List[ProcessInput]) -> List[ProcessInput]:
        seen = set()
        for p in processes:
            if p.id in seen:
                raise ValueError(f"Duplicate process ID: {p.id}. Process IDs must be unique.")
            seen.add(p.id)
        return processes

    @field_validator("algorithms")
    @classmethod
    def deduplicate_algorithms(cls, algorithms: List[AlgorithmId]) -> List[AlgorithmId]:
        seen = []
        for alg in algorithms:
            if alg not in seen:
                seen.append(alg)
        return seen


class ProcessMetricsOutput(BaseModel):
    id: int
    arrival_time: int
    burst_time: int
    priority: int
    completion_time: int
    turnaround_time: int
    waiting_time: int
    response_time: int


class TimelineSegmentOutput(BaseModel):
    process_id: Optional[int] = Field(None, description="Process ID, or null if CPU is idle")
    process_name: str
    start_time: int
    end_time: int


class AlgorithmResultOutput(BaseModel):
    algorithm_id: AlgorithmId
    algorithm_name: str
    average_waiting_time: float
    average_turnaround_time: float
    average_response_time: float
    throughput: float
    process_metrics: List[ProcessMetricsOutput]
    timeline: List[TimelineSegmentOutput]


class SimulationResponse(BaseModel):
    results: List[AlgorithmResultOutput]
    time_quantum: int


class RecommendationRequest(BaseModel):
    processes: List[ProcessInput] = Field(..., min_length=1, max_length=200)
    objective: ObjectiveType = Field(
        "waiting_time",
        description="Optimization objective: waiting_time, turnaround_time, or response_time",
    )
    time_quantum: int = Field(2, gt=0, le=10000)
    algorithms: List[AlgorithmId] = Field(
        default_factory=lambda: list(ALL_ALGORITHMS),
        min_length=1,
    )

    @field_validator("processes")
    @classmethod
    def validate_unique_ids(cls, processes: List[ProcessInput]) -> List[ProcessInput]:
        seen = set()
        for p in processes:
            if p.id in seen:
                raise ValueError(f"Duplicate process ID: {p.id}. Process IDs must be unique.")
            seen.add(p.id)
        return processes


class WorkloadFeatures(BaseModel):
    process_count: int
    arrival_spread: int
    simultaneous_arrivals: bool
    burst_min: int
    burst_max: int
    burst_mean: float
    burst_variance_ratio: float
    distinct_priorities: int
    has_priority_variation: bool


class AlternativeComparison(BaseModel):
    algorithm_id: AlgorithmId
    algorithm_name: str
    objective_value: float
    difference_from_best: float
    average_waiting_time: float
    average_turnaround_time: float
    average_response_time: float
    throughput: float
    is_best: bool
    is_tied_best: bool


class RecommendationResponse(BaseModel):
    recommended_algorithm_id: AlgorithmId
    recommended_algorithm_name: str
    rule_based_candidate_id: AlgorithmId
    rule_based_candidate_name: str
    candidate_matched_measured_best: bool
    objective: ObjectiveType
    objective_label: str
    measured_objective_value: float
    tied_algorithms: List[str]
    workload_features: WorkloadFeatures
    rule_candidate_rationale: str
    explanation: str
    trade_offs: List[str]
    alternatives: List[AlternativeComparison]
    recommended_result: AlgorithmResultOutput


class PresetWorkload(BaseModel):
    id: str
    name: str
    category: str
    description: str
    recommended_quantum: int
    processes: List[ProcessInput]

