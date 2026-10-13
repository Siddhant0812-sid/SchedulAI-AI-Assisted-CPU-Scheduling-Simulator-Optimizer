import React from 'react';
import {
  AlgorithmResultOutput,
  ObjectiveType,
  getProcessColor,
} from '../types/scheduling';
import { GanttChart } from './GanttChart';

interface ComparisonSectionProps {
  results: AlgorithmResultOutput[];
  objective: ObjectiveType;
  timeQuantum: number;
  highlightProcessId: number | null;
  onChangeObjective: (obj: ObjectiveType) => void;
  onSelectProcess: (pid: number | null) => void;
  onExportCsv: () => void;
}

export const ComparisonSection: React.FC<ComparisonSectionProps> = ({
  results,
  objective,
  timeQuantum,
  highlightProcessId,
  onChangeObjective,
  onSelectProcess,
  onExportCsv,
}) => {
  if (!results || results.length === 0) {
    return (
      <div className="panel empty-panel">
        <h2>No Simulation Results Yet</h2>
        <p>
          Configure a process workload in the Workspace tab and click{' '}
          <strong>Run Simulation &amp; Verify</strong> to compare scheduling algorithms.
        </p>
      </div>
    );
  }

  const getObjectiveVal = (r: AlgorithmResultOutput) => {
    if (objective === 'waiting_time') return r.average_waiting_time;
    if (objective === 'turnaround_time') return r.average_turnaround_time;
    return r.average_response_time;
  };

  const bestVal = Math.min(...results.map(getObjectiveVal));
  const eps = 1e-6;
  const bestAlgorithms = results.filter(
    (r) => Math.abs(getObjectiveVal(r) - bestVal) <= eps
  );

  const maxWt = Math.max(1, ...results.map((r) => r.average_waiting_time));
  const maxTat = Math.max(1, ...results.map((r) => r.average_turnaround_time));
  const maxRt = Math.max(1, ...results.map((r) => r.average_response_time));

  const primaryBest = bestAlgorithms[0];
  const allPids = primaryBest.process_metrics.map((p) => p.id);

  return (
    <div className="section-stack">
      {/* Top Summary Banner & Controls */}
      <div className="panel summary-toolbar">
        <div className="summary-toolbar-left">
          <span className="status-pill status-verified">
            Best for Selected Objective:{' '}
            <strong>{bestAlgorithms.map((b) => b.algorithm_name).join(' / ')}</strong> (
            {bestVal.toFixed(2)}u)
          </span>
          <div className="inline-control">
            <label htmlFor="comp-objective-select">Objective:</label>
            <select
              id="comp-objective-select"
              className="select-input select-sm"
              value={objective}
              onChange={(e) => onChangeObjective(e.target.value as ObjectiveType)}
            >
              <option value="waiting_time">Minimize Avg Waiting Time (WT)</option>
              <option value="turnaround_time">
                Minimize Avg Turnaround Time (TAT)
              </option>
              <option value="response_time">Minimize Avg Response Time (RT)</option>
            </select>
          </div>
        </div>

        <div className="summary-toolbar-right">
          <div className="process-filter-pills">
            <span className="filter-label">Highlight Process:</span>
            <button
              type="button"
              className={`pid-filter-btn ${
                highlightProcessId === null ? 'pid-filter-active' : ''
              }`}
              onClick={() => onSelectProcess(null)}
            >
              All
            </button>
            {allPids.map((pid) => (
              <button
                key={pid}
                type="button"
                className={`pid-filter-btn ${
                  highlightProcessId === pid ? 'pid-filter-active' : ''
                }`}
                onClick={() =>
                  onSelectProcess(highlightProcessId === pid ? null : pid)
                }
              >
                <span
                  className="pid-dot"
                  style={{ backgroundColor: getProcessColor(pid) }}
                />
                P{pid}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onExportCsv}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Top 4 Summary Cards for the Best Algorithm */}
      <div className="metrics-cards-grid">
        <div className="metric-card">
          <span className="metric-label" title="Time spent waiting in the ready queue: WT = TAT - BT">
            Best Avg Waiting Time (WT)
          </span>
          <span className="metric-value">
            {Math.min(...results.map((r) => r.average_waiting_time)).toFixed(2)}
            <small> units</small>
          </span>
          <span className="metric-sub">
            Lowest across {results.length} simulated policy variants
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-label" title="Total time from arrival to completion: TAT = CT - AT">
            Best Avg Turnaround Time (TAT)
          </span>
          <span className="metric-value">
            {Math.min(...results.map((r) => r.average_turnaround_time)).toFixed(2)}
            <small> units</small>
          </span>
          <span className="metric-sub">Completion Time minus Arrival Time</span>
        </div>

        <div className="metric-card">
          <span className="metric-label" title="Time from arrival to first CPU execution: RT = First Start - AT">
            Best Avg Response Time (RT)
          </span>
          <span className="metric-value">
            {Math.min(...results.map((r) => r.average_response_time)).toFixed(2)}
            <small> units</small>
          </span>
          <span className="metric-sub">First CPU execution minus Arrival Time</span>
        </div>

        <div className="metric-card">
          <span className="metric-label" title="Completed processes per unit of elapsed simulation time">
            System Throughput
          </span>
          <span className="metric-value">
            {primaryBest.throughput.toFixed(3)}
            <small> proc/unit</small>
          </span>
          <span className="metric-sub">
            {primaryBest.process_metrics.length} processes completed
          </span>
        </div>
      </div>

      {/* Algorithm Comparison Table & Visual Bar Comparison */}
      <section className="panel" aria-labelledby="comparison-table-heading">
        <div className="panel-header">
          <div>
            <h2 id="comparison-table-heading">Algorithm Performance Comparison</h2>
            <p className="panel-subtitle">
              Measured metrics computed by the C++ engine on identical copies of the input workload.
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table" aria-label="Algorithm Comparison Table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Avg. Waiting Time (WT)</th>
                <th>Avg. Turnaround Time (TAT)</th>
                <th>Avg. Response Time (RT)</th>
                <th>Throughput</th>
                <th>Objective Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const isWinner = Math.abs(getObjectiveVal(r) - bestVal) <= eps;
                return (
                  <tr
                    key={r.algorithm_id}
                    className={isWinner ? 'row-winner' : ''}
                  >
                    <th>
                      <span className="alg-row-name">
                        {r.algorithm_name}
                        {r.algorithm_id === 'RR' ? ` (Q=${timeQuantum})` : ''}
                      </span>
                    </th>
                    <td>
                      <div className="metric-bar-cell">
                        <span className="mono-val">
                          {r.average_waiting_time.toFixed(2)}
                        </span>
                        <div className="mini-bar-track">
                          <div
                            className="mini-bar-fill fill-wt"
                            style={{
                              width: `${(r.average_waiting_time / maxWt) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="metric-bar-cell">
                        <span className="mono-val">
                          {r.average_turnaround_time.toFixed(2)}
                        </span>
                        <div className="mini-bar-track">
                          <div
                            className="mini-bar-fill fill-tat"
                            style={{
                              width: `${
                                (r.average_turnaround_time / maxTat) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="metric-bar-cell">
                        <span className="mono-val">
                          {r.average_response_time.toFixed(2)}
                        </span>
                        <div className="mini-bar-track">
                          <div
                            className="mini-bar-fill fill-rt"
                            style={{
                              width: `${(r.average_response_time / maxRt) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="mono-val">{r.throughput.toFixed(3)}</td>
                    <td>
                      {isWinner ? (
                        <span className="badge-winner">
                          ★ Best for Objective
                        </span>
                      ) : (
                        <span className="badge-delta">
                          +{(getObjectiveVal(r) - bestVal).toFixed(2)}u slower
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Gantt Timelines for All Simulated Algorithms */}
      <section className="panel" aria-labelledby="gantt-section-heading">
        <div className="panel-header">
          <div>
            <h2 id="gantt-section-heading">CPU Execution Timelines (Gantt Charts)</h2>
            <p className="panel-subtitle">
              Click any process segment to highlight it across all algorithms and inspect its PCB metrics.
            </p>
          </div>
        </div>

        <div className="gantt-stack">
          {results.map((r) => {
            const isWinner = Math.abs(getObjectiveVal(r) - bestVal) <= eps;
            return (
              <div key={r.algorithm_id} className="gantt-algorithm-block">
                <div className="gantt-block-header">
                  <div>
                    <span className="gantt-alg-title">
                      {r.algorithm_name}
                      {r.algorithm_id === 'RR' ? ` (Quantum = ${timeQuantum})` : ''}
                    </span>
                    {isWinner && (
                      <span className="badge-winner badge-inline">Best</span>
                    )}
                  </div>
                  <div className="gantt-quick-stats">
                    <span>Avg WT: {r.average_waiting_time.toFixed(2)}</span>
                    <span>Avg TAT: {r.average_turnaround_time.toFixed(2)}</span>
                    <span>Avg RT: {r.average_response_time.toFixed(2)}</span>
                  </div>
                </div>
                <GanttChart
                  timeline={r.timeline}
                  highlightProcessId={highlightProcessId}
                  onSelectProcess={(pid) => onSelectProcess(pid)}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

