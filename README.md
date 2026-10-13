# SchedulAI

**SchedulAI** is an interactive CPU scheduling simulator and algorithm optimizer designed for Operating Systems students, educators, and learners. It combines a high-performance **C++17 engine** with a **FastAPI** backend and a modern **React (TypeScript)** dashboard.

---

## Features

- **6 CPU Scheduling Algorithms:**
  - First Come, First Served (**FCFS**)
  - Shortest Job First (**SJF**, non-preemptive)
  - Shortest Remaining Time First (**SRTF**, preemptive)
  - Priority Scheduling (non-preemptive)
  - Priority Scheduling (preemptive)
  - Round Robin (**RR**)
- **Comprehensive Metrics:** Calculates Completion Time (CT), Turnaround Time (TAT), Waiting Time (WT), Response Time (RT), system averages, and throughput.
- **Interactive Visualizations:**
  - **Gantt Charts:** Proportional execution timelines displaying start/end times, preemption points, and CPU idle intervals.
  - **Process Explorer:** Simplified Process Control Block (PCB) inspector and state lifecycle transitions (`New` → `Ready` ⇄ `Running` → `Terminated`).
- **AI-Assisted Optimizer:** Evaluates workloads against a selected goal (*Minimize Waiting Time, Turnaround Time, or Response Time*) by simulating all algorithms in C++ and explaining the optimal choice and trade-offs.
- **Classroom Workload Presets:** Pre-configured scenarios covering preemption, simultaneous arrivals, FCFS convoy effect, and idle CPU gaps.
- **CSV Export:** Download simulation metrics and timeline segments with one click.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Scheduling Engine** | C++17 (compiled native executable) |
| **Backend API** | Python, FastAPI, Pydantic, Uvicorn |
| **Frontend** | React 19, TypeScript, Vite |
| **Testing** | C++ custom harness, pytest, Vitest |

---

## Quickstart (Windows)

### Prerequisites
- `g++` (MinGW / GCC supporting C++17)
- Python 3.10+
- Node.js 18+ and `npm`

---

### Step 1: Compile the C++ Engine
From the project root:
```powershell
g++ -std=c++17 -O2 backend/cpp/existing_scheduler.cpp -o backend/cpp/scheduler_engine.exe
```

---

### Step 2: Start the FastAPI Backend
```powershell
# Create virtual environment and install dependencies
python -m venv .venv
.\.venv\Scripts\pip.exe install -r backend/requirements.txt

# Run backend on http://127.0.0.1:8000
.\.venv\Scripts\uvicorn.exe backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

### Step 3: Start the React Frontend
In a new terminal:
```powershell
npm --prefix frontend install
npm --prefix frontend run dev
```
- Open application: [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```text
SchedulAI/
├── backend/
│   ├── cpp/
│   │   ├── existing_scheduler.cpp    # C++17 scheduling engine
│   │   └── tests/test_scheduler.cpp  # C++ unit tests
│   ├── app/
│   │   ├── main.py                   # FastAPI entry point
│   │   ├── routes/api.py             # API endpoints
│   │   ├── schemas/scheduling.py     # Pydantic schemas
│   │   ├── services/engine.py        # C++ subprocess bridge
│   │   └── recommendations/          # Simulation-backed optimizer
│   └── tests/test_api.py             # Pytest backend tests
├── frontend/
│   ├── src/
│   │   ├── components/               # UI components (Gantt, Workspace, Explorer, Insights)
│   │   ├── services/api.ts           # API client
│   │   └── App.tsx                   # Main dashboard
│   └── package.json
├── sample-workloads/                 # Sample JSON workloads
└── docs/                             # PRD, TRD, Architecture, and UI/UX docs
```

---

## Running Tests

### 1. C++ Engine Tests
```powershell
g++ -std=c++17 -O2 backend/cpp/tests/test_scheduler.cpp -o backend/cpp/tests/test_scheduler.exe
.\backend\cpp\tests\test_scheduler.exe
```

### 2. Backend Tests (pytest)
```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_api.py -v
```

### 3. Frontend Tests (Vitest)
```powershell
npm --prefix frontend run test
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Checks service status and C++ engine availability |
| `GET` | `/api/presets` | Retrieves pre-configured workload scenarios |
| `POST` | `/api/simulate` | Simulates workload across selected algorithms |
| `POST` | `/api/recommend` | Recommends optimal algorithm for an objective |
| `POST` | `/api/export/csv` | Exports simulation metrics and Gantt timeline to CSV |

---

## Core Formulas

$$\text{Turnaround Time (TAT)} = \text{Completion Time (CT)} - \text{Arrival Time (AT)}$$

$$\text{Waiting Time (WT)} = \text{Turnaround Time (TAT)} - \text{Burst Time (BT)}$$

$$\text{Response Time (RT)} = \text{First CPU Start Time} - \text{Arrival Time (AT)}$$

$$\text{Throughput} = \frac{\text{Completed Processes}}{\text{Total Elapsed Time}}$$

*Priority Convention: Lower numeric value means higher priority (e.g., Priority 1 > Priority 2).*

---

## License

Educational Operating Systems Mini-Project.
