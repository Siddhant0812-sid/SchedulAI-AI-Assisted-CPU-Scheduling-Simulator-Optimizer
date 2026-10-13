export type AlgorithmId =
  | 'FCFS'
  | 'SJF'
  | 'SRTF'
  | 'PRIORITY'
  | 'PREEMPTIVE_PRIORITY'
  | 'RR';

export type ObjectiveType =
  | 'waiting_time'
  | 'turnaround_time'
  | 'response_time';

export interface ProcessInput {
  id: number;
  arrival_time: number;
  burst_time: number;
  priority: number;
}

export interface ProcessMetricsOutput {
  id: number;
  arrival_time: number;
  burst_time: number;
  priority: number;
  completion_time: number;
  turnaround_time: number;
  waiting_time: number;
  response_time: number;
}

export interface TimelineSegmentOutput {
  process_id: number | null;
  process_name: string;
  start_time: number;
  end_time: number;
}

export interface AlgorithmResultOutput {
  algorithm_id: AlgorithmId;
  algorithm_name: string;
  average_waiting_time: number;
  average_turnaround_time: number;
  average_response_time: number;
  throughput: number;
  process_metrics: ProcessMetricsOutput[];
  timeline: TimelineSegmentOutput[];
}

export interface SimulationResponse {
  results: AlgorithmResultOutput[];
  time_quantum: number;
}

export interface WorkloadFeatures {
  process_count: number;
  arrival_spread: number;
  simultaneous_arrivals: boolean;
  burst_min: number;
  burst_max: number;
  burst_mean: number;
  burst_variance_ratio: number;
  distinct_priorities: number;
  has_priority_variation: boolean;
}

export interface AlternativeComparison {
  algorithm_id: AlgorithmId;
  algorithm_name: string;
  objective_value: number;
  difference_from_best: number;
  average_waiting_time: number;
  average_turnaround_time: number;
  average_response_time: number;
  throughput: number;
  is_best: boolean;
  is_tied_best: boolean;
}

export interface RecommendationResponse {
  recommended_algorithm_id: AlgorithmId;
  recommended_algorithm_name: string;
  rule_based_candidate_id: AlgorithmId;
  rule_based_candidate_name: string;
  candidate_matched_measured_best: boolean;
  objective: ObjectiveType;
  objective_label: string;
  measured_objective_value: number;
  tied_algorithms: string[];
  workload_features: WorkloadFeatures;
  rule_candidate_rationale: string;
  explanation: string;
  trade_offs: string[];
  alternatives: AlternativeComparison[];
  recommended_result: AlgorithmResultOutput;
}

export interface PresetWorkload {
  id: string;
  name: string;
  category: string;
  description: string;
  recommended_quantum: number;
  processes: ProcessInput[];
}

export interface AlgorithmMeta {
  id: AlgorithmId;
  name: string;
  shortName: string;
  preemptive: boolean;
  description: string;
}

export const ALGORITHM_CATALOG: AlgorithmMeta[] = [
  {
    id: 'FCFS',
    name: 'First Come, First Served',
    shortName: 'FCFS',
    preemptive: false,
    description: 'Executes ready processes in arrival order (tie-break: lower PID).',
  },
  {
    id: 'SJF',
    name: 'Shortest Job First',
    shortName: 'SJF',
    preemptive: false,
    description: 'Non-preemptive selection of the ready process with the smallest burst time.',
  },
  {
    id: 'SRTF',
    name: 'Shortest Remaining Time First',
    shortName: 'SRTF',
    preemptive: true,
    description: 'Preempts running process if a newly arrived process has a shorter remaining time.',
  },
  {
    id: 'PRIORITY',
    name: 'Priority Scheduling',
    shortName: 'Priority',
    preemptive: false,
    description: 'Non-preemptive selection of highest priority (smallest numeric priority value).',
  },
  {
    id: 'PREEMPTIVE_PRIORITY',
    name: 'Preemptive Priority',
    shortName: 'Preemptive Priority',
    preemptive: true,
    description: 'Preempts running process if a newly arrived job has a smaller priority number.',
  },
  {
    id: 'RR',
    name: 'Round Robin',
    shortName: 'Round Robin',
    preemptive: true,
    description: 'Time-sliced execution using a FIFO ready queue and configurable time quantum.',
  },
];

export const PROCESS_PALETTE = [
  '#38bdf8', // Sky
  '#a78bfa', // Violet
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#f472b6', // Pink
  '#fb7185', // Rose
  '#60a5fa', // Blue
  '#4ade80', // Green
  '#f97316', // Orange
  '#2dd4bf', // Teal
];

export function getProcessColor(processId: number | null): string {
  if (processId === null || processId < 1) {
    return '#334155'; // Slate for Idle
  }
  return PROCESS_PALETTE[(processId - 1) % PROCESS_PALETTE.length];
}

