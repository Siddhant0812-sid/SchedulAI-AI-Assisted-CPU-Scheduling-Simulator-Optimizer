import json
import os
import subprocess
from pathlib import Path
from typing import List, Optional
from ..schemas.scheduling import (
    AlgorithmResultOutput,
    ProcessInput,
    AlgorithmId,
)


class EngineError(Exception):
    """Raised when the C++ scheduling engine is missing, times out, or returns an error."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def get_engine_binary_path() -> Path:
    env_path = os.environ.get("SCHEDULAI_ENGINE_PATH")
    if env_path:
        return Path(env_path)

    cpp_dir = Path(__file__).resolve().parent.parent.parent / "cpp"
    win_bin = cpp_dir / "scheduler_engine.exe"
    unix_bin = cpp_dir / "scheduler_engine"

    if win_bin.exists():
        return win_bin
    if unix_bin.exists():
        return unix_bin
    return win_bin


def is_engine_available() -> bool:
    path = get_engine_binary_path()
    return path.exists() and path.is_file()


def run_cpp_simulation(
    processes: List[ProcessInput],
    algorithms: List[AlgorithmId],
    time_quantum: int = 2,
    timeout_seconds: float = 5.0,
    engine_path: Optional[Path] = None,
) -> List[AlgorithmResultOutput]:
    binary = engine_path or get_engine_binary_path()
    if not binary.exists() or not binary.is_file():
        raise EngineError(
            "Compiled C++ scheduling engine is not available. Please compile backend/cpp/existing_scheduler.cpp first.",
            status_code=503,
        )

    payload = {
        "processes": [
            {
                "id": p.id,
                "arrival_time": p.arrival_time,
                "burst_time": p.burst_time,
                "priority": p.priority,
            }
            for p in processes
        ],
        "algorithms": list(algorithms),
        "time_quantum": time_quantum,
    }

    try:
        completed = subprocess.run(
            [str(binary), "--json"],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise EngineError(
            "C++ scheduling simulation timed out. Please reduce workload size or burst times.",
            status_code=504,
        ) from exc
    except OSError as exc:
        raise EngineError(
            "Failed to launch the C++ scheduling engine executable.",
            status_code=500,
        ) from exc

    if completed.returncode != 0:
        err_msg = "Scheduling engine rejected the request."
        if completed.stderr:
            try:
                err_data = json.loads(completed.stderr.strip())
                if isinstance(err_data, dict) and "error" in err_data:
                    err_msg = str(err_data["error"])
            except json.JSONDecodeError:
                pass
        raise EngineError(err_msg, status_code=400)

    try:
        data = json.loads(completed.stdout)
        if not isinstance(data, dict) or "results" not in data:
            raise ValueError("Missing 'results' field in engine output.")
        return [AlgorithmResultOutput.model_validate(item) for item in data["results"]]
    except Exception as exc:
        raise EngineError(
            "Received malformed output from the C++ scheduling engine.",
            status_code=500,
        ) from exc

