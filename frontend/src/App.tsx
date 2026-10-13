import React, { useEffect, useState } from 'react';
import {
  ALGORITHM_CATALOG,
  AlgorithmId,
  AlgorithmResultOutput,
  ObjectiveType,
  PresetWorkload,
  ProcessInput,
  RecommendationResponse,
} from './types/scheduling';
import {
  checkApiHealth,
  downloadSimulationCsv,
  fetchPresets,
  fetchRecommendation,
  runSimulation,
} from './services/api';
import { WorkspaceSection } from './components/WorkspaceSection';
import { ComparisonSection } from './components/ComparisonSection';
import { ProcessExplorerSection } from './components/ProcessExplorerSection';
import { AiInsightsSection } from './components/AiInsightsSection';

type ActiveTab = 'workspace' | 'comparison' | 'explorer' | 'insights';

const DEFAULT_PROCESSES: ProcessInput[] = [
  { id: 1, arrival_time: 0, burst_time: 6, priority: 2 },
  { id: 2, arrival_time: 1, burst_time: 4, priority: 1 },
  { id: 3, arrival_time: 2, burst_time: 8, priority: 3 },
  { id: 4, arrival_time: 3, burst_time: 2, priority: 1 },
];

const FALLBACK_PRESETS: PresetWorkload[] = [
  {
    id: 'mixed-preemption',
    name: 'Preemption & Priority Showcase',
    category: 'Preemption',
    description:
      'Demonstrates how SRTF and Preemptive Priority preempt a running job when a shorter or higher-priority process arrives.',
    recommended_quantum: 2,
    processes: DEFAULT_PROCESSES,
  },
  {
    id: 'simultaneous-arrivals',
    name: 'Simultaneous Batch Arrivals',
    category: 'Batch',
    description:
      'All processes arrive at time 0 with varying burst lengths and priorities.',
    recommended_quantum: 3,
    processes: [
      { id: 1, arrival_time: 0, burst_time: 10, priority: 3 },
      { id: 2, arrival_time: 0, burst_time: 3, priority: 1 },
      { id: 3, arrival_time: 0, burst_time: 5, priority: 2 },
      { id: 4, arrival_time: 0, burst_time: 2, priority: 4 },
    ],
  },
  {
    id: 'cpu-idle-gaps',
    name: 'Sparse Arrivals with CPU Idle Gaps',
    category: 'Idle Periods',
    description:
      'Processes arrive after an initial delay and leave an idle gap mid-schedule.',
    recommended_quantum: 2,
    processes: [
      { id: 1, arrival_time: 2, burst_time: 3, priority: 2 },
      { id: 2, arrival_time: 8, burst_time: 4, priority: 1 },
      { id: 3, arrival_time: 10, burst_time: 2, priority: 3 },
    ],
  },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('workspace');
  const [processes, setProcesses] = useState<ProcessInput[]>(DEFAULT_PROCESSES);
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<AlgorithmId[]>(
    ALGORITHM_CATALOG.map((a) => a.id)
  );
  const [timeQuantum, setTimeQuantum] = useState<number>(2);
  const [objective, setObjective] = useState<ObjectiveType>('waiting_time');
  const [presets, setPresets] = useState<PresetWorkload[]>(FALLBACK_PRESETS);
  const [selectedPresetId, setSelectedPresetId] =
    useState<string>('mixed-preemption');

  const [results, setResults] = useState<AlgorithmResultOutput[]>([]);
  const [recommendation, setRecommendation] =
    useState<RecommendationResponse | null>(null);
  const [highlightProcessId, setHighlightProcessId] = useState<number | null>(
    null
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [engineOnline, setEngineOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    checkApiHealth()
      .then((status) => {
        if (mounted) setEngineOnline(status.engine_available);
      })
      .catch(() => {
        if (mounted) setEngineOnline(false);
      });

    fetchPresets()
      .then((list) => {
        if (mounted && list.length > 0) {
          setPresets(list);
        }
      })
      .catch(() => {
        // Keep local fallback presets if backend is unreachable on initial load
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleAlgorithm = (algId: AlgorithmId) => {
    setSelectedAlgorithms((prev) =>
      prev.includes(algId) ? prev.filter((a) => a !== algId) : [...prev, algId]
    );
  };

  const handleSelectAllAlgorithms = () => {
    setSelectedAlgorithms(ALGORITHM_CATALOG.map((a) => a.id));
  };

  const handleLoadPreset = (preset: PresetWorkload) => {
    setSelectedPresetId(preset.id);
    setProcesses(preset.processes.map((p) => ({ ...p })));
    setTimeQuantum(preset.recommended_quantum);
    setErrorMessage(null);
  };

  const handleResetWorkspace = () => {
    setSelectedPresetId('mixed-preemption');
    setProcesses(DEFAULT_PROCESSES.map((p) => ({ ...p })));
    setSelectedAlgorithms(ALGORITHM_CATALOG.map((a) => a.id));
    setTimeQuantum(2);
    setObjective('waiting_time');
    setResults([]);
    setRecommendation(null);
    setHighlightProcessId(null);
    setErrorMessage(null);
  };

  const executeSimulationAndRecommendation = async (
    targetObjective: ObjectiveType = objective
  ) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [simRes, recRes] = await Promise.all([
        runSimulation(processes, selectedAlgorithms, timeQuantum),
        fetchRecommendation(
          processes,
          targetObjective,
          selectedAlgorithms,
          timeQuantum
        ),
      ]);
      setResults(simRes.results);
      setRecommendation(recRes);
      setEngineOnline(true);
      if (activeTab === 'workspace') {
        setActiveTab('comparison');
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to communicate with the scheduling backend.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleObjectiveChange = async (newObj: ObjectiveType) => {
    setObjective(newObj);
    if (results.length > 0) {
      setLoading(true);
      setErrorMessage(null);
      try {
        const recRes = await fetchRecommendation(
          processes,
          newObj,
          selectedAlgorithms,
          timeQuantum
        );
        setRecommendation(recRes);
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Failed to update recommendation objective.'
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExportCsv = async () => {
    try {
      await downloadSimulationCsv(processes, selectedAlgorithms, timeQuantum);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to export CSV.'
      );
    }
  };

  return (
    <div className="app-shell">
      {/* Top Application Header */}
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-logo" aria-hidden="true">
            CPU
          </div>
          <div>
            <h1 className="brand-title">SchedulAI</h1>
            <p className="brand-subtitle">
              AI-Assisted CPU Scheduling Simulator &amp; C++17 Verification Engine
            </p>
          </div>
        </div>

        <nav className="main-nav" aria-label="Primary Navigation">
          <button
            type="button"
            className={`nav-tab ${
              activeTab === 'workspace' ? 'nav-tab-active' : ''
            }`}
            onClick={() => setActiveTab('workspace')}
          >
            1. Workspace
          </button>
          <button
            type="button"
            className={`nav-tab ${
              activeTab === 'comparison' ? 'nav-tab-active' : ''
            }`}
            onClick={() => setActiveTab('comparison')}
          >
            2. Comparison
            {results.length > 0 && (
              <span className="nav-count">{results.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`nav-tab ${
              activeTab === 'explorer' ? 'nav-tab-active' : ''
            }`}
            onClick={() => setActiveTab('explorer')}
          >
            3. Process Explorer
          </button>
          <button
            type="button"
            className={`nav-tab ${
              activeTab === 'insights' ? 'nav-tab-active' : ''
            }`}
            onClick={() => setActiveTab('insights')}
          >
            4. AI Insights
          </button>
        </nav>

        <div className="header-status">
          <span
            className={`engine-indicator ${
              engineOnline === true
                ? 'engine-online'
                : engineOnline === false
                ? 'engine-offline'
                : 'engine-checking'
            }`}
          >
            <span className="status-dot" />
            {engineOnline === true
              ? 'C++17 Engine Ready'
              : engineOnline === false
              ? 'Backend Offline'
              : 'Checking Engine...'}
          </span>
        </div>
      </header>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="error-toast" role="alert">
          <div>
            <strong>Simulation Error:</strong> {errorMessage}
          </div>
          <div className="toast-actions">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => executeSimulationAndRecommendation(objective)}
            >
              Retry
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setErrorMessage(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="main-content">
        {activeTab === 'workspace' && (
          <WorkspaceSection
            processes={processes}
            selectedAlgorithms={selectedAlgorithms}
            timeQuantum={timeQuantum}
            objective={objective}
            presets={presets}
            selectedPresetId={selectedPresetId}
            loading={loading}
            onUpdateProcesses={(list) => {
              setSelectedPresetId('custom');
              setProcesses(list);
            }}
            onToggleAlgorithm={handleToggleAlgorithm}
            onSelectAllAlgorithms={handleSelectAllAlgorithms}
            onChangeQuantum={setTimeQuantum}
            onChangeObjective={handleObjectiveChange}
            onLoadPreset={handleLoadPreset}
            onRunSimulation={() => executeSimulationAndRecommendation(objective)}
            onResetWorkspace={handleResetWorkspace}
          />
        )}

        {activeTab === 'comparison' && (
          <ComparisonSection
            results={results}
            objective={objective}
            timeQuantum={timeQuantum}
            highlightProcessId={highlightProcessId}
            onChangeObjective={handleObjectiveChange}
            onSelectProcess={(pid) => setHighlightProcessId(pid)}
            onExportCsv={handleExportCsv}
          />
        )}

        {activeTab === 'explorer' && (
          <ProcessExplorerSection
            results={results}
            selectedProcessId={highlightProcessId}
            onSelectProcess={(pid) => setHighlightProcessId(pid)}
          />
        )}

        {activeTab === 'insights' && (
          <AiInsightsSection
            recommendation={recommendation}
            objective={objective}
            loading={loading}
            onChangeObjective={handleObjectiveChange}
          />
        )}
      </main>
    </div>
  );
};

export default App;

