
#include <bits/stdc++.h>
using namespace std;

struct Process {
    int id;
    int arrivalTime;
    int burstTime;
    int priority;

    int completionTime = 0;
    int turnaroundTime = 0;
    int waitingTime = 0;
    int responseTime = 0;
};

struct Segment {
    string processName;
    int startTime;
    int endTime;
};

void printGanttChart(vector<Segment>& ganttChart) {
    // Merge adjacent segments of the same process.
    vector<Segment> merged;

    for (const Segment& s : ganttChart) {
        if (!merged.empty() &&
            merged.back().processName == s.processName &&
            merged.back().endTime == s.startTime) {

            merged.back().endTime = s.endTime;
        } else {
            merged.push_back(s);
        }
    }

    cout << "\n--- Gantt Chart ---\n";

    for (const Segment& s : merged) {
        cout << "+" << string(7, '-') ;
    }
    cout << "+\n";

    for (const Segment& s : merged) {
        cout << "|"
             << setw(7) << left << s.processName;
    }
    cout << "|\n";

    for (const Segment& s : merged) {
        cout << "+" << string(7, '-');
    }
    cout << "+\n";

    if (!merged.empty()) {
        cout << left << merged[0].startTime;

        for (const Segment& s : merged) {
            cout << setw(8) << s.endTime;
        }
        cout << '\n';
    }
}

struct SchedulingResult {
    string algorithmName;
    double averageWaitingTime;
    double averageTurnaroundTime;
    double averageResponseTime;
};

bool compareArrival(const Process& a, const Process& b) {
        return a.arrivalTime < b.arrivalTime;
    }

SchedulingResult fcfs(vector<Process> processes) {

    // Sort processes by arrival time.
    stable_sort(
        processes.begin(),
        processes.end(),
        compareArrival
    );

    vector<Segment> ganttChart;
    int currentTime = 0;

    for (Process& p : processes) {

        // CPU stays idle if no process has arrived.
        if (currentTime < p.arrivalTime) {
            ganttChart.push_back({
                "Idle", currentTime, p.arrivalTime
            });

            currentTime = p.arrivalTime;
        }

        int startTime = currentTime;

        // Response time = first start - arrival.
        p.responseTime = startTime - p.arrivalTime;

        // FCFS is non-preemptive.
        currentTime += p.burstTime;
        p.completionTime = currentTime;

        p.turnaroundTime =
            p.completionTime - p.arrivalTime;

        p.waitingTime =
            p.turnaroundTime - p.burstTime;

        ganttChart.push_back({
            "P" + to_string(p.id),
            startTime,
            currentTime
        });
    }

    cout << "\n--- FCFS Scheduling Results ---\n\n";

    cout << left
         << setw(10) << "Process"
         << setw(8) << "AT"
         << setw(8) << "BT"
         << setw(8) << "CT"
         << setw(8) << "TAT"
         << setw(8) << "WT"
         << setw(8) << "RT" << '\n';

    double totalWT = 0;
    double totalTAT = 0;
    double totalRT = 0;

    for (const Process& p : processes) {
        cout << left
             << setw(10) << ("P" + to_string(p.id))
             << setw(8) << p.arrivalTime
             << setw(8) << p.burstTime
             << setw(8) << p.completionTime
             << setw(8) << p.turnaroundTime
             << setw(8) << p.waitingTime
             << setw(8) << p.responseTime << '\n';

        totalWT += p.waitingTime;
        totalTAT += p.turnaroundTime;
        totalRT += p.responseTime;
    }

    int n = static_cast<int>(processes.size());

    cout << fixed << setprecision(2);
    cout << "\nAverage waiting time: " << totalWT / n << '\n';
    cout << "Average turnaround time: " << totalTAT / n << '\n';
    cout << "Average response time: " << totalRT / n << '\n';

    printGanttChart(ganttChart);

    cout << '\n';
    return {
    "FCFS",
    totalWT / n,
    totalTAT / n,
    totalRT / n
    };
}


SchedulingResult sjf(vector<Process> processes) {

    int n = processes.size();
    int completed = 0;
    int currentTime = 0;

    // Track which processes have finished.
    vector<bool> done(n, false);

    vector<Segment> ganttChart;

    while (completed < n) {

        int idx = -1;

        // Find the shortest available process.
        for (int i = 0; i < n; i++) {

            if (!done[i] &&
                processes[i].arrivalTime <= currentTime) {

                if (idx == -1 ||
                    processes[i].burstTime <
                    processes[idx].burstTime) {

                    idx = i;
                }
            }
        }

        // No process is ready: advance to next arrival.
        if (idx == -1) {

            int nextArrival = INT_MAX;

            for (int i = 0; i < n; i++) {
                if (!done[i]) {
                    nextArrival = min(
                        nextArrival,
                        processes[i].arrivalTime
                    );
                }
            }

            ganttChart.push_back({
                "Idle", currentTime, nextArrival
            });

            currentTime = nextArrival;
            continue;
        }

        Process& p = processes[idx];

        int startTime = currentTime;

        p.responseTime = startTime - p.arrivalTime;

        currentTime += p.burstTime;

        p.completionTime = currentTime;
        p.turnaroundTime =
            p.completionTime - p.arrivalTime;
        p.waitingTime =
            p.turnaroundTime - p.burstTime;

        ganttChart.push_back({
            "P" + to_string(p.id),
            startTime,
            currentTime
        });

        done[idx] = true;
        completed++;
    }

    cout << "\n--- SJF Scheduling Results ---\n\n";

    cout << left
         << setw(10) << "Process"
         << setw(8) << "AT"
         << setw(8) << "BT"
         << setw(8) << "CT"
         << setw(8) << "TAT"
         << setw(8) << "WT"
         << setw(8) << "RT" << '\n';

    double totalWT = 0;
    double totalTAT = 0;
    double totalRT = 0;

    // Print results in original process-ID order.
    sort(processes.begin(), processes.end(),
         [](const Process& a, const Process& b) {
             return a.id < b.id;
         });

    for (const Process& p : processes) {

        cout << left
             << setw(10) << ("P" + to_string(p.id))
             << setw(8) << p.arrivalTime
             << setw(8) << p.burstTime
             << setw(8) << p.completionTime
             << setw(8) << p.turnaroundTime
             << setw(8) << p.waitingTime
             << setw(8) << p.responseTime << '\n';

        totalWT += p.waitingTime;
        totalTAT += p.turnaroundTime;
        totalRT += p.responseTime;
    }

    cout << fixed << setprecision(2);
    cout << "\nAverage waiting time: "
         << totalWT / n << '\n';
    cout << "Average turnaround time: "
         << totalTAT / n << '\n';
    cout << "Average response time: "
         << totalRT / n << '\n';

    cout << "\n--- Gantt Chart ---\n";

    printGanttChart(ganttChart);

    cout << '\n';
    return {
    "SJF",
    totalWT / (double)n,
    totalTAT / (double)n,
    totalRT / (double)n
    };
}


SchedulingResult priorityScheduling(vector<Process> processes) {

    int n = processes.size();
    int completed = 0;
    int currentTime = 0;

    vector<bool> done(n, false);
    vector<Segment> ganttChart;

    while (completed < n) {

        int idx = -1;

        // Find the highest-priority ready process.
        // Smaller priority number means higher priority.
        for (int i = 0; i < n; i++) {

            if (!done[i] &&
                processes[i].arrivalTime <= currentTime) {

                if (idx == -1 ||
                    processes[i].priority <
                    processes[idx].priority) {

                    idx = i;
                }
            }
        }

        // No process is ready: advance to next arrival.
        if (idx == -1) {

            int nextArrival = INT_MAX;

            for (int i = 0; i < n; i++) {
                if (!done[i]) {
                    nextArrival = min(
                        nextArrival,
                        processes[i].arrivalTime
                    );
                }
            }

            ganttChart.push_back({
                "Idle", currentTime, nextArrival
            });

            currentTime = nextArrival;
            continue;
        }

        Process& p = processes[idx];

        int startTime = currentTime;

        p.responseTime = startTime - p.arrivalTime;

        currentTime += p.burstTime;

        p.completionTime = currentTime;
        p.turnaroundTime =
            p.completionTime - p.arrivalTime;
        p.waitingTime =
            p.turnaroundTime - p.burstTime;

        ganttChart.push_back({
            "P" + to_string(p.id),
            startTime,
            currentTime
        });

        done[idx] = true;
        completed++;
    }

    // Display processes in their original ID order.
    sort(processes.begin(), processes.end(),
         [](const Process& a, const Process& b) {
             return a.id < b.id;
         });

    cout << "\n--- Priority Scheduling Results ---\n\n";

    cout << left
         << setw(10) << "Process"
         << setw(8) << "AT"
         << setw(8) << "BT"
         << setw(10) << "Priority"
         << setw(8) << "CT"
         << setw(8) << "TAT"
         << setw(8) << "WT"
         << setw(8) << "RT" << '\n';

    double totalWT = 0;
    double totalTAT = 0;
    double totalRT = 0;

    for (const Process& p : processes) {

        cout << left
             << setw(10) << ("P" + to_string(p.id))
             << setw(8) << p.arrivalTime
             << setw(8) << p.burstTime
             << setw(10) << p.priority
             << setw(8) << p.completionTime
             << setw(8) << p.turnaroundTime
             << setw(8) << p.waitingTime
             << setw(8) << p.responseTime << '\n';

        totalWT += p.waitingTime;
        totalTAT += p.turnaroundTime;
        totalRT += p.responseTime;
    }

    cout << fixed << setprecision(2);
    cout << "\nAverage waiting time: "
         << totalWT / n << '\n';
    cout << "Average turnaround time: "
         << totalTAT / n << '\n';
    cout << "Average response time: "
         << totalRT / n << '\n';

    printGanttChart(ganttChart);

    cout << '\n';
    return {
    "Priority",
    totalWT / (double)n,
    totalTAT / (double)n,
    totalRT / (double)n
    };
}


SchedulingResult srtf(vector<Process> processes) {

    int n = processes.size();
    int completed = 0;
    int currentTime = 0;

    vector<int> remainingTime(n);

    for (int i = 0; i < n; i++) {
        remainingTime[i] = processes[i].burstTime;
    }

    vector<bool> started(n, false);
    vector<Segment> ganttChart;

    while (completed < n) {

        int idx = -1;

        // Select the ready process with the least remaining time.
        for (int i = 0; i < n; i++) {

            if (processes[i].arrivalTime <= currentTime &&
                remainingTime[i] > 0) {

                if (idx == -1 ||
                    remainingTime[i] < remainingTime[idx]) {

                    idx = i;
                }
            }
        }

        // If no process is ready, advance the clock.
        if (idx == -1) {

            if (ganttChart.empty() ||
                ganttChart.back().processName != "Idle") {

                ganttChart.push_back({
                    "Idle", currentTime, currentTime + 1
                });

            } else {
                ganttChart.back().endTime++;
            }

            currentTime++;
            continue;
        }

        Process& p = processes[idx];

        // Record response time only on the first execution.
        if (!started[idx]) {
            p.responseTime = currentTime - p.arrivalTime;
            started[idx] = true;
        }

        // Execute for one time unit.
        if (!ganttChart.empty() &&
            ganttChart.back().processName ==
                "P" + to_string(p.id) &&
            ganttChart.back().endTime == currentTime) {

            ganttChart.back().endTime++;

        } else {
            ganttChart.push_back({
                "P" + to_string(p.id),
                currentTime,
                currentTime + 1
            });
        }

        remainingTime[idx]--;
        currentTime++;

        // Record completion metrics.
        if (remainingTime[idx] == 0) {

            p.completionTime = currentTime;

            p.turnaroundTime =
                p.completionTime - p.arrivalTime;

            p.waitingTime =
                p.turnaroundTime - p.burstTime;

            completed++;
        }
    }

    // Display in process ID order.
    sort(processes.begin(), processes.end(),
         [](const Process& a, const Process& b) {
             return a.id < b.id;
         });

    cout << "\n--- SRTF Scheduling Results ---\n\n";

    cout << left
         << setw(10) << "Process"
         << setw(8) << "AT"
         << setw(8) << "BT"
         << setw(8) << "CT"
         << setw(8) << "TAT"
         << setw(8) << "WT"
         << setw(8) << "RT" << '\n';

    double totalWT = 0;
    double totalTAT = 0;
    double totalRT = 0;

    for (const Process& p : processes) {

        cout << left
             << setw(10) << ("P" + to_string(p.id))
             << setw(8) << p.arrivalTime
             << setw(8) << p.burstTime
             << setw(8) << p.completionTime
             << setw(8) << p.turnaroundTime
             << setw(8) << p.waitingTime
             << setw(8) << p.responseTime << '\n';

        totalWT += p.waitingTime;
        totalTAT += p.turnaroundTime;
        totalRT += p.responseTime;
    }

    cout << fixed << setprecision(2);
    cout << "\nAverage waiting time: "
         << totalWT / n << '\n';
    cout << "Average turnaround time: "
         << totalTAT / n << '\n';
    cout << "Average response time: "
         << totalRT / n << '\n';

    printGanttChart(ganttChart);

    cout << '\n';
    return {
    "SRTF",
    totalWT / (double)n,
    totalTAT / (double)n,
    totalRT / (double)n
    };
}

SchedulingResult roundRobin(vector<Process> processes, int quantum)
{
    int n = processes.size();
    int completed = 0;
    int currentTime = 0;

    vector<int> remainingTime(n);
    vector<bool> started(n, false);

    for (int i = 0; i < n; i++)
    {
        remainingTime[i] = processes[i].burstTime;
    }

    // Sort process indices by arrival time
    vector<int> order(n);
    for (int i = 0; i < n; i++)
        order[i] = i;

    stable_sort(order.begin(), order.end(),
        [&](int a, int b)
        {
            return processes[a].arrivalTime <
                   processes[b].arrivalTime;
        });

    queue<int> readyQueue;
    vector<Segment> ganttChart;
    int nextArrival = 0;

    while (completed < n)
    {
        // Add all processes that have arrived
        while (nextArrival < n &&
               processes[order[nextArrival]].arrivalTime <= currentTime)
        {
            readyQueue.push(order[nextArrival]);
            nextArrival++;
        }

        // If no process is ready, move to the next arrival
        if (readyQueue.empty())
        {
            int nextTime = processes[order[nextArrival]].arrivalTime;

            ganttChart.push_back(
                {"Idle", currentTime, nextTime}
            );

            currentTime = nextTime;
            continue;
        }

        int idx = readyQueue.front();
        readyQueue.pop();

        Process& p = processes[idx];

        // Record the first time this process gets the CPU
        if (!started[idx])
        {
            p.responseTime = currentTime - p.arrivalTime;
            started[idx] = true;
        }

        // Run for the quantum or until the process finishes
        int runTime = min(quantum, remainingTime[idx]);

        ganttChart.push_back({
            "P" + to_string(p.id),
            currentTime,
            currentTime + runTime
        });

        currentTime += runTime;
        remainingTime[idx] -= runTime;

        // Add newly arrived processes before re-queuing this process
        while (nextArrival < n &&
               processes[order[nextArrival]].arrivalTime <= currentTime)
        {
            readyQueue.push(order[nextArrival]);
            nextArrival++;
        }

        if (remainingTime[idx] > 0)
        {
            readyQueue.push(idx);
        }
        else
        {
            p.completionTime = currentTime;
            p.turnaroundTime =
                p.completionTime - p.arrivalTime;
            p.waitingTime =
                p.turnaroundTime - p.burstTime;

            completed++;
        }
    }

    // Display results in process ID order
    sort(processes.begin(), processes.end(),
        [](const Process& a, const Process& b)
        {
            return a.id < b.id;
        });

    cout << "\n--- Round Robin Scheduling Results ---\n\n";

    cout << left
         << setw(10) << "Process"
         << setw(8) << "AT"
         << setw(8) << "BT"
         << setw(8) << "CT"
         << setw(8) << "TAT"
         << setw(8) << "WT"
         << setw(8) << "RT" << '\n';

    double totalWT = 0, totalTAT = 0, totalRT = 0;

    for (const Process& p : processes)
    {
        cout << left
             << setw(10) << ("P" + to_string(p.id))
             << setw(8) << p.arrivalTime
             << setw(8) << p.burstTime
             << setw(8) << p.completionTime
             << setw(8) << p.turnaroundTime
             << setw(8) << p.waitingTime
             << setw(8) << p.responseTime << '\n';

        totalWT += p.waitingTime;
        totalTAT += p.turnaroundTime;
        totalRT += p.responseTime;
    }

    cout << fixed << setprecision(2);
    cout << "\nAverage waiting time: " << totalWT / n << '\n';
    cout << "Average turnaround time: " << totalTAT / n << '\n';
    cout << "Average response time: " << totalRT / n << '\n';

    cout << "\n--- Gantt Chart (Quantum = "
         << quantum << ") ---\n";

    printGanttChart(ganttChart);

    cout << '\n';
    return {
    "Round Robin",
    totalWT / (double)n,
    totalTAT / (double)n,
    totalRT / (double)n
    };
}

void compareAlgorithms(
    const vector<SchedulingResult>& results
) {
    cout << "\n";
    cout << "============================================================\n";
    cout << "          CPU SCHEDULING ALGORITHM COMPARISON\n";
    cout << "============================================================\n\n";

    cout << left
         << setw(20) << "Algorithm"
         << setw(18) << "Avg Waiting"
         << setw(18) << "Avg Turnaround"
         << setw(18) << "Avg Response"
         << '\n';

    cout << string(74, '-') << '\n';

    cout << fixed << setprecision(2);

    for (const SchedulingResult& r : results) {
        cout << left
             << setw(20) << r.algorithmName
             << setw(18) << r.averageWaitingTime
             << setw(18) << r.averageTurnaroundTime
             << setw(18) << r.averageResponseTime
             << '\n';
    }

    cout << string(74, '=') << '\n';
}


int main() {
    int n;

    cout << "Smart CPU Scheduler Simulator\n";
    cout << "Number of processes: ";
    cin >> n;

    if (n <= 0) {
        cout << "Number of processes must be positive.\n";
        return 1;
    }

    vector<Process> processes;

    for (int i = 0; i < n; i++) {
        Process p;
        p.id = i + 1;

        cout << "\nProcess P" << p.id << '\n';

        cout << "Arrival time: ";
        cin >> p.arrivalTime;

        cout << "Burst time: ";
        cin >> p.burstTime;

        cout << "Priority (smaller number = higher priority): ";
        cin >> p.priority;

        if (p.arrivalTime < 0 ||
            p.burstTime <= 0 ||
            p.priority <= 0) {
            cout << "Invalid input.\n";
            return 1;
        }

        processes.push_back(p);
    }

    int quantum;

    cout << "\nEnter Round Robin time quantum: ";
    cin >> quantum;

    if (quantum <= 0) {
        cout << "Time quantum must be positive.\n";
        return 1;
    }

    vector<SchedulingResult> results;

    results.push_back(fcfs(processes));
    results.push_back(sjf(processes));
    results.push_back(priorityScheduling(processes));
    results.push_back(srtf(processes));
    results.push_back(roundRobin(processes, quantum));

    // Display all algorithms side by side.
    compareAlgorithms(results);

    return 0;
}
