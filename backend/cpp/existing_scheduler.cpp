
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
    int processId = -1; // -1 indicates CPU Idle
    string processName;
    int startTime;
    int endTime;
};

vector<Segment> mergeSegments(const vector<Segment>& ganttChart) {
    vector<Segment> merged;

    for (const Segment& s : ganttChart) {
        if (!merged.empty() &&
            merged.back().processId == s.processId &&
            merged.back().processName == s.processName &&
            merged.back().endTime == s.startTime) {

            merged.back().endTime = s.endTime;
        } else {
            merged.push_back(s);
        }
    }
    return merged;
}

void printGanttChart(const vector<Segment>& ganttChart) {
    vector<Segment> merged = mergeSegments(ganttChart);

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
    string algorithmId;
    string algorithmName;
    vector<Process> processes;
    vector<Segment> timeline;
    double averageWaitingTime = 0.0;
    double averageTurnaroundTime = 0.0;
    double averageResponseTime = 0.0;
    double throughput = 0.0;
};

bool compareArrival(const Process& a, const Process& b) {
    if (a.arrivalTime != b.arrivalTime) {
        return a.arrivalTime < b.arrivalTime;
    }
    return a.id < b.id;
}

bool compareById(const Process& a, const Process& b) {
    return a.id < b.id;
}

void validateWorkload(const vector<Process>& processes, int quantum = 1, bool checkQuantum = false) {
    if (processes.empty()) {
        throw invalid_argument("Workload must contain at least one process.");
    }
    if (processes.size() > 1000) {
        throw invalid_argument("Workload exceeds maximum limit of 1000 processes.");
    }
    if (checkQuantum && quantum <= 0) {
        throw invalid_argument("Time quantum must be positive.");
    }

    set<int> seenIds;
    long long totalBurst = 0;
    for (const Process& p : processes) {
        if (p.id <= 0) {
            throw invalid_argument("Process ID must be positive.");
        }
        if (!seenIds.insert(p.id).second) {
            throw invalid_argument("Duplicate Process ID detected: " + to_string(p.id));
        }
        if (p.arrivalTime < 0) {
            throw invalid_argument("Arrival time must be non-negative.");
        }
        if (p.burstTime <= 0) {
            throw invalid_argument("Burst time must be positive.");
        }
        if (p.priority <= 0) {
            throw invalid_argument("Priority must be positive.");
        }
        if (p.arrivalTime > 100000000 || p.burstTime > 100000000) {
            throw invalid_argument("Arrival or burst time exceeds safe simulation bounds.");
        }
        totalBurst += p.burstTime;
        if (totalBurst > 500000000LL) {
            throw invalid_argument("Total burst time exceeds safe simulation bounds.");
        }
    }
}

SchedulingResult finalizeResult(
    const string& algorithmId,
    const string& algorithmName,
    vector<Process>& processes,
    const vector<Segment>& rawTimeline
) {
    sort(processes.begin(), processes.end(), compareById);
    vector<Segment> mergedTimeline = mergeSegments(rawTimeline);

    int n = static_cast<int>(processes.size());
    double totalWT = 0.0;
    double totalTAT = 0.0;
    double totalRT = 0.0;

    for (const Process& p : processes) {
        totalWT += p.waitingTime;
        totalTAT += p.turnaroundTime;
        totalRT += p.responseTime;
    }

    double throughput = 0.0;
    if (!mergedTimeline.empty()) {
        int endTime = mergedTimeline.back().endTime;
        if (endTime > 0) {
            throughput = static_cast<double>(n) / static_cast<double>(endTime);
        }
    }

    return {
        algorithmId,
        algorithmName,
        processes,
        mergedTimeline,
        totalWT / n,
        totalTAT / n,
        totalRT / n,
        throughput
    };
}

void printSchedulingResult(const SchedulingResult& result, bool showPriority = false, int quantum = -1) {
    cout << "\n--- " << result.algorithmName << " Scheduling Results ---\n\n";

    cout << left
         << setw(10) << "Process"
         << setw(8) << "AT"
         << setw(8) << "BT";
    if (showPriority) {
        cout << setw(10) << "Priority";
    }
    cout << setw(8) << "CT"
         << setw(8) << "TAT"
         << setw(8) << "WT"
         << setw(8) << "RT" << '\n';

    for (const Process& p : result.processes) {
        cout << left
             << setw(10) << ("P" + to_string(p.id))
             << setw(8) << p.arrivalTime
             << setw(8) << p.burstTime;
        if (showPriority) {
            cout << setw(10) << p.priority;
        }
        cout << setw(8) << p.completionTime
             << setw(8) << p.turnaroundTime
             << setw(8) << p.waitingTime
             << setw(8) << p.responseTime << '\n';
    }

    cout << fixed << setprecision(2);
    cout << "\nAverage waiting time: " << result.averageWaitingTime << '\n';
    cout << "Average turnaround time: " << result.averageTurnaroundTime << '\n';
    cout << "Average response time: " << result.averageResponseTime << '\n';

    if (quantum > 0) {
        cout << "\n--- Gantt Chart (Quantum = " << quantum << ") ---\n";
    }

    printGanttChart(result.timeline);
    cout << '\n';
}

SchedulingResult fcfs(vector<Process> processes, bool verbose = false) {
    validateWorkload(processes);

    // Sort processes by arrival time, then by ID.
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
                -1, "Idle", currentTime, p.arrivalTime
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
            p.id,
            "P" + to_string(p.id),
            startTime,
            currentTime
        });
    }

    SchedulingResult result = finalizeResult("FCFS", "FCFS", processes, ganttChart);
    if (verbose) {
        printSchedulingResult(result, false);
    }
    return result;
}


SchedulingResult sjf(vector<Process> processes, bool verbose = false) {
    validateWorkload(processes);

    int n = static_cast<int>(processes.size());
    int completed = 0;
    int currentTime = 0;

    // Track which processes have finished.
    vector<bool> done(n, false);

    vector<Segment> ganttChart;

    while (completed < n) {

        int idx = -1;

        // Find the shortest available process (tie-break: arrivalTime, then id).
        for (int i = 0; i < n; i++) {

            if (!done[i] &&
                processes[i].arrivalTime <= currentTime) {

                if (idx == -1 ||
                    tie(processes[i].burstTime, processes[i].arrivalTime, processes[i].id) <
                    tie(processes[idx].burstTime, processes[idx].arrivalTime, processes[idx].id)) {

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
                -1, "Idle", currentTime, nextArrival
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
            p.id,
            "P" + to_string(p.id),
            startTime,
            currentTime
        });

        done[idx] = true;
        completed++;
    }

    SchedulingResult result = finalizeResult("SJF", "SJF", processes, ganttChart);
    if (verbose) {
        printSchedulingResult(result, false);
    }
    return result;
}


SchedulingResult priorityScheduling(vector<Process> processes, bool verbose = false) {
    validateWorkload(processes);

    int n = static_cast<int>(processes.size());
    int completed = 0;
    int currentTime = 0;

    vector<bool> done(n, false);
    vector<Segment> ganttChart;

    while (completed < n) {

        int idx = -1;

        // Find the highest-priority ready process.
        // Smaller priority number means higher priority (tie-break: arrivalTime, then id).
        for (int i = 0; i < n; i++) {

            if (!done[i] &&
                processes[i].arrivalTime <= currentTime) {

                if (idx == -1 ||
                    tie(processes[i].priority, processes[i].arrivalTime, processes[i].id) <
                    tie(processes[idx].priority, processes[idx].arrivalTime, processes[idx].id)) {

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
                -1, "Idle", currentTime, nextArrival
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
            p.id,
            "P" + to_string(p.id),
            startTime,
            currentTime
        });

        done[idx] = true;
        completed++;
    }

    SchedulingResult result = finalizeResult("PRIORITY", "Priority", processes, ganttChart);
    if (verbose) {
        printSchedulingResult(result, true);
    }
    return result;
}


SchedulingResult srtf(vector<Process> processes, bool verbose = false) {
    validateWorkload(processes);

    int n = static_cast<int>(processes.size());
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

        // Select the ready process with the least remaining time (tie-break: arrivalTime, then id).
        for (int i = 0; i < n; i++) {

            if (processes[i].arrivalTime <= currentTime &&
                remainingTime[i] > 0) {

                if (idx == -1 ||
                    tie(remainingTime[i], processes[i].arrivalTime, processes[i].id) <
                    tie(remainingTime[idx], processes[idx].arrivalTime, processes[idx].id)) {

                    idx = i;
                }
            }
        }

        // If no process is ready, advance the clock to the next arrival.
        if (idx == -1) {
            int nextArrival = INT_MAX;
            for (int i = 0; i < n; i++) {
                if (remainingTime[i] > 0) {
                    nextArrival = min(nextArrival, processes[i].arrivalTime);
                }
            }

            ganttChart.push_back({
                -1, "Idle", currentTime, nextArrival
            });

            currentTime = nextArrival;
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
            ganttChart.back().processId == p.id &&
            ganttChart.back().endTime == currentTime) {

            ganttChart.back().endTime++;

        } else {
            ganttChart.push_back({
                p.id,
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

    SchedulingResult result = finalizeResult("SRTF", "SRTF", processes, ganttChart);
    if (verbose) {
        printSchedulingResult(result, false);
    }
    return result;
}


SchedulingResult preemptivePriorityScheduling(vector<Process> processes, bool verbose = false) {
    validateWorkload(processes);

    int n = static_cast<int>(processes.size());
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

        // Select the ready process with the highest priority (smallest numeric priority).
        // Tie-break: arrivalTime, then id.
        for (int i = 0; i < n; i++) {

            if (processes[i].arrivalTime <= currentTime &&
                remainingTime[i] > 0) {

                if (idx == -1 ||
                    tie(processes[i].priority, processes[i].arrivalTime, processes[i].id) <
                    tie(processes[idx].priority, processes[idx].arrivalTime, processes[idx].id)) {

                    idx = i;
                }
            }
        }

        // If no process is ready, advance the clock to the next arrival.
        if (idx == -1) {
            int nextArrival = INT_MAX;
            for (int i = 0; i < n; i++) {
                if (remainingTime[i] > 0) {
                    nextArrival = min(nextArrival, processes[i].arrivalTime);
                }
            }

            ganttChart.push_back({
                -1, "Idle", currentTime, nextArrival
            });

            currentTime = nextArrival;
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
            ganttChart.back().processId == p.id &&
            ganttChart.back().endTime == currentTime) {

            ganttChart.back().endTime++;

        } else {
            ganttChart.push_back({
                p.id,
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

    SchedulingResult result = finalizeResult("PREEMPTIVE_PRIORITY", "Preemptive Priority", processes, ganttChart);
    if (verbose) {
        printSchedulingResult(result, true);
    }
    return result;
}


SchedulingResult roundRobin(vector<Process> processes, int quantum, bool verbose = false)
{
    validateWorkload(processes, quantum, true);

    int n = static_cast<int>(processes.size());
    int completed = 0;
    int currentTime = 0;

    vector<int> remainingTime(n);
    vector<bool> started(n, false);

    for (int i = 0; i < n; i++)
    {
        remainingTime[i] = processes[i].burstTime;
    }

    // Sort process indices by arrival time, then by ID
    vector<int> order(n);
    for (int i = 0; i < n; i++)
        order[i] = i;

    stable_sort(order.begin(), order.end(),
        [&](int a, int b)
        {
            if (processes[a].arrivalTime != processes[b].arrivalTime) {
                return processes[a].arrivalTime < processes[b].arrivalTime;
            }
            return processes[a].id < processes[b].id;
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
                {-1, "Idle", currentTime, nextTime}
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
            p.id,
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

    SchedulingResult result = finalizeResult("RR", "Round Robin", processes, ganttChart);
    if (verbose) {
        printSchedulingResult(result, false, quantum);
    }
    return result;
}

void compareAlgorithms(
    const vector<SchedulingResult>& results
) {
    cout << "\n";
    cout << "============================================================\n";
    cout << "          CPU SCHEDULING ALGORITHM COMPARISON\n";
    cout << "============================================================\n\n";

    cout << left
         << setw(22) << "Algorithm"
         << setw(18) << "Avg Waiting"
         << setw(18) << "Avg Turnaround"
         << setw(18) << "Avg Response"
         << '\n';

    cout << string(76, '-') << '\n';

    cout << fixed << setprecision(2);

    for (const SchedulingResult& r : results) {
        cout << left
             << setw(22) << r.algorithmName
             << setw(18) << r.averageWaitingTime
             << setw(18) << r.averageTurnaroundTime
             << setw(18) << r.averageResponseTime
             << '\n';
    }

    cout << string(76, '=') << '\n';
}

// --- Minimal, Strict JSON Parser & Serializer for Engine Communication ---

struct JsonValue {
    enum Type { NUL, BOOL, INT, DOUBLE, STRING, ARRAY, OBJECT } type = NUL;
    bool boolVal = false;
    long long intVal = 0;
    double doubleVal = 0.0;
    string strVal;
    vector<JsonValue> arrVal;
    map<string, JsonValue> objVal;
};

class JsonParser {
    const string& s;
    size_t pos = 0;

    void skipWs() {
        while (pos < s.size() && (s[pos] == ' ' || s[pos] == '\t' || s[pos] == '\n' || s[pos] == '\r')) {
            pos++;
        }
    }

    char peek() {
        skipWs();
        if (pos >= s.size()) throw invalid_argument("Unexpected end of JSON input.");
        return s[pos];
    }

    char get() {
        char c = peek();
        pos++;
        return c;
    }

    string parseString() {
        if (get() != '"') throw invalid_argument("Expected '\"' at start of JSON string.");
        string out;
        while (pos < s.size()) {
            char c = s[pos++];
            if (c == '"') return out;
            if (c == '\\') {
                if (pos >= s.size()) throw invalid_argument("Untruncated escape in JSON string.");
                char esc = s[pos++];
                switch (esc) {
                    case '"': out += '"'; break;
                    case '\\': out += '\\'; break;
                    case '/': out += '/'; break;
                    case 'b': out += '\b'; break;
                    case 'f': out += '\f'; break;
                    case 'n': out += '\n'; break;
                    case 'r': out += '\r'; break;
                    case 't': out += '\t'; break;
                    default: out += esc; break;
                }
            } else {
                out += c;
            }
        }
        throw invalid_argument("Unterminated JSON string.");
    }

    JsonValue parseNumber() {
        skipWs();
        size_t start = pos;
        if (pos < s.size() && s[pos] == '-') pos++;
        if (pos >= s.size() || !isdigit(static_cast<unsigned char>(s[pos]))) {
            throw invalid_argument("Invalid number in JSON input.");
        }
        while (pos < s.size() && isdigit(static_cast<unsigned char>(s[pos]))) pos++;
        bool isFloat = false;
        if (pos < s.size() && s[pos] == '.') {
            isFloat = true;
            pos++;
            if (pos >= s.size() || !isdigit(static_cast<unsigned char>(s[pos]))) {
                throw invalid_argument("Invalid fractional number in JSON input.");
            }
            while (pos < s.size() && isdigit(static_cast<unsigned char>(s[pos]))) pos++;
        }
        if (pos < s.size() && (s[pos] == 'e' || s[pos] == 'E')) {
            isFloat = true;
            pos++;
            if (pos < s.size() && (s[pos] == '+' || s[pos] == '-')) pos++;
            while (pos < s.size() && isdigit(static_cast<unsigned char>(s[pos]))) pos++;
        }
        string numStr = s.substr(start, pos - start);
        JsonValue val;
        if (isFloat) {
            throw invalid_argument("Expected integer value, got floating-point: " + numStr);
        } else {
            val.type = JsonValue::INT;
            try {
                val.intVal = stoll(numStr);
            } catch (...) {
                throw invalid_argument("Integer overflow in JSON input: " + numStr);
            }
        }
        return val;
    }

    JsonValue parseArray() {
        if (get() != '[') throw invalid_argument("Expected '[' at start of JSON array.");
        JsonValue val;
        val.type = JsonValue::ARRAY;
        if (peek() == ']') {
            get();
            return val;
        }
        while (true) {
            val.arrVal.push_back(parseValue());
            char c = peek();
            if (c == ']') {
                get();
                break;
            }
            if (c != ',') throw invalid_argument("Expected ',' or ']' in JSON array.");
            get();
        }
        return val;
    }

    JsonValue parseObject() {
        if (get() != '{') throw invalid_argument("Expected '{' at start of JSON object.");
        JsonValue val;
        val.type = JsonValue::OBJECT;
        if (peek() == '}') {
            get();
            return val;
        }
        while (true) {
            if (peek() != '"') throw invalid_argument("Expected string key in JSON object.");
            string key = parseString();
            if (get() != ':') throw invalid_argument("Expected ':' after key in JSON object.");
            val.objVal[key] = parseValue();
            char c = peek();
            if (c == '}') {
                get();
                break;
            }
            if (c != ',') throw invalid_argument("Expected ',' or '}' in JSON object.");
            get();
        }
        return val;
    }

public:
    explicit JsonParser(const string& input) : s(input) {}

    JsonValue parseValue() {
        char c = peek();
        if (c == '{') return parseObject();
        if (c == '[') return parseArray();
        if (c == '"') {
            JsonValue v;
            v.type = JsonValue::STRING;
            v.strVal = parseString();
            return v;
        }
        if (c == '-' || isdigit(static_cast<unsigned char>(c))) return parseNumber();
        if (s.compare(pos, 4, "true") == 0) {
            pos += 4;
            JsonValue v; v.type = JsonValue::BOOL; v.boolVal = true; return v;
        }
        if (s.compare(pos, 5, "false") == 0) {
            pos += 5;
            JsonValue v; v.type = JsonValue::BOOL; v.boolVal = false; return v;
        }
        if (s.compare(pos, 4, "null") == 0) {
            pos += 4;
            JsonValue v; v.type = JsonValue::NUL; return v;
        }
        throw invalid_argument("Unexpected token in JSON input.");
    }

    void ensureEnd() {
        skipWs();
        if (pos != s.size()) {
            throw invalid_argument("Trailing characters after JSON root value.");
        }
    }
};

string escapeJsonString(const string& input) {
    string out;
    for (char c : input) {
        switch (c) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default: out += c; break;
        }
    }
    return out;
}

int getRequiredInt(const map<string, JsonValue>& obj, const string& key1, const string& key2 = "") {
    auto it = obj.find(key1);
    if (it == obj.end() && !key2.empty()) {
        it = obj.find(key2);
    }
    if (it == obj.end() || it->second.type != JsonValue::INT) {
        throw invalid_argument("Missing or invalid integer field: " + key1);
    }
    if (it->second.intVal < INT_MIN || it->second.intVal > INT_MAX) {
        throw invalid_argument("Field out of 32-bit integer bounds: " + key1);
    }
    return static_cast<int>(it->second.intVal);
}

string runJsonSimulation(const string& jsonInput) {
    JsonParser parser(jsonInput);
    JsonValue root = parser.parseValue();
    parser.ensureEnd();

    if (root.type != JsonValue::OBJECT) {
        throw invalid_argument("JSON request root must be an object.");
    }

    auto procIt = root.objVal.find("processes");
    if (procIt == root.objVal.end() || procIt->second.type != JsonValue::ARRAY) {
        throw invalid_argument("JSON request must contain a 'processes' array.");
    }

    vector<Process> processes;
    for (const JsonValue& item : procIt->second.arrVal) {
        if (item.type != JsonValue::OBJECT) {
            throw invalid_argument("Each process entry must be a JSON object.");
        }
        Process p;
        p.id = getRequiredInt(item.objVal, "id");
        p.arrivalTime = getRequiredInt(item.objVal, "arrival_time", "arrivalTime");
        p.burstTime = getRequiredInt(item.objVal, "burst_time", "burstTime");
        p.priority = getRequiredInt(item.objVal, "priority");
        processes.push_back(p);
    }

    int quantum = 2;
    auto qIt = root.objVal.find("time_quantum");
    if (qIt == root.objVal.end()) {
        qIt = root.objVal.find("timeQuantum");
    }
    if (qIt != root.objVal.end() && qIt->second.type != JsonValue::NUL) {
        if (qIt->second.type != JsonValue::INT) {
            throw invalid_argument("'time_quantum' must be an integer.");
        }
        quantum = static_cast<int>(qIt->second.intVal);
    }

    vector<string> algorithms;
    auto algIt = root.objVal.find("algorithms");
    if (algIt != root.objVal.end()) {
        if (algIt->second.type != JsonValue::ARRAY) {
            throw invalid_argument("'algorithms' must be an array of strings.");
        }
        if (algIt->second.arrVal.empty()) {
            throw invalid_argument("'algorithms' array cannot be empty.");
        }
        for (const JsonValue& a : algIt->second.arrVal) {
            if (a.type != JsonValue::STRING) {
                throw invalid_argument("Each algorithm identifier must be a string.");
            }
            algorithms.push_back(a.strVal);
        }
    } else {
        algorithms = {"FCFS", "SJF", "SRTF", "PRIORITY", "PREEMPTIVE_PRIORITY", "RR"};
    }

    vector<SchedulingResult> results;
    for (const string& alg : algorithms) {
        if (alg == "FCFS") {
            results.push_back(fcfs(processes, false));
        } else if (alg == "SJF") {
            results.push_back(sjf(processes, false));
        } else if (alg == "SRTF") {
            results.push_back(srtf(processes, false));
        } else if (alg == "PRIORITY") {
            results.push_back(priorityScheduling(processes, false));
        } else if (alg == "PREEMPTIVE_PRIORITY") {
            results.push_back(preemptivePriorityScheduling(processes, false));
        } else if (alg == "RR" || alg == "ROUND_ROBIN") {
            results.push_back(roundRobin(processes, quantum, false));
        } else {
            throw invalid_argument("Unsupported algorithm identifier: " + alg);
        }
    }

    ostringstream out;
    out << setprecision(10);
    out << "{\"results\":[";
    for (size_t i = 0; i < results.size(); i++) {
        if (i > 0) out << ",";
        const SchedulingResult& r = results[i];
        out << "{";
        out << "\"algorithm_id\":\"" << escapeJsonString(r.algorithmId) << "\",";
        out << "\"algorithm_name\":\"" << escapeJsonString(r.algorithmName) << "\",";
        out << "\"average_waiting_time\":" << r.averageWaitingTime << ",";
        out << "\"average_turnaround_time\":" << r.averageTurnaroundTime << ",";
        out << "\"average_response_time\":" << r.averageResponseTime << ",";
        out << "\"throughput\":" << r.throughput << ",";

        out << "\"process_metrics\":[";
        for (size_t j = 0; j < r.processes.size(); j++) {
            if (j > 0) out << ",";
            const Process& p = r.processes[j];
            out << "{"
                << "\"id\":" << p.id << ","
                << "\"arrival_time\":" << p.arrivalTime << ","
                << "\"burst_time\":" << p.burstTime << ","
                << "\"priority\":" << p.priority << ","
                << "\"completion_time\":" << p.completionTime << ","
                << "\"turnaround_time\":" << p.turnaroundTime << ","
                << "\"waiting_time\":" << p.waitingTime << ","
                << "\"response_time\":" << p.responseTime
                << "}";
        }
        out << "],";

        out << "\"timeline\":[";
        for (size_t j = 0; j < r.timeline.size(); j++) {
            if (j > 0) out << ",";
            const Segment& s = r.timeline[j];
            out << "{";
            if (s.processId == -1) {
                out << "\"process_id\":null,";
            } else {
                out << "\"process_id\":" << s.processId << ",";
            }
            out << "\"process_name\":\"" << escapeJsonString(s.processName) << "\","
                << "\"start_time\":" << s.startTime << ","
                << "\"end_time\":" << s.endTime
                << "}";
        }
        out << "]";
        out << "}";
    }
    out << "]}";
    return out.str();
}

#ifndef SCHEDULAI_NO_MAIN
int main(int argc, char* argv[]) {
    bool jsonMode = false;
    for (int i = 1; i < argc; i++) {
        if (string(argv[i]) == "--json") {
            jsonMode = true;
            break;
        }
    }

    if (jsonMode) {
        try {
            ostringstream buffer;
            buffer << cin.rdbuf();
            string output = runJsonSimulation(buffer.str());
            cout << output << '\n';
            return 0;
        } catch (const exception& e) {
            cerr << "{\"error\":\"" << escapeJsonString(e.what()) << "\"}\n";
            return 1;
        }
    }

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

    results.push_back(fcfs(processes, true));
    results.push_back(sjf(processes, true));
    results.push_back(priorityScheduling(processes, true));
    results.push_back(preemptivePriorityScheduling(processes, true));
    results.push_back(srtf(processes, true));
    results.push_back(roundRobin(processes, quantum, true));

    // Display all algorithms side by side.
    compareAlgorithms(results);

    return 0;
}
#endif
