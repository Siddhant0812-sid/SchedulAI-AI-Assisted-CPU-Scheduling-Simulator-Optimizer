import {
  AlgorithmId,
  ObjectiveType,
  PresetWorkload,
  ProcessInput,
  RecommendationResponse,
  SimulationResponse,
} from '../types/scheduling';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function handleJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errBody = await response.json();
      if (typeof errBody.detail === 'string') {
        errorMessage = errBody.detail;
      } else if (Array.isArray(errBody.detail) && errBody.detail.length > 0) {
        errorMessage = errBody.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join('; ');
      }
    } catch {
      // Ignore JSON parse error on non-JSON failure body
    }
    throw new Error(errorMessage);
  }
  return response.json() as Promise<T>;
}

export async function checkApiHealth(): Promise<{
  status: string;
  engine_available: boolean;
}> {
  const res = await fetch(`${API_BASE}/api/health`);
  return handleJsonResponse(res);
}

export async function fetchPresets(): Promise<PresetWorkload[]> {
  const res = await fetch(`${API_BASE}/api/presets`);
  return handleJsonResponse(res);
}

export async function runSimulation(
  processes: ProcessInput[],
  algorithms: AlgorithmId[],
  timeQuantum: number
): Promise<SimulationResponse> {
  const res = await fetch(`${API_BASE}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      processes,
      algorithms,
      time_quantum: timeQuantum,
    }),
  });
  return handleJsonResponse(res);
}

export async function fetchRecommendation(
  processes: ProcessInput[],
  objective: ObjectiveType,
  algorithms: AlgorithmId[],
  timeQuantum: number
): Promise<RecommendationResponse> {
  const res = await fetch(`${API_BASE}/api/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      processes,
      objective,
      algorithms,
      time_quantum: timeQuantum,
    }),
  });
  return handleJsonResponse(res);
}

export async function downloadSimulationCsv(
  processes: ProcessInput[],
  algorithms: AlgorithmId[],
  timeQuantum: number
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/export/csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      processes,
      algorithms,
      time_quantum: timeQuantum,
    }),
  });

  if (!res.ok) {
    throw new Error(`CSV export failed (HTTP ${res.status})`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'schedulai_results.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

