from typing import List
from ..schemas.scheduling import PresetWorkload, ProcessInput

PRESET_WORKLOADS: List[PresetWorkload] = [
    PresetWorkload(
        id="mixed-preemption",
        name="Preemption & Priority Showcase",
        category="Preemption",
        description="Demonstrates how SRTF and Preemptive Priority preempt a running job when a shorter or higher-priority process arrives.",
        recommended_quantum=2,
        processes=[
            ProcessInput(id=1, arrival_time=0, burst_time=6, priority=2),
            ProcessInput(id=2, arrival_time=1, burst_time=4, priority=1),
            ProcessInput(id=3, arrival_time=2, burst_time=8, priority=3),
            ProcessInput(id=4, arrival_time=3, burst_time=2, priority=1),
        ],
    ),
    PresetWorkload(
        id="simultaneous-arrivals",
        name="Simultaneous Batch Arrivals",
        category="Batch",
        description="All processes arrive at time 0 with varying burst lengths and priorities, highlighting non-preemptive vs round-robin ordering.",
        recommended_quantum=3,
        processes=[
            ProcessInput(id=1, arrival_time=0, burst_time=10, priority=3),
            ProcessInput(id=2, arrival_time=0, burst_time=3, priority=1),
            ProcessInput(id=3, arrival_time=0, burst_time=5, priority=2),
            ProcessInput(id=4, arrival_time=0, burst_time=2, priority=4),
        ],
    ),
    PresetWorkload(
        id="convoy-effect",
        name="FCFS Convoy Effect",
        category="Short & Long Mix",
        description="A long CPU-bound process arrives just before several short interactive jobs, illustrating the classic FCFS convoy effect vs SJF/SRTF.",
        recommended_quantum=2,
        processes=[
            ProcessInput(id=1, arrival_time=0, burst_time=16, priority=3),
            ProcessInput(id=2, arrival_time=1, burst_time=2, priority=2),
            ProcessInput(id=3, arrival_time=2, burst_time=3, priority=1),
            ProcessInput(id=4, arrival_time=3, burst_time=1, priority=2),
        ],
    ),
    PresetWorkload(
        id="cpu-idle-gaps",
        name="Sparse Arrivals with CPU Idle Gaps",
        category="Idle Periods",
        description="Processes arrive after an initial delay and leave an idle gap mid-schedule, testing idle timeline segments and response times.",
        recommended_quantum=2,
        processes=[
            ProcessInput(id=1, arrival_time=2, burst_time=3, priority=2),
            ProcessInput(id=2, arrival_time=8, burst_time=4, priority=1),
            ProcessInput(id=3, arrival_time=10, burst_time=2, priority=3),
        ],
    ),
    PresetWorkload(
        id="priority-vs-srtf",
        name="Priority vs Remaining Time Conflict",
        category="Priority Levels",
        description="Contrasts SRTF (favors short jobs) with Preemptive Priority (favors critical priority=1 jobs even when their burst is longer).",
        recommended_quantum=2,
        processes=[
            ProcessInput(id=1, arrival_time=0, burst_time=4, priority=3),
            ProcessInput(id=2, arrival_time=1, burst_time=7, priority=1),
            ProcessInput(id=3, arrival_time=2, burst_time=2, priority=2),
        ],
    ),
    PresetWorkload(
        id="round-robin-quantum",
        name="Interactive Time-Sharing (Round Robin)",
        category="Round Robin",
        description="Staggered interactive arrivals designed for comparing fast first-response times in Round Robin against turnaround time in SJF/SRTF.",
        recommended_quantum=2,
        processes=[
            ProcessInput(id=1, arrival_time=0, burst_time=5, priority=2),
            ProcessInput(id=2, arrival_time=1, burst_time=4, priority=2),
            ProcessInput(id=3, arrival_time=2, burst_time=3, priority=1),
            ProcessInput(id=4, arrival_time=4, burst_time=6, priority=3),
        ],
    ),
]


def get_presets() -> List[PresetWorkload]:
    return PRESET_WORKLOADS

