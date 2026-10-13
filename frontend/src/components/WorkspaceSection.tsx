import React, { useState } from 'react';
import {
  ALGORITHM_CATALOG,
  AlgorithmId,
  ObjectiveType,
  PresetWorkload,
  ProcessInput,
   getProcessColor,
} from '../types/scheduling';

interface WorkspaceSectionProps {
  processes: ProcessInput[];
  selectedAlgorithms: AlgorithmId[];
  timeQuantum: number;
  objective: ObjectiveType;
  presets: PresetWorkload[];
  selectedPresetId: string;
  loading: boolean;
  onUpdateProcesses: (processes: ProcessInput[]) => void;
  onToggleAlgorithm: (algId: AlgorithmId) => void;
  onSelectAllAlgorithms: () => void;
  onChangeQuantum: (q: number) => void;
  onChangeObjective: (obj: ObjectiveType) => void;
  onLoadPreset: (preset: PresetWorkload) => void;
  onRunSimulation: () => void;
  onResetWorkspace: () => void;
}

export const WorkspaceSection: React.FC<WorkspaceSectionProps> = ({
  processes,
  selectedAlgorithms,
  timeQuantum,
  objective,
  presets,
  selectedPresetId,
  loading,
  onUpdateProcesses,
  onToggleAlgorithm,
  onSelectAllAlgorithms,
  onChangeQuantum,
  onChangeObjective,
  onLoadPreset,
  onRunSimulation,
  onResetWorkspace,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateCurrentInputs = (
    list: ProcessInput[],
    algs: AlgorithmId[],
    quantum: number
  ): string | null => {
    if (list.length === 0) {
      return 'Add at least one process or load a preset workload before running.';
    }
    const seenIds = new Set<number>();
    for (const p of list) {
      if (!Number.isInteger(p.id) || p.id <= 0) {
        return `Invalid Process ID (${p.id}): PID must be a positive integer.`;
      }
      if (seenIds.has(p.id)) {
        return `Duplicate Process ID (P${p.id}): Each process must have a unique PID.`;
      }
      seenIds.add(p.id);

      if (!Number.isInteger(p.arrival_time) || p.arrival_time < 0) {
        return `Invalid Arrival Time for P${p.id}: Arrival time must be 0 or greater.`;
      }
      if (!Number.isInteger(p.burst_time) || p.burst_time <= 0) {
        return `Invalid Burst Time for P${p.id}: Burst time must be greater than 0.`;
      }
      if (!Number.isInteger(p.priority) || p.priority <= 0) {
        return `Invalid Priority for P${p.id}: Priority must be a positive integer (1 = highest).`;
      }
    }
    if (algs.length === 0) {
      return 'Select at least one scheduling algorithm to simulate.';
    }
    if (algs.includes('RR') && (!Number.isInteger(quantum) || quantum <= 0)) {
      return 'Round Robin time quantum must be a positive integer.';
    }
    return null;
  };

  const handleFieldChange = (
    index: number,
    field: keyof ProcessInput,
    rawVal: string
  ) => {
    const parsed = rawVal === '' ? 0 : parseInt(rawVal, 10);
    const updated = processes.map((item, idx) =>
      idx === index ? { ...item, [field]: Number.isNaN(parsed) ? 0 : parsed } : item
    );
    onUpdateProcesses(updated);
    setValidationError(validateCurrentInputs(updated, selectedAlgorithms, timeQuantum));
  };

  const handleAddProcess = () => {
    const maxId = processes.reduce((max, p) => Math.max(max, p.id), 0);
    const lastArrival =
      processes.length > 0 ? processes[processes.length - 1].arrival_time + 1 : 0;
    const nextProc: ProcessInput = {
      id: maxId + 1,
      arrival_time: lastArrival,
      burst_time: 4,
      priority: 2,
    };
    const updated = [...processes, nextProc];
    onUpdateProcesses(updated);
    setValidationError(validateCurrentInputs(updated, selectedAlgorithms, timeQuantum));
  };

  const handleRemoveProcess = (index: number) => {
    const updated = processes.filter((_, idx) => idx !== index);
    onUpdateProcesses(updated);
    setValidationError(validateCurrentInputs(updated, selectedAlgorithms, timeQuantum));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateCurrentInputs(processes, selectedAlgorithms, timeQuantum);
    setValidationError(err);
    if (!err) {
      onRunSimulation();
    }
  };

  const currentError =
    validationError || validateCurrentInputs(processes, selectedAlgorithms, timeQuantum);

  return (
    <div className="workspace-grid">
      {/* Left Column: Process Workload Table & Presets */}
      <section className="panel" aria-labelledby="workload-heading">
        <div className="panel-header">
          <div>
            <h2 id="workload-heading">Process Workload Table</h2>
            <p className="panel-subtitle">
              Configure process arrival times, CPU burst durations, and priority levels (smaller number = higher priority).
            </p>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAddProcess}
            >
              + Add Process
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setValidationError(null);
                onResetWorkspace();
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Presets Bar */}
        <div className="presets-bar">
          <label htmlFor="preset-select" className="field-label">
            Load Sample Workload Preset:
          </label>
          <div className="preset-pills">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`preset-pill ${
                  selectedPresetId === preset.id ? 'preset-pill-active' : ''
                }`}
                onClick={() => {
                  setValidationError(null);
                  onLoadPreset(preset);
                }}
                title={preset.description}
              >
                <span className="preset-category">{preset.category}</span>
                <span className="preset-name">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {processes.length === 0 ? (
          <div className="empty-banner">
            <p>No processes in the current workload.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddProcess}
            >
              Add First Process
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table" aria-label="Process Input Table">
              <thead>
                <tr>
                  <th>PID</th>
                  <th>Arrival Time (AT ≥ 0)</th>
                  <th>Burst Time (BT &gt; 0)</th>
                  <th>Priority (1 = Highest)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((proc, index) => {
                  const invalidAt = proc.arrival_time < 0;
                  const invalidBt = proc.burst_time <= 0;
                  const invalidPrio = proc.priority <= 0;

                  return (
                    <tr key={`proc-row-${index}`}>
                      <th>
                        <div className="pid-cell">
                          <span
                            className="pid-dot"
                            style={{ backgroundColor: getProcessColor(proc.id) }}
                          />
                          <input
                            type="number"
                            min={1}
                            aria-label={`Process ${index + 1} ID`}
                            className="table-input input-pid"
                            value={proc.id}
                            onChange={(e) =>
                              handleFieldChange(index, 'id', e.target.value)
                            }
                          />
                        </div>
                      </th>
                      <td>
                        <input
                          type="number"
                          min={0}
                          aria-label={`Process P${proc.id} Arrival Time`}
                          className={`table-input ${invalidAt ? 'input-invalid' : ''}`}
                          value={proc.arrival_time}
                          onChange={(e) =>
                            handleFieldChange(index, 'arrival_time', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          aria-label={`Process P${proc.id} Burst Time`}
                          className={`table-input ${invalidBt ? 'input-invalid' : ''}`}
                          value={proc.burst_time}
                          onChange={(e) =>
                            handleFieldChange(index, 'burst_time', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          aria-label={`Process P${proc.id} Priority`}
                          className={`table-input ${
                            invalidPrio ? 'input-invalid' : ''
                          }`}
                          value={proc.priority}
                          onChange={(e) =>
                            handleFieldChange(index, 'priority', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-icon-danger"
                          aria-label={`Remove Process P${proc.id}`}
                          onClick={() => handleRemoveProcess(index)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {currentError && (
          <div className="validation-alert" role="alert">
            <strong>Validation Error:</strong> {currentError}
          </div>
        )}
      </section>

      {/* Right Column: Algorithm & Objective Configuration */}
      <form className="panel config-panel" onSubmit={handleSubmit}>
        <div className="panel-header">
          <div>
            <h2>Simulation Configuration</h2>
            <p className="panel-subtitle">
              Choose scheduling policies, Round Robin quantum, and optimization goal.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onSelectAllAlgorithms}
          >
            Select All 6
          </button>
        </div>

        <div className="algorithm-grid" role="group" aria-label="Scheduling Algorithms">
          {ALGORITHM_CATALOG.map((alg) => {
            const isSelected = selectedAlgorithms.includes(alg.id);
            return (
              <label
                key={alg.id}
                className={`alg-card ${isSelected ? 'alg-card-selected' : ''}`}
              >
                <div className="alg-card-top">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleAlgorithm(alg.id)}
                  />
                  <span className="alg-title">{alg.name}</span>
                  <span
                    className={`alg-badge ${
                      alg.preemptive ? 'badge-preemptive' : 'badge-nonpreemptive'
                    }`}
                  >
                    {alg.preemptive ? 'Preemptive' : 'Non-Preemptive'}
                  </span>
                </div>
                <p className="alg-desc">{alg.description}</p>
              </label>
            );
          })}
        </div>

        {selectedAlgorithms.includes('RR') && (
          <div className="form-group quantum-box">
            <label htmlFor="rr-quantum-input" className="field-label">
              Round Robin Time Quantum (Q &gt; 0):
            </label>
            <input
              id="rr-quantum-input"
              type="number"
              min={1}
              max={1000}
              className={`table-input ${timeQuantum <= 0 ? 'input-invalid' : ''}`}
              value={timeQuantum}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onChangeQuantum(Number.isNaN(val) ? 0 : val);
              }}
            />
            <span className="field-hint">
              Time slice allocated to each ready process before preemption.
            </span>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="objective-select" className="field-label">
            Optimization Objective (for Comparison &amp; AI Insights):
          </label>
          <select
            id="objective-select"
            className="select-input"
            value={objective}
            onChange={(e) => onChangeObjective(e.target.value as ObjectiveType)}
          >
            <option value="waiting_time">Minimize Average Waiting Time (WT)</option>
            <option value="turnaround_time">
              Minimize Average Turnaround Time (TAT)
            </option>
            <option value="response_time">Minimize Average Response Time (RT)</option>
          </select>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-run"
          disabled={loading || Boolean(currentError)}
        >
          {loading ? 'Running C++ Simulation Engine...' : 'Run Simulation & Verify'}
        </button>
      </form>
    </div>
  );
};

