from typing import List
from fastapi import APIRouter, HTTPException, Response
from ..schemas.scheduling import (
    PresetWorkload,
    RecommendationRequest,
    RecommendationResponse,
    SimulationRequest,
    SimulationResponse,
)
from ..services.engine import EngineError, is_engine_available, run_cpp_simulation
from ..services.presets import get_presets
from ..services.csv_export import generate_simulation_csv
from ..recommendations.optimizer import build_recommendation

router = APIRouter(prefix="/api", tags=["Scheduling Simulator"])


@router.get("/health")
def health_check():
    engine_ok = is_engine_available()
    return {
        "status": "ok" if engine_ok else "degraded",
        "engine_available": engine_ok,
        "service": "SchedulAI Backend API",
    }


@router.get("/presets", response_model=List[PresetWorkload])
def list_presets():
    return get_presets()


@router.post("/simulate", response_model=SimulationResponse)
def simulate_workload(request: SimulationRequest):
    try:
        results = run_cpp_simulation(
            processes=request.processes,
            algorithms=request.algorithms,
            time_quantum=request.time_quantum,
        )
        return SimulationResponse(
            results=results,
            time_quantum=request.time_quantum,
        )
    except EngineError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/recommend", response_model=RecommendationResponse)
def recommend_algorithm(request: RecommendationRequest):
    try:
        results = run_cpp_simulation(
            processes=request.processes,
            algorithms=request.algorithms,
            time_quantum=request.time_quantum,
        )
        return build_recommendation(
            processes=request.processes,
            results=results,
            objective=request.objective,
            time_quantum=request.time_quantum,
        )
    except EngineError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/export/csv")
def export_csv(request: SimulationRequest):
    try:
        results = run_cpp_simulation(
            processes=request.processes,
            algorithms=request.algorithms,
            time_quantum=request.time_quantum,
        )
        csv_content = generate_simulation_csv(results, request.time_quantum)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": 'attachment; filename="schedulai_results.csv"'
            },
        )
    except EngineError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

