import React from 'react';
import { ObjectiveType, RecommendationResponse } from '../types/scheduling';
import { GanttChart } from './GanttChart';

interface AiInsightsSectionProps {
  recommendation: RecommendationResponse | null;
  objective: ObjectiveType;
  loading: boolean;
  onChangeObjective: (obj: ObjectiveType) => void;
}

export const AiInsightsSection: React.FC<AiInsightsSectionProps> = ({
  recommendation,
  objective,
  loading,
  onChangeObjective,
}) => {
  if (!recommendation) {
    return (
      <div className="panel empty-panel">
        <h2>Recommendation Insights Unavailable</h2>
        <p>
          Run a simulation in the Workspace to generate a simulation-backed algorithm recommendation.
        </p>
      </div>
    );
  }

  return (
    <div className="section-stack">
      {/* Transparency Banner */}
      <div className="panel honesty-banner">
        <div>
          <span className="honesty-tag">Transparent Simulation-Backed Optimizer</span>
          <p className="honesty-text">
            SchedulAI analyzes workload properties using deterministic rules to propose an initial candidate, then executes all enabled scheduling algorithms in the C++17 engine to verify the true optimal policy for your selected objective. It does not rely on an opaque or unverified black-box ML model.
          </p>
        </div>
        <div className="inline-control">
          <label htmlFor="insights-objective-select">Optimization Objective:</label>
          <select
            id="insights-objective-select"
            className="select-input select-sm"
            value={objective}
            disabled={loading}
            onChange={(e) => onChangeObjective(e.target.value as ObjectiveType)}
          >
            <option value="waiting_time">Minimize Average Waiting Time (WT)</option>
            <option value="turnaround_time">
              Minimize Average Turnaround Time (TAT)
            </option>
            <option value="response_time">Minimize Average Response Time (RT)</option>
          </select>
        </div>
      </div>

      {/* Main Recommendation Hero Card */}
      <div className="insights-hero-grid">
        <section className="panel winner-card" aria-labelledby="rec-winner-heading">
          <span className="winner-eyebrow">Verified Optimal Algorithm</span>
          <h2 id="rec-winner-heading" className="winner-title">
            {recommendation.recommended_algorithm_name}
          </h2>
          <p className="winner-objective">
            Objective: <strong>{recommendation.objective_label}</strong>
          </p>
          <div className="winner-metric-box">
            <span className="winner-metric-val">
              {recommendation.measured_objective_value.toFixed(2)}
            </span>
            <span className="winner-metric-unit">time units (measured average)</span>
          </div>
          {recommendation.tied_algorithms.length > 1 && (
            <p className="tie-notice">
              Tied for optimal with:{' '}
              <strong>{recommendation.tied_algorithms.join(', ')}</strong>
            </p>
          )}
        </section>

        <section className="panel candidate-card" aria-labelledby="rule-cand-heading">
          <span className="winner-eyebrow">Step 1 — Rule-Based Initial Candidate</span>
          <h3 id="rule-cand-heading" className="candidate-title">
            {recommendation.rule_based_candidate_name}
          </h3>
          <span
            className={`match-badge ${
              recommendation.candidate_matched_measured_best
                ? 'match-yes'
                : 'match-diff'
            }`}
          >
            {recommendation.candidate_matched_measured_best
              ? '✓ Matched Simulation Winner'
              : '⚡ Overridden by Measured Simulation'}
          </span>
          <p className="candidate-rationale">
            {recommendation.rule_candidate_rationale}
          </p>
        </section>
      </div>

      {/* Plain-Language Explanation & Trade-offs */}
      <div className="explorer-two-col">
        <section className="panel" aria-labelledby="explanation-heading">
          <h2 id="explanation-heading">Verification Explanation</h2>
          <p className="explanation-body">{recommendation.explanation}</p>

          <h3 className="sub-heading">Extracted Workload Characteristics</h3>
          <div className="pcb-grid">
            <div className="pcb-item">
              <span className="pcb-key">Process Count</span>
              <span className="pcb-val mono-val">
                {recommendation.workload_features.process_count}
              </span>
            </div>
            <div className="pcb-item">
              <span className="pcb-key">Arrival Pattern</span>
              <span className="pcb-val">
                {recommendation.workload_features.simultaneous_arrivals
                  ? 'Simultaneous (t = 0)'
                  : `Staggered (spread = ${recommendation.workload_features.arrival_spread}u)`}
              </span>
            </div>
            <div className="pcb-item">
              <span className="pcb-key">Burst Range</span>
              <span className="pcb-val mono-val">
                {recommendation.workload_features.burst_min}u –{' '}
                {recommendation.workload_features.burst_max}u (mean:{' '}
                {recommendation.workload_features.burst_mean}u)
              </span>
            </div>
            <div className="pcb-item">
              <span className="pcb-key">Burst Max/Min Ratio</span>
              <span className="pcb-val mono-val">
                {recommendation.workload_features.burst_variance_ratio}×
              </span>
            </div>
            <div className="pcb-item">
              <span className="pcb-key">Distinct Priority Levels</span>
              <span className="pcb-val mono-val">
                {recommendation.workload_features.distinct_priorities}
              </span>
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby="tradeoffs-heading">
          <h2 id="tradeoffs-heading">Trade-Offs &amp; Scheduling Considerations</h2>
          <ul className="tradeoffs-list">
            {recommendation.trade_offs.map((item, idx) => (
              <li key={idx} className="tradeoff-item">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Recommended Algorithm Timeline */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Recommended Execution Timeline —{' '}
              {recommendation.recommended_algorithm_name}
            </h2>
          </div>
        </div>
        <GanttChart timeline={recommendation.recommended_result.timeline} />
      </section>

      {/* Ranked Alternatives Table */}
      <section className="panel" aria-labelledby="alternatives-heading">
        <div className="panel-header">
          <div>
            <h2 id="alternatives-heading">
              Ranked Comparison Against Alternatives ({recommendation.objective_label})
            </h2>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Algorithm</th>
                <th>Objective Value</th>
                <th>Difference from Best</th>
                <th>Avg. WT</th>
                <th>Avg. TAT</th>
                <th>Avg. RT</th>
              </tr>
            </thead>
            <tbody>
              {recommendation.alternatives.map((alt, index) => (
                <tr
                  key={alt.algorithm_id}
                  className={alt.is_best ? 'row-winner' : ''}
                >
                  <td className="mono-val">#{index + 1}</td>
                  <th>
                    {alt.algorithm_name}
                    {alt.is_best && (
                      <span className="badge-winner badge-inline">Recommended</span>
                    )}
                    {!alt.is_best && alt.is_tied_best && (
                      <span className="badge-winner badge-inline">Tied Best</span>
                    )}
                  </th>
                  <td className="mono-val">{alt.objective_value.toFixed(2)}</td>
                  <td className="mono-val">
                    {alt.difference_from_best === 0
                      ? '0.00 (Optimal)'
                      : `+${alt.difference_from_best.toFixed(2)}`}
                  </td>
                  <td className="mono-val">
                    {alt.average_waiting_time.toFixed(2)}
                  </td>
                  <td className="mono-val">
                    {alt.average_turnaround_time.toFixed(2)}
                  </td>
                  <td className="mono-val">
                    {alt.average_response_time.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

