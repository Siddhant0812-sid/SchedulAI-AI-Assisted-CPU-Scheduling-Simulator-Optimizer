import React, { useState } from 'react';
import {
  AlgorithmId,
  AlgorithmResultOutput,
  ProcessMetricsOutput,
  TimelineSegmentOutput,
  getProcessColor,
} from '../types/scheduling';
import { GanttChart } from './GanttChart';

interface ProcessExplorerSectionProps {
  results: AlgorithmResultOutput[];
  selectedProcessId: number | null;
  onSelectProcess: (pid: number) => void;
}

export interface DerivedStateInterval {
  state: 'New' | 'Ready' | 'Running' | 'Terminated';
  startTime: number;
  endTime: number;
  note: string;
}

/**
 * Derives accurate OS process state transitions directly from the C++ simulation
 * timeline and process arrival/completion metrics.
 * Valid states: New -> Ready -> Running -> Ready (if preempted) -> Terminated.
 * No Blocked state is shown because I/O blocking is not simulated.
 */
export function deriveProcessStates(
  proc: ProcessMetricsOutput,
  timeline: TimelineSegmentOutput[]
): DerivedStateInterval[] {
  const intervals: DerivedStateInterval[] = [];

  if (proc.arrival_time > 0) {
    intervals.push({
      state: 'New',
      startTime: 0,
      endTime: proc.arrival_time,
      note: `Created; arrives in Ready Queue at t = ${proc.arrival_time}`,
    });
  } else {
    intervals.push({
      state: 'New',
      startTime: 0,
      endTime: 0,
      note: 'Arrives at system initialization (t = 0)',
    });
  }

  const runSegments = timeline.filter((s) => s.process_id === proc.id);
  let cursor = proc.arrival_time;

  runSegments.forEach((seg, index) => {
    if (seg.start_time > cursor) {
      intervals.push({
        state: 'Ready',
        startTime: cursor,
        endTime: seg.start_time,
        note:
          index === 0
            ? 'Waiting in Ready Queue for first CPU dispatch'
            : 'Preempted; waiting in Ready Queue to resume',
      });
    }

    intervals.push({
      state: 'Running',
      startTime: seg.start_time,
      endTime: seg.end_time,
      note:
        index === 0
          ? 'First CPU dispatch (Response Time recorded)'
          : `Resumed CPU execution (slice #${index + 1})`,
    });

    cursor = seg.end_time;
  });

  intervals.push({
    state: 'Terminated',
    startTime: proc.completion_time,
    endTime: proc.completion_time,
    note: `Execution completed at t = ${proc.completion_time}`,
  });

  return intervals;
}

export const ProcessExplorerSection: React.FC<ProcessExplorerSectionProps> = ({
  results,
  selectedProcessId,
  onSelectProcess,
}) => {
  const [activeAlgId, setActiveAlgId] = useState<AlgorithmId>(
    results[0]?.algorithm_id || 'FCFS'
  );

  if (!results || results.length === 0) {
    return (
      <div className="panel empty-panel">
        <h2>Process Explorer Unavailable</h2>
        <p>Run a simulation first to inspect PCB attributes and state transitions.</p>
      </div>
    );
  }

  const activeAlg =
    results.find((r) => r.algorithm_id === activeAlgId) || results[0];
  const currentPid =
    selectedProcessId ?? activeAlg.process_metrics[0]?.id ?? 1;
  const activeProcess =
    activeAlg.process_metrics.find((p) => p.id === currentPid) ||
    activeAlg.process_metrics[0];

  const stateHistory = deriveProcessStates(activeProcess, activeAlg.timeline);
  const runSlices = activeAlg.timeline.filter(
    (s) => s.process_id === activeProcess.id
  );
  const preemptionCount = Math.max(0, runSlices.length - 1);

  return (
    <div className="section-stack">
      {/* Algorithm & Process Selector Toolbar */}
      <div className="panel summary-toolbar">
        <div className="summary-toolbar-left">
          <div className="inline-control">
            <label htmlFor="explorer-alg-select">Algorithm Schedule:</label>
            <select
              id="explorer-alg-select"
              className="select-input select-sm"
              value={activeAlg.algorithm_id}
              onChange={(e) => setActiveAlgId(e.target.value as AlgorithmId)}
            >
              {results.map((r) => (
                <option key={r.algorithm_id} value={r.algorithm_id}>
                  {r.algorithm_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="process-filter-pills" role="group" aria-label="Select Process PCB">
          <span className="filter-label">Inspect Process PCB:</span>
          {activeAlg.process_metrics.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`pid-filter-btn ${
                activeProcess.id === p.id ? 'pid-filter-active' : ''
              }`}
              onClick={() => onSelectProcess(p.id)}
            >
              <span
                className="pid-dot"
                style={{ backgroundColor: getProcessColor(p.id) }}
              />
              P{p.id}
            </button>
          ))}
        </div>
      </div>

      {/* Highlighted Gantt Chart for Context */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Execution Context — {activeAlg.algorithm_name} (Highlighting P
              {activeProcess.id})
            </h2>
            <p className="panel-subtitle">
              Click any segment on the timeline to switch the inspected Process Control Block (PCB).
            </p>
          </div>
        </div>
        <GanttChart
          timeline={activeAlg.timeline}
          highlightProcessId={activeProcess.id}
          onSelectProcess={onSelectProcess}
        />
      </section>

      <div className="explorer-two-col">
        {/* Left: Simplified PCB Details */}
        <section className="panel" aria-labelledby="pcb-heading">
          <div className="panel-header">
            <div>
              <h2 id="pcb-heading">
                Process Control Block (PCB) — P{activeProcess.id}
              </h2>
              <p className="panel-subtitle">
                Per-process attributes and calculated timing metrics under {activeAlg.algorithm_name}.
              </p>
            </div>
            <span
              className="pcb-badge"
              style={{ backgroundColor: getProcessColor(activeProcess.id) }}
            >
              PID #{activeProcess.id}
            </span>
          </div>

          <div className="pcb-grid">
            <div className="pcb-item">
              <span className="pcb-key">Process ID (PID)</span>
              <span className="pcb-val mono-val">P{activeProcess.id}</span>
            </div>
            <div className="pcb-item">
              <span className="pcb-key">Arrival Time (AT)</span>
              <span className="pcb-val mono-val">{activeProcess.arrival_time}</span>
            </div>
            <div className="pcb-item">
              <span className="pcb-key">CPU Burst Time (BT)</span>
              <span className="pcb-val mono-val">{activeProcess.burst_time}</span>
            </div>
            <div className="pcb-item">
              <span className="pcb-key">Scheduling Priority</span>
              <span className="pcb-val mono-val">{activeProcess.priority}</span>
            </div>
            <div className="pcb-item">
              <span className="pcb-key">Completion Time (CT)</span>
              <span className="pcb-val mono-val">{activeProcess.completion_time}</span>
            </div>
            <div className="pcb-item">
              <span className="pcb-key">Turnaround Time (TAT = CT − AT)</span>
              <span className="pcb-val mono-val">
                {activeProcess.turnaround_time}{' '}
                <small>
                  ({activeProcess.completion_time} − {activeProcess.arrival_time})
                </small>
              </span>
            </div>
            <div className="pcb-item">
              <span className="pcb-key">Waiting Time (WT = TAT − BT)</span>
              <span className="pcb-val mono-val">
                {activeProcess.waiting_time}{' '}
                <small>
                  ({activeProcess.turnaround_time} − {activeProcess.burst_time})
                </small>
              </span>
            </div>
            <div className="pcb-item">
              <span className="pcb-key">Response Time (RT = First Start − AT)</span>
              <span className="pcb-val mono-val">
                {activeProcess.response_time}
              </span>
            </div>
            <div className="pcb-item">
              <span className="pcb-key">CPU Execution Slices</span>
              <span className="pcb-val mono-val">{runSlices.length}</span>
            </div>
            <div className="pcb-item">
              <span className="pcb-key">Times Preempted</span>
              <span className="pcb-val mono-val">{preemptionCount}</span>
            </div>
          </div>
        </section>

        {/* Right: Process State Transition Timeline */}
        <section className="panel" aria-labelledby="state-heading">
          <div className="panel-header">
            <div>
              <h2 id="state-heading">
                State Transition Lifecycle — P{activeProcess.id}
              </h2>
              <p className="panel-subtitle">
                Derived directly from simulation events (New → Ready → Running → Terminated; CPU-only model without I/O Blocked state).
              </p>
            </div>
          </div>

          <div className="state-flow-diagram">
            <span className="state-node state-new">New</span>
            <span className="state-arrow">→</span>
            <span className="state-node state-ready">Ready</span>
            <span className="state-arrow">⇄</span>
            <span className="state-node state-running">Running</span>
            <span className="state-arrow">→</span>
            <span className="state-node state-terminated">Terminated</span>
          </div>

          <ol className="state-timeline-list">
            {stateHistory.map((item, idx) => (
              <li key={idx} className="state-step">
                <span
                  className={`state-tag state-${item.state.toLowerCase()}`}
                >
                  {item.state}
                </span>
                <div className="state-step-body">
                  <span className="state-time mono-val">
                    {item.startTime === item.endTime
                      ? `t = ${item.startTime}`
                      : `t = ${item.startTime} → ${item.endTime} (${
                          item.endTime - item.startTime
                        }u)`}
                  </span>
                  <span className="state-note">{item.note}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Full Per-Process Metrics Table for the Selected Algorithm */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>All Processes Table — {activeAlg.algorithm_name}</h2>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Process</th>
                <th>Arrival (AT)</th>
                <th>Burst (BT)</th>
                <th>Priority</th>
                <th>Completion (CT)</th>
                <th>Turnaround (TAT)</th>
                <th>Waiting (WT)</th>
                <th>Response (RT)</th>
              </tr>
            </thead>
            <tbody>
              {activeAlg.process_metrics.map((p) => (
                <tr
                  key={p.id}
                  className={p.id === activeProcess.id ? 'row-winner' : ''}
                  onClick={() => onSelectProcess(p.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <th>
                    <span
                      className="pid-dot"
                      style={{ backgroundColor: getProcessColor(p.id) }}
                    />
                    P{p.id}
                  </th>
                  <td className="mono-val">{p.arrival_time}</td>
                  <td className="mono-val">{p.burst_time}</td>
                  <td className="mono-val">{p.priority}</td>
                  <td className="mono-val">{p.completion_time}</td>
                  <td className="mono-val">{p.turnaround_time}</td>
                  <td className="mono-val">{p.waiting_time}</td>
                  <td className="mono-val">{p.response_time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

