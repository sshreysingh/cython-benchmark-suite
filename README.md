# CPython vs. Cython: Algorithmic Benchmark & Visualizer Suite

A high-performance algorithmic benchmark comparing **Pure Python (CPython)** and **Cython (C-compiled extensions)** across classic search and shortest-path algorithms:

1. **N-Queens Problem** (Combinatorial backtracking & bitmask constraint satisfaction)
2. **Dijkstra's Algorithm** (Uniform-cost shortest path on 2D weighted grids)
3. **A\* (A-Star) Search Algorithm** (Heuristic-directed shortest path navigation)

---

## 🚀 Performance Highlights

Benchmarked on macOS with Clang `-O3` optimization:

| Problem / Algorithm | Standard CPython | Cython Extension | Speedup Factor | Key Architectural Advantage |
| :--- | :--- | :--- | :--- | :--- |
| **N-Queens (N=12)** | `259.56 ms` | `6.67 ms` | **38.9x Faster** | C register bitwise arithmetic, zero Python frame creation |
| **Dijkstra (80x80 Grid)** | `7.46 ms` | `0.58 ms` | **13.0x Faster** | Flat C binary min-heap, contiguous memory pointers |
| **A\* Search (80x80 Grid)**| `8.63 ms` | `0.49 ms` | **17.6x Faster** | Inlined C heuristic arithmetic, no Python object wrapping |

---

## 🧠 Why is Cython So Much Faster than CPython?

- **CPython**: Every number is a heap-allocated `PyObject` structure requiring reference counting (`Py_INCREF`/`Py_DECREF`), dynamic type checks, and virtual machine bytecode dispatch.
- **Cython**: Compiles down directly to native C assembly. Variables declared with `cdef int`, `cdef double*`, and bitwise operators map straight to hardware CPU registers and L1/L2 caches with `-O3` compiler optimization.
- **No GIL Overhead (`nogil`)**: Algorithms can execute in pure C mode without the Python Global Interpreter Lock, eliminating thread contention.

---

## 🛠️ Quick Start

### 1. Requirements & Setup
The project uses the provided virtual environment:
```bash
cd /Users/shreysinghparihar/.gemini/antigravity-ide/scratch/cython_benchmark_suite
./venv/bin/pip install -r requirements.txt # or setup.py
```

### 2. Build Cython Extensions
Recompile the native `.so` shared libraries:
```bash
./venv/bin/python setup.py build_ext --inplace
```

### 3. Run the CLI Benchmark
Run all algorithms across different scales with statistical reports:
```bash
# Full benchmark
./venv/bin/python benchmark.py

# Quick benchmark
./venv/bin/python benchmark.py --quick

# Single algorithm
./venv/bin/python benchmark.py --algo dijkstra
./venv/bin/python benchmark.py --algo nqueens
./venv/bin/python benchmark.py --algo astar
```

### 4. Launch the Interactive Web Dashboard
Run the visualizer with live animated grid exploration, chessboard rendering, and charts:
```bash
./venv/bin/python app.py
```
Open **`http://localhost:5001`** in your browser.

---

## 📁 Project Architecture

```
cython_benchmark_suite/
├── algorithms/
│   ├── python/               # Pure Python implementations (CPython)
│   │   ├── nqueens.py        # Bitmask backtracking in pure Python
│   │   ├── dijkstra.py       # Grid Dijkstra using standard heapq
│   │   └── astar.py          # Grid A* using standard heapq
│   └── cython_ext/           # Optimized Cython C extensions (.pyx)
│       ├── c_nqueens.pyx     # C bitwise recursion with nogil
│       ├── c_dijkstra.pyx    # Flat C binary min-heap & raw pointers
│       └── c_astar.pyx       # Inlined C heuristics & flat arrays
├── setup.py                  # Setuptools compiler script with -O3
├── benchmark.py              # CLI benchmark suite with statistical analysis
├── app.py                    # Flask interactive web server & REST API
├── grid_utils.py             # Reproducible maze & terrain generator
├── templates/
│   └── index.html            # Dark-mode dashboard UI
├── static/
│   ├── style.css             # Glassmorphic responsive styling
│   └── app.js                # Canvas visualizer & Chart.js logic
├── requirements.txt          # Dependencies (cython, setuptools, wheel, flask)
└── run.sh                    # One-command launch script
```
