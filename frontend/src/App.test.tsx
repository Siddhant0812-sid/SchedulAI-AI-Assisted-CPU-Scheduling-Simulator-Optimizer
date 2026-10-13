import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { GanttChart } from './components/GanttChart';
import { deriveProcessStates } from './components/ProcessExplorerSection';
import {
  AlgorithmResultOutput,
  RecommendationResponse,
} from './types/scheduling';

const MOCK_RESULTS: AlgorithmResultOutput[] = [
  {
    algorithm_id: 'SRTF',
    algorithm_name: 'SRTF',
    average_waiting_time: 4.0,
    average_turnaround_time: 10.0,
    average_response_time: 2.67,
    throughput: 0.1667,
    process_metrics: [
      {
        id: 1,
        arrival_time: 0,
        burst_time: 6,
        priority: 2,
        completion_time: 10,
        turnaround_time: 10,
        waiting_time: 4,
        response_time: 0,
      },
      {
        id: 2,
        arrival_time: 1,
        burst_time: 4,
        priority: 1,
        completion_time: 5,
        turnaround_time: 4,
        waiting_time: 0,
        response_time: 0,
      },
    ],
    timeline: [
      { process_id: 1, process_name: 'P1', start_time: 0, end_time: 1 },
      { process_id: 2, process_name: 'P2', start_time: 1, end_time: 5 },
      { process_id: 1, process_name: 'P1', start_time: 5, end_time: 10 },
    ],
  },
  {
    algorithm_id: 'FCFS',
    algorithm_name: 'FCFS',
    average_waiting_time: 4.33,
    average_turnaround_time: 10.33,
    average_response_time: 4.33,
    throughput: 0.1667,
    process_metrics: [
      {
        id: 1,
        arrival_time: 0,
        burst_time: 6,
        priority: 2,
        completion_time: 6,
        turnaround_time: 6,
        waiting_time: 0,
        response_time: 0,
      },
      {
        id: 2,
        arrival_time: 1,
        burst_time: 4,
        priority: 1,
        completion_time: 10,
        turnaround_time: 9,
        waiting_time: 5,
        response_time: 5,
      },
    ],
    timeline: [
      { process_id: 1, process_name: 'P1', start_time: 0, end_time: 6 },
      { process_id: 2, process_name: 'P2', start_time: 6, end_time: 10 },
    ],
  },
];

const MOCK_RECOMMENDATION: RecommendationResponse = {
  recommended_algorithm_id: 'SRTF',
  recommended_algorithm_name: 'SRTF',
  rule_based_candidate_id: 'SRTF',
  rule_based_candidate_name: 'SRTF',
  candidate_matched_measured_best: true,
  objective: 'waiting_time',
  objective_label: 'Minimize Average Waiting Time',
  measured_objective_value: 4.0,
  tied_algorithms: ['SRTF'],
  workload_features: {
    process_count: 2,
    arrival_spread: 1,
    simultaneous_arrivals: false,
    burst_min: 4,
    burst_max: 6,
    burst_mean: 5.0,
    burst_variance_ratio: 1.5,
    distinct_priorities: 2,
    has_priority_variation: true,
  },
  rule_candidate_rationale:
    'SRTF is the initial rule-based candidate for minimizing waiting time.',
  explanation:
    'SRTF achieved the lowest measured average waiting time of 4.00 (simulation-backed optimizer).',
  trade_offs: ['Preemption overhead: 1 preemption.'],
  alternatives: [
    {
      algorithm_id: 'SRTF',
      algorithm_name: 'SRTF',
      objective_value: 4.0,
      difference_from_best: 0,
      average_waiting_time: 4.0,
      average_turnaround_time: 10.0,
      average_response_time: 2.67,
      throughput: 0.1667,
      is_best: true,
      is_tied_best: true,
    },
    {
      algorithm_id: 'FCFS',
      algorithm_name: 'FCFS',
      objective_value: 4.33,
      difference_from_best: 0.33,
      average_waiting_time: 4.33,
      average_turnaround_time: 10.33,
      average_response_time: 4.33,
      throughput: 0.1667,
      is_best: false,
      is_tied_best: false,
    },
  ],
  recommended_result: MOCK_RESULTS[0],
};

describe('SchedulAI Frontend Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/health')) {
        return new Response(
          JSON.stringify({ status: 'ok', engine_available: true }),
          { status: 200 }
        );
      }
      if (url.endsWith('/api/presets')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.endsWith('/api/simulate')) {
        return new Response(
          JSON.stringify({ results: MOCK_RESULTS, time_quantum: 2 }),
          { status: 200 }
        );
      }
      if (url.endsWith('/api/recommend')) {
        return new Response(JSON.stringify(MOCK_RECOMMENDATION), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });
  });

  it('renders Workspace, adds and removes processes, and validates invalid burst time', async () => {
    render(<App />);

    expect(screen.getByText('Process Workload Table')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Remove Process/i })).toHaveLength(4);

    // Add a 5th process
    fireEvent.click(screen.getByRole('button', { name: '+ Add Process' }));
    expect(screen.getAllByRole('button', { name: /Remove Process/i })).toHaveLength(5);

    // Set Burst Time of P1 to 0 -> triggers validation error and disables Run button
    const burstInput = screen.getByLabelText('Process P1 Burst Time');
    fireEvent.change(burstInput, { target: { value: '0' } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      /Burst time must be greater than 0/i
    );
    expect(
      screen.getByRole('button', { name: /Run Simulation & Verify/i })
    ).toBeDisabled();
  });

  it('submits simulation, switches to Comparison tab, and displays Gantt and AI Insights', async () => {
    render(<App />);

    const runBtn = screen.getByRole('button', {
      name: /Run Simulation & Verify/i,
    });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Algorithm Performance Comparison')
      ).toBeInTheDocument();
    });

    // Navigate to AI Insights tab
    fireEvent.click(screen.getByRole('button', { name: /4\. AI Insights/i }));
    expect(
      screen.getByText('Transparent Simulation-Backed Optimizer')
    ).toBeInTheDocument();
    expect(screen.getByText(/Verified Optimal Algorithm/i)).toBeInTheDocument();
  });

  it('renders GanttChart segments including CPU Idle intervals accurately', () => {
    render(
      <GanttChart
        timeline={[
          { process_id: null, process_name: 'Idle', start_time: 0, end_time: 2 },
          { process_id: 1, process_name: 'P1', start_time: 2, end_time: 6 },
        ]}
      />
    );

    expect(screen.getByText('Idle')).toBeInTheDocument();
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('4u')).toBeInTheDocument();
  });

  it('derives New -> Ready -> Running -> Ready (Preempted) -> Running -> Terminated states accurately', () => {
    const states = deriveProcessStates(
      MOCK_RESULTS[0].process_metrics[0],
      MOCK_RESULTS[0].timeline
    );
    expect(states.map((s) => s.state)).toEqual([
      'New',
      'Running',
      'Ready',
      'Running',
      'Terminated',
    ]);
  });
});

