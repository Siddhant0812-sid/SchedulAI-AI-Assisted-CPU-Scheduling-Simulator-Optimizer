import csv
import io
from typing import List
from ..schemas.scheduling import AlgorithmResultOutput


def generate_simulation_csv(results: List[AlgorithmResultOutput], time_quantum: int) -> str:
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")

    # Section 1: Algorithm Summary Comparison
    writer.writerow(["# SchedulAI - Algorithm Comparison Summary"])
    writer.writerow([
        "Algorithm ID",
        "Algorithm Name",
        "Time Quantum",
        "Avg Waiting Time",
        "Avg Turnaround Time",
        "Avg Response Time",
        "Throughput (proc/unit)",
    ])

    for r in results:
        q_val = str(time_quantum) if r.algorithm_id == "RR" else "N/A"
        writer.writerow([
            r.algorithm_id,
            r.algorithm_name,
            q_val,
            f"{r.average_waiting_time:.4f}",
            f"{r.average_turnaround_time:.4f}",
            f"{r.average_response_time:.4f}",
            f"{r.throughput:.4f}",
        ])

    writer.writerow([])

    # Section 2: Per-Process Metrics for Each Algorithm
    writer.writerow(["# Per-Process Scheduling Metrics"])
    writer.writerow([
        "Algorithm ID",
        "Algorithm Name",
        "Process ID",
        "Arrival Time",
        "Burst Time",
        "Priority",
        "Completion Time",
        "Turnaround Time",
        "Waiting Time",
        "Response Time",
    ])

    for r in results:
        for p in r.process_metrics:
            writer.writerow([
                r.algorithm_id,
                r.algorithm_name,
                f"P{p.id}",
                p.arrival_time,
                p.burst_time,
                p.priority,
                p.completion_time,
                p.turnaround_time,
                p.waiting_time,
                p.response_time,
            ])

    writer.writerow([])

    # Section 3: Gantt Timeline Segments
    writer.writerow(["# Gantt Chart Execution Segments"])
    writer.writerow([
        "Algorithm ID",
        "Segment Label",
        "Process ID",
        "Start Time",
        "End Time",
        "Duration",
    ])

    for r in results:
        for seg in r.timeline:
            writer.writerow([
                r.algorithm_id,
                seg.process_name,
                seg.process_id if seg.process_id is not None else "IDLE",
                seg.start_time,
                seg.end_time,
                seg.end_time - seg.start_time,
            ])

    return output.getvalue()

