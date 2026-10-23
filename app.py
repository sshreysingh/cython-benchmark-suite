#!/usr/bin/env python3
"""
Flask Interactive Web Dashboard for CPython vs. Cython Benchmarking.
Visualizes:
- Grid Pathfinding (Dijkstra and A*) with animated wave exploration and shortest path
- N-Queens chessboard placement & solution counter
- Dynamic performance comparison charts and gauges
- Side-by-side Python vs Cython code inspector
"""

import os
import time
from flask import Flask, render_template, jsonify, request
from grid_utils import generate_grid

from algorithms.python import (
    solve_nqueens_count as py_nq_count,
    solve_nqueens_first as py_nq_first,
    dijkstra_grid as py_dijkstra,
    astar_grid as py_astar
)

from algorithms.cython_ext import (
    solve_nqueens_count as cy_nq_count,
    solve_nqueens_first as cy_nq_first,
    dijkstra_grid as cy_dijkstra,
    astar_grid as cy_astar
)

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config['TEMPLATES_AUTO_RELOAD'] = True

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/grid", methods=["GET"])
def get_grid():
    rows = int(request.args.get("rows", 35))
    cols = int(request.args.get("cols", 35))
    density = float(request.args.get("density", 0.22))
    seed = int(request.args.get("seed", 42))

    data = generate_grid(rows=rows, cols=cols, obstacle_density=density, seed=seed)
    return jsonify(data)

@app.route("/api/benchmark", methods=["POST"])
def run_benchmark():
    data = request.get_json() or {}
    algo = data.get("algorithm", "dijkstra")
    
    if algo == "nqueens":
        n = int(data.get("n", 12))
        
        # Benchmark counting
        t0 = time.perf_counter()
        py_cnt = py_nq_count(n)
        py_time = (time.perf_counter() - t0) * 1000.0

        t0 = time.perf_counter()
        cy_cnt = cy_nq_count(n)
        cy_time = (time.perf_counter() - t0) * 1000.0

        placement = cy_nq_first(n)
        speedup = py_time / max(cy_time, 0.0001)

        return jsonify({
            "algorithm": "N-Queens",
            "n": n,
            "solutions": cy_cnt,
            "python_time_ms": round(py_time, 2),
            "cython_time_ms": round(cy_time, 2),
            "speedup": round(speedup, 1),
            "placement": placement
        })

    elif algo in ("dijkstra", "astar"):
        rows = int(data.get("rows", 40))
        cols = int(data.get("cols", 40))
        density = float(data.get("density", 0.22))
        seed = int(data.get("seed", 42))
        heuristic_kind = data.get("heuristic", "manhattan")

        grid_obj = generate_grid(rows=rows, cols=cols, obstacle_density=density, seed=seed)
        grid = grid_obj["grid"]
        start = tuple(grid_obj["start"])
        goal = tuple(grid_obj["goal"])

        if algo == "dijkstra":
            # Pure Python run
            t0 = time.perf_counter()
            py_res = py_dijkstra(grid, start, goal, capture_explored=True, sample_rate=1)
            py_time = (time.perf_counter() - t0) * 1000.0

            # Cython run
            t0 = time.perf_counter()
            cy_res = cy_dijkstra(grid, start, goal, capture_explored=True, sample_rate=1)
            cy_time = (time.perf_counter() - t0) * 1000.0
        else:
            # Pure Python A*
            t0 = time.perf_counter()
            py_res = py_astar(grid, start, goal, heuristic_kind=heuristic_kind, capture_explored=True, sample_rate=1)
            py_time = (time.perf_counter() - t0) * 1000.0

            # Cython A*
            t0 = time.perf_counter()
            cy_res = cy_astar(grid, start, goal, heuristic_kind=heuristic_kind, capture_explored=True, sample_rate=1)
            cy_time = (time.perf_counter() - t0) * 1000.0

        speedup = py_time / max(cy_time, 0.0001)

        return jsonify({
            "algorithm": "Dijkstra" if algo == "dijkstra" else "A*",
            "grid_size": f"{rows}x{cols}",
            "cost": round(cy_res["cost"], 2),
            "visited_count": cy_res["visited_count"],
            "python_time_ms": round(py_time, 2),
            "cython_time_ms": round(cy_time, 2),
            "speedup": round(speedup, 1),
            "path": cy_res["path"],
            "explored_order": cy_res["explored_order"],
            "grid": grid,
            "start": list(start),
            "goal": list(goal)
        })

    return jsonify({"error": "Unknown algorithm"}), 400

@app.route("/api/suite", methods=["GET"])
def run_suite():
    """Run predefined matrix of benchmarks for comprehensive chart display."""
    results = {
        "nqueens": [],
        "dijkstra": [],
        "astar": []
    }

    # N-Queens
    for n in [8, 10, 11, 12, 13]:
        t0 = time.perf_counter()
        py_cnt = py_nq_count(n)
        t_py = (time.perf_counter() - t0) * 1000.0

        t0 = time.perf_counter()
        cy_cnt = cy_nq_count(n)
        t_cy = (time.perf_counter() - t0) * 1000.0

        results["nqueens"].append({
            "label": f"N={n}",
            "python": round(t_py, 2),
            "cython": round(t_cy, 2),
            "speedup": round(t_py / max(t_cy, 0.0001), 1),
            "solutions": cy_cnt
        })

    # Dijkstra & A*
    for sz in [30, 50, 75, 100]:
        grid_obj = generate_grid(rows=sz, cols=sz, obstacle_density=0.20, seed=42)
        grid = grid_obj["grid"]
        start = tuple(grid_obj["start"])
        goal = tuple(grid_obj["goal"])

        # Dijkstra
        t0 = time.perf_counter()
        py_dijkstra(grid, start, goal, capture_explored=False)
        t_py_d = (time.perf_counter() - t0) * 1000.0

        t0 = time.perf_counter()
        cy_dijkstra(grid, start, goal, capture_explored=False)
        t_cy_d = (time.perf_counter() - t0) * 1000.0

        results["dijkstra"].append({
            "label": f"{sz}x{sz}",
            "python": round(t_py_d, 2),
            "cython": round(t_cy_d, 2),
            "speedup": round(t_py_d / max(t_cy_d, 0.0001), 1)
        })

        # A*
        t0 = time.perf_counter()
        py_astar(grid, start, goal, heuristic_kind="manhattan", capture_explored=False)
        t_py_a = (time.perf_counter() - t0) * 1000.0

        t0 = time.perf_counter()
        cy_astar(grid, start, goal, heuristic_kind="manhattan", capture_explored=False)
        t_cy_a = (time.perf_counter() - t0) * 1000.0

        results["astar"].append({
            "label": f"{sz}x{sz}",
            "python": round(t_py_a, 2),
            "cython": round(t_cy_a, 2),
            "speedup": round(t_py_a / max(t_cy_a, 0.0001), 1)
        })

    return jsonify(results)

@app.route("/api/code/<algo>")
def get_code(algo):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    files = {
        "nqueens": {
            "python": os.path.join(base_dir, "algorithms/python/nqueens.py"),
            "cython": os.path.join(base_dir, "algorithms/cython_ext/c_nqueens.pyx"),
            "notes": [
                "Cython uses 'cdef unsigned int' bitmasks directly mapped to CPU registers.",
                "Recursive calls in Cython execute as raw C function pointer calls without Python frame object creation.",
                "Using 'with nogil' completely releases Python's Global Interpreter Lock."
            ]
        },
        "dijkstra": {
            "python": os.path.join(base_dir, "algorithms/python/dijkstra.py"),
            "cython": os.path.join(base_dir, "algorithms/cython_ext/c_dijkstra.pyx"),
            "notes": [
                "Pure Python relies on 'heapq' with tuple (dist, r, c), incurring Python object allocations per node push.",
                "Cython implements a flat C binary min-heap using a continuous 'HeapNode*' buffer.",
                "Grid distances and visited maps are stored in flat 1D C arrays ('double*', 'unsigned char*') for O(1) single-cycle pointer indexing."
            ]
        },
        "astar": {
            "python": os.path.join(base_dir, "algorithms/python/astar.py"),
            "cython": os.path.join(base_dir, "algorithms/cython_ext/c_astar.pyx"),
            "notes": [
                "Pure Python evaluates heuristic functions through Python interpreter opcode dispatch.",
                "Cython inlines 'cdef inline double c_heuristic(...)' into the C loop for direct hardware FPU arithmetic.",
                "Raw memory allocation via 'malloc' avoids any garbage collection pauses."
            ]
        }
    }

    if algo not in files:
        return jsonify({"error": "Not found"}), 404

    target = files[algo]
    with open(target["python"], "r") as f:
        py_code = f.read()
    with open(target["cython"], "r") as f:
        cy_code = f.read()

    return jsonify({
        "algo": algo,
        "python_code": py_code,
        "cython_code": cy_code,
        "notes": target["notes"]
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"Starting Cython vs CPython benchmark server on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
