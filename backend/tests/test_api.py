import subprocess
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.engine import run_cpp_simulation, EngineError
from backend.app.schemas.scheduling import ProcessInput

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["engine_available"] is True


def test_presets_endpoint():
    response = client.get("/api/presets")
    assert response.status_code == 200
    presets = response.json()
    assert isinstance(presets, list)
    assert len(presets) >= 5
    for preset in presets:
        assert "id" in preset
        assert "name" in preset
        assert "processes" in preset
        assert len(preset["processes"]) > 0


def test_simulate_all_six_algorithms():
    payload = {
        "processes": [
            {"id": 1, "arrival_time": 0, "burst_time": 6, "priority": 2},
            {"id": 2, "arrival_time": 1, "burst_time": 4, "priority": 1},
            {"id": 3, "arrival_time": 2, "burst_time": 8, "priority": 3},
        ],
        "algorithms": ["FCFS", "SJF", "SRTF", "PRIORITY", "PREEMPTIVE_PRIORITY", "RR"],
        "time_quantum": 2,
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["time_quantum"] == 2
    assert len(data["results"]) == 6

    by_id = {r["algorithm_id"]: r for r in data["results"]}

    # Verify FCFS vs SRTF vs RR on known workload
    assert abs(by_id["FCFS"]["average_waiting_time"] - 4.3333) < 1e-3
    assert abs(by_id["SRTF"]["average_waiting_time"] - 4.0) < 1e-3
    assert abs(by_id["PREEMPTIVE_PRIORITY"]["average_waiting_time"] - 4.0) < 1e-3
    assert abs(by_id["RR"]["average_waiting_time"] - 7.0) < 1e-3
    assert abs(by_id["RR"]["average_response_time"] - 1.0) < 1e-3

    # Check timeline segments and process metrics structure
    srtf_timeline = by_id["SRTF"]["timeline"]
    assert len(srtf_timeline) == 4
    assert srtf_timeline[0] == {"process_id": 1, "process_name": "P1", "start_time": 0, "end_time": 1}
    assert srtf_timeline[1] == {"process_id": 2, "process_name": "P2", "start_time": 1, "end_time": 5}


def test_simulate_validation_errors():
    # Empty processes
    resp1 = client.post("/api/simulate", json={"processes": []})
    assert resp1.status_code == 422

    # Duplicate process IDs
    resp2 = client.post(
        "/api/simulate",
        json={
            "processes": [
                {"id": 1, "arrival_time": 0, "burst_time": 5, "priority": 1},
                {"id": 1, "arrival_time": 2, "burst_time": 3, "priority": 2},
            ]
        },
    )
    assert resp2.status_code == 422

    # Negative arrival time
    resp3 = client.post(
        "/api/simulate",
        json={"processes": [{"id": 1, "arrival_time": -1, "burst_time": 5, "priority": 1}]},
    )
    assert resp3.status_code == 422

    # Zero burst time
    resp4 = client.post(
        "/api/simulate",
        json={"processes": [{"id": 1, "arrival_time": 0, "burst_time": 0, "priority": 1}]},
    )
    assert resp4.status_code == 422

    # Non-positive quantum
    resp5 = client.post(
        "/api/simulate",
        json={
            "processes": [{"id": 1, "arrival_time": 0, "burst_time": 5, "priority": 1}],
            "time_quantum": 0,
        },
    )
    assert resp5.status_code == 422


def test_recommend_waiting_time_vs_response_time():
    workload = [
        {"id": 1, "arrival_time": 0, "burst_time": 6, "priority": 2},
        {"id": 2, "arrival_time": 1, "burst_time": 4, "priority": 1},
        {"id": 3, "arrival_time": 2, "burst_time": 8, "priority": 3},
    ]

    # Objective 1: Minimize waiting time -> SRTF and Preemptive Priority tie at 4.0
    resp_wt = client.post(
        "/api/recommend",
        json={
            "processes": workload,
            "objective": "waiting_time",
            "time_quantum": 2,
        },
    )
    assert resp_wt.status_code == 200
    data_wt = resp_wt.json()
    assert data_wt["objective"] == "waiting_time"
    assert abs(data_wt["measured_objective_value"] - 4.0) < 1e-4
    assert data_wt["recommended_algorithm_id"] in ("SRTF", "PREEMPTIVE_PRIORITY")
    assert len(data_wt["tied_algorithms"]) == 2
    assert "simulation-backed optimizer" in data_wt["explanation"].lower()

    # Objective 2: Minimize response time -> Round Robin wins at 1.0
    resp_rt = client.post(
        "/api/recommend",
        json={
            "processes": workload,
            "objective": "response_time",
            "time_quantum": 2,
        },
    )
    assert resp_rt.status_code == 200
    data_rt = resp_rt.json()
    assert data_rt["objective"] == "response_time"
    assert data_rt["recommended_algorithm_id"] == "RR"
    assert abs(data_rt["measured_objective_value"] - 1.0) < 1e-4
    assert data_rt["candidate_matched_measured_best"] is True


def test_csv_export_endpoint():
    payload = {
        "processes": [
            {"id": 1, "arrival_time": 0, "burst_time": 5, "priority": 1},
            {"id": 2, "arrival_time": 2, "burst_time": 3, "priority": 2},
        ],
        "algorithms": ["FCFS", "SJF", "RR"],
        "time_quantum": 2,
    }
    response = client.post("/api/export/csv", json=payload)
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "schedulai_results.csv" in response.headers.get("content-disposition", "")

    csv_text = response.text
    assert "# SchedulAI - Algorithm Comparison Summary" in csv_text
    assert "# Per-Process Scheduling Metrics" in csv_text
    assert "# Gantt Chart Execution Segments" in csv_text
    assert "FCFS" in csv_text
    assert "Round Robin" in csv_text


def test_engine_missing_executable_handling():
    with pytest.raises(EngineError) as exc_info:
        run_cpp_simulation(
            processes=[ProcessInput(id=1, arrival_time=0, burst_time=4, priority=1)],
            algorithms=["FCFS"],
            engine_path=Path("non_existent_binary_12345.exe"),
        )
    assert exc_info.value.status_code == 503


def test_engine_timeout_handling():
    with patch("backend.app.services.engine.subprocess.run") as mock_run:
        mock_run.side_effect = subprocess.TimeoutExpired(cmd="scheduler_engine.exe", timeout=1.0)
        with pytest.raises(EngineError) as exc_info:
            run_cpp_simulation(
                processes=[ProcessInput(id=1, arrival_time=0, burst_time=4, priority=1)],
                algorithms=["FCFS"],
                timeout_seconds=1.0,
            )
        assert exc_info.value.status_code == 504


def test_engine_malformed_json_handling():
    with patch("backend.app.services.engine.subprocess.run") as mock_run:
        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.stdout = "NOT VALID JSON {"
        mock_proc.stderr = ""
        mock_run.return_value = mock_proc

        with pytest.raises(EngineError) as exc_info:
            run_cpp_simulation(
                processes=[ProcessInput(id=1, arrival_time=0, burst_time=4, priority=1)],
                algorithms=["FCFS"],
            )
        assert exc_info.value.status_code == 500

