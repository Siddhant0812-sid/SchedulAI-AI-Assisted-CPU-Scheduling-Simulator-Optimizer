#define SCHEDULAI_NO_MAIN
#include "../existing_scheduler.cpp"
#include <cassert>
#include <cmath>
#include <iostream>

bool approxEqual(double a, double b, double eps = 1e-6) {
    return std::fabs(a - b) <= eps;
}

void assertSegment(const Segment& seg, int expectedPid, const string& expectedName, int expectedStart, int expectedEnd) {
    assert(seg.processId == expectedPid);
    assert(seg.processName == expectedName);
    assert(seg.startTime == expectedStart);
    assert(seg.endTime == expectedEnd);
}

void assertProcessMetrics(const Process& p, int id, int ct, int tat, int wt, int rt) {
    assert(p.id == id);
    assert(p.completionTime == ct);
    assert(p.turnaroundTime == tat);
    assert(p.waitingTime == wt);
    assert(p.responseTime == rt);
}

// 1. Test Single Process Workload across all 6 algorithms
void testSingleProcess() {
    vector<Process> workload = {
        {1, 2, 5, 1}
    };

    auto r_fcfs = fcfs(workload);
    auto r_sjf = sjf(workload);
    auto r_prio = priorityScheduling(workload);
    auto r_pprio = preemptivePriorityScheduling(workload);
    auto r_srtf = srtf(workload);
    auto r_rr = roundRobin(workload, 2);

    vector<SchedulingResult> all = {r_fcfs, r_sjf, r_prio, r_pprio, r_srtf, r_rr};
    for (const auto& res : all) {
        assert(res.processes.size() == 1);
        assertProcessMetrics(res.processes[0], 1, 7, 5, 0, 0);
        assert(approxEqual(res.averageWaitingTime, 0.0));
        assert(approxEqual(res.averageTurnaroundTime, 5.0));
        assert(approxEqual(res.averageResponseTime, 0.0));
        // Timeline should have Idle [0, 2] and P1 [2, 7] (merged even for RR!)
        assert(res.timeline.size() == 2);
        assertSegment(res.timeline[0], -1, "Idle", 0, 2);
        assertSegment(res.timeline[1], 1, "P1", 2, 7);
    }
    cout << "[PASS] testSingleProcess\n";
}

// 2. Test Preemption and Response Time Preservation (SRTF & Preemptive Priority)
void testPreemptionAndResponseTime() {
    // P1 arrives at 0, burst 6, priority 2
    // P2 arrives at 1, burst 4, priority 1 (shorter AND higher priority -> preempts P1 at t=1)
    // P3 arrives at 2, burst 8, priority 3
    vector<Process> workload = {
        {1, 0, 6, 2},
        {2, 1, 4, 1},
        {3, 2, 8, 3}
    };

    // Non-preemptive Priority: P1 [0,6], P2 [6,10], P3 [10,18]
    auto r_prio = priorityScheduling(workload);
    assertProcessMetrics(r_prio.processes[0], 1, 6, 6, 0, 0);
    assertProcessMetrics(r_prio.processes[1], 2, 10, 9, 5, 5);
    assertProcessMetrics(r_prio.processes[2], 3, 18, 16, 8, 8);
    assert(r_prio.timeline.size() == 3);
    assertSegment(r_prio.timeline[0], 1, "P1", 0, 6);
    assertSegment(r_prio.timeline[1], 2, "P2", 6, 10);
    assertSegment(r_prio.timeline[2], 3, "P3", 10, 18);

    // Preemptive Priority: P1 [0,1], P2 [1,5], P1 [5,10], P3 [10,18]
    // Notice P1 response time MUST be 0 (started at t=0), NOT 5!
    auto r_pprio = preemptivePriorityScheduling(workload);
    assertProcessMetrics(r_pprio.processes[0], 1, 10, 10, 4, 0);
    assertProcessMetrics(r_pprio.processes[1], 2, 5, 4, 0, 0);
    assertProcessMetrics(r_pprio.processes[2], 3, 18, 16, 8, 8);
    assert(approxEqual(r_pprio.averageWaitingTime, 4.0));
    assert(approxEqual(r_pprio.averageTurnaroundTime, 10.0));
    assert(approxEqual(r_pprio.averageResponseTime, 8.0 / 3.0));
    assert(r_pprio.timeline.size() == 4);
    assertSegment(r_pprio.timeline[0], 1, "P1", 0, 1);
    assertSegment(r_pprio.timeline[1], 2, "P2", 1, 5);
    assertSegment(r_pprio.timeline[2], 1, "P1", 5, 10);
    assertSegment(r_pprio.timeline[3], 3, "P3", 10, 18);

    // SRTF: P1 [0,1] (rem 5), P2 arrives at 1 with burst 4 < 5 -> P2 [1,5], P1 [5,10], P3 [10,18]
    auto r_srtf = srtf(workload);
    assertProcessMetrics(r_srtf.processes[0], 1, 10, 10, 4, 0);
    assertProcessMetrics(r_srtf.processes[1], 2, 5, 4, 0, 0);
    assertProcessMetrics(r_srtf.processes[2], 3, 18, 16, 8, 8);
    assert(r_srtf.timeline.size() == 4);

    cout << "[PASS] testPreemptionAndResponseTime\n";
}

// 3. Test SRTF vs Preemptive Priority Distinction
void testSrtfVsPreemptivePriorityDistinction() {
    // P1: AT=0, BT=4, Priority=3 (short job, low priority)
    // P2: AT=1, BT=6, Priority=1 (long job, high priority)
    vector<Process> workload = {
        {1, 0, 4, 3},
        {2, 1, 6, 1}
    };

    // SRTF keeps P1 running because remainingTime(P1)=3 < burstTime(P2)=6
    auto r_srtf = srtf(workload);
    assert(r_srtf.timeline.size() == 2);
    assertSegment(r_srtf.timeline[0], 1, "P1", 0, 4);
    assertSegment(r_srtf.timeline[1], 2, "P2", 4, 10);

    // Preemptive Priority preempts P1 at t=1 because priority(P2)=1 < priority(P1)=3
    auto r_pprio = preemptivePriorityScheduling(workload);
    assert(r_pprio.timeline.size() == 3);
    assertSegment(r_pprio.timeline[0], 1, "P1", 0, 1);
    assertSegment(r_pprio.timeline[1], 2, "P2", 1, 7);
    assertSegment(r_pprio.timeline[2], 1, "P1", 7, 10);
    assertProcessMetrics(r_pprio.processes[0], 1, 10, 10, 6, 0); // RT of P1 is still 0
    assertProcessMetrics(r_pprio.processes[1], 2, 7, 6, 0, 0);   // RT of P2 is 1 - 1 = 0

    cout << "[PASS] testSrtfVsPreemptivePriorityDistinction\n";
}

// 4. Test CPU Idle Intervals (initial idle + mid-schedule idle gap)
void testCpuIdleGaps() {
    vector<Process> workload = {
        {1, 2, 3, 2}, // runs [2, 5]
        {2, 8, 4, 1}  // arrives at 8, runs [8, 12]; CPU idle [0,2] and [5,8]
    };

    auto r_fcfs = fcfs(workload);
    auto r_sjf = sjf(workload);
    auto r_prio = priorityScheduling(workload);
    auto r_pprio = preemptivePriorityScheduling(workload);
    auto r_srtf = srtf(workload);
    auto r_rr = roundRobin(workload, 2);

    vector<SchedulingResult> all = {r_fcfs, r_sjf, r_prio, r_pprio, r_srtf, r_rr};
    for (const auto& res : all) {
        assert(res.timeline.size() == 4);
        assertSegment(res.timeline[0], -1, "Idle", 0, 2);
        assertSegment(res.timeline[1], 1, "P1", 2, 5);
        assertSegment(res.timeline[2], -1, "Idle", 5, 8);
        assertSegment(res.timeline[3], 2, "P2", 8, 12);
        assertProcessMetrics(res.processes[0], 1, 5, 3, 0, 0);
        assertProcessMetrics(res.processes[1], 2, 12, 4, 0, 0);
    }
    cout << "[PASS] testCpuIdleGaps\n";
}

// 5. Test Deterministic Tie-Breaking Regardless of Input Order
void testTieBreakingDeterminism() {
    // Unordered input with identical arrival times, burst times, and priorities
    vector<Process> orderA = {
        {3, 0, 4, 2},
        {1, 0, 4, 2},
        {2, 0, 4, 2}
    };
    vector<Process> orderB = {
        {2, 0, 4, 2},
        {3, 0, 4, 2},
        {1, 0, 4, 2}
    };

    auto fcfsA = fcfs(orderA);
    auto fcfsB = fcfs(orderB);
    auto sjfA = sjf(orderA);
    auto sjfB = sjf(orderB);
    auto prioA = priorityScheduling(orderA);
    auto prioB = priorityScheduling(orderB);
    auto pprioA = preemptivePriorityScheduling(orderA);
    auto pprioB = preemptivePriorityScheduling(orderB);
    auto srtfA = srtf(orderA);
    auto srtfB = srtf(orderB);
    auto rrA = roundRobin(orderA, 2);
    auto rrB = roundRobin(orderB, 2);

    // Every algorithm should execute P1 -> P2 -> P3 deterministically
    vector<pair<SchedulingResult, SchedulingResult>> pairs = {
        {fcfsA, fcfsB}, {sjfA, sjfB}, {prioA, prioB}, {pprioA, pprioB}, {srtfA, srtfB}, {rrA, rrB}
    };

    for (const auto& pr : pairs) {
        assert(pr.first.timeline.size() == pr.second.timeline.size());
        for (size_t i = 0; i < pr.first.timeline.size(); i++) {
            assert(pr.first.timeline[i].processId == pr.second.timeline[i].processId);
            assert(pr.first.timeline[i].startTime == pr.second.timeline[i].startTime);
            assert(pr.first.timeline[i].endTime == pr.second.timeline[i].endTime);
        }
    }

    // Specifically check P1 [0,4], P2 [4,8], P3 [8,12] for non-RR
    assertSegment(sjfA.timeline[0], 1, "P1", 0, 4);
    assertSegment(sjfA.timeline[1], 2, "P2", 4, 8);
    assertSegment(sjfA.timeline[2], 3, "P3", 8, 12);

    cout << "[PASS] testTieBreakingDeterminism\n";
}

// 6. Test Round Robin Queue Ordering at Time-Slice Boundary
void testRoundRobinQueueOrdering() {
    // P1: AT=0, BT=6
    // P2: AT=1, BT=4
    // P3: AT=2, BT=8
    // Quantum = 2
    // At t=0: P1 starts, runs [0,2]. By t=2, P2 (AT=1) and P3 (AT=2) have arrived.
    // P2 and P3 must enter readyQueue BEFORE P1 is re-queued at t=2.
    // Expected segments: P1[0,2], P2[2,4], P3[4,6], P1[6,8], P2[8,10], P3[10,12], P1[12,14], P3[14,18] (merged last two P3 slices [14,16]+[16,18] -> [14,18])
    vector<Process> workload = {
        {1, 0, 6, 2},
        {2, 1, 4, 1},
        {3, 2, 8, 3}
    };

    auto r_rr = roundRobin(workload, 2);
    assertProcessMetrics(r_rr.processes[0], 1, 14, 14, 8, 0);
    assertProcessMetrics(r_rr.processes[1], 2, 10, 9, 5, 1);
    assertProcessMetrics(r_rr.processes[2], 3, 18, 16, 8, 2);
    assert(approxEqual(r_rr.averageWaitingTime, 7.0));
    assert(approxEqual(r_rr.averageTurnaroundTime, 13.0));
    assert(approxEqual(r_rr.averageResponseTime, 1.0));
    assert(r_rr.timeline.size() == 8);
    assertSegment(r_rr.timeline[0], 1, "P1", 0, 2);
    assertSegment(r_rr.timeline[1], 2, "P2", 2, 4);
    assertSegment(r_rr.timeline[2], 3, "P3", 4, 6);
    assertSegment(r_rr.timeline[3], 1, "P1", 6, 8);
    assertSegment(r_rr.timeline[4], 2, "P2", 8, 10);
    assertSegment(r_rr.timeline[5], 3, "P3", 10, 12);
    assertSegment(r_rr.timeline[6], 1, "P1", 12, 14);
    assertSegment(r_rr.timeline[7], 3, "P3", 14, 18);

    cout << "[PASS] testRoundRobinQueueOrdering\n";
}

// 7. Test Input Validation
void testInputValidation() {
    bool caught = false;
    try {
        fcfs({});
    } catch (const invalid_argument&) {
        caught = true;
    }
    assert(caught);

    // Negative arrival time
    caught = false;
    try {
        sjf({{1, -1, 5, 1}});
    } catch (const invalid_argument&) {
        caught = true;
    }
    assert(caught);

    // Zero burst time
    caught = false;
    try {
        srtf({{1, 0, 0, 1}});
    } catch (const invalid_argument&) {
        caught = true;
    }
    assert(caught);

    // Zero priority
    caught = false;
    try {
        priorityScheduling({{1, 0, 5, 0}});
    } catch (const invalid_argument&) {
        caught = true;
    }
    assert(caught);

    // Duplicate IDs
    caught = false;
    try {
        preemptivePriorityScheduling({{1, 0, 5, 1}, {1, 2, 3, 2}});
    } catch (const invalid_argument&) {
        caught = true;
    }
    assert(caught);

    // Non-positive quantum
    caught = false;
    try {
        roundRobin({{1, 0, 5, 1}}, 0);
    } catch (const invalid_argument&) {
        caught = true;
    }
    assert(caught);

    cout << "[PASS] testInputValidation\n";
}

// 8. Test Structured JSON Input/Output Mode
void testJsonSimulation() {
    string jsonReq = R"({
        "processes": [
            {"id": 1, "arrival_time": 0, "burst_time": 6, "priority": 2},
            {"id": 2, "arrival_time": 1, "burst_time": 4, "priority": 1},
            {"id": 3, "arrival_time": 2, "burst_time": 8, "priority": 3}
        ],
        "algorithms": ["FCFS", "SJF", "SRTF", "PRIORITY", "PREEMPTIVE_PRIORITY", "RR"],
        "time_quantum": 2
    })";

    string jsonResp = runJsonSimulation(jsonReq);
    assert(jsonResp.find("\"algorithm_id\":\"FCFS\"") != string::npos);
    assert(jsonResp.find("\"algorithm_id\":\"SJF\"") != string::npos);
    assert(jsonResp.find("\"algorithm_id\":\"SRTF\"") != string::npos);
    assert(jsonResp.find("\"algorithm_id\":\"PRIORITY\"") != string::npos);
    assert(jsonResp.find("\"algorithm_id\":\"PREEMPTIVE_PRIORITY\"") != string::npos);
    assert(jsonResp.find("\"algorithm_id\":\"RR\"") != string::npos);
    assert(jsonResp.find("\"process_metrics\":[") != string::npos);
    assert(jsonResp.find("\"timeline\":[") != string::npos);

    // Verify invalid JSON or invalid fields throw exceptions cleanly
    bool caught = false;
    try {
        runJsonSimulation(R"({"processes": []})");
    } catch (const exception&) {
        caught = true;
    }
    assert(caught);

    caught = false;
    try {
        runJsonSimulation(R"({"processes": [{"id": 1, "arrival_time": 0, "burst_time": 4, "priority": 1}], "algorithms": ["UNKNOWN"]})");
    } catch (const exception&) {
        caught = true;
    }
    assert(caught);

    cout << "[PASS] testJsonSimulation\n";
}

int main() {
    cout << "Running SchedulAI C++ Engine Unit Tests...\n";
    testSingleProcess();
    testPreemptionAndResponseTime();
    testSrtfVsPreemptivePriorityDistinction();
    testCpuIdleGaps();
    testTieBreakingDeterminism();
    testRoundRobinQueueOrdering();
    testInputValidation();
    testJsonSimulation();
    cout << "All 8 C++ test suites passed successfully!\n";
    return 0;
}
