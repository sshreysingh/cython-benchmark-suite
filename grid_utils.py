"""
Grid and terrain generator utilities for Dijkstra and A* benchmarks.
Supports random obstacles, weighted terrain, and guaranteed solvability.
"""

import random
from typing import List, Tuple, Dict, Any

def generate_grid(
    rows: int = 50,
    cols: int = 50,
    obstacle_density: float = 0.20,
    weighted_density: float = 0.25,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Generate a 2D grid with obstacles and weighted terrain.
    - 0.0: standard open terrain (cost 1.0)
    - > 0.0: rough terrain (cost 1.0 + weight)
    - -1.0: obstacle / impassable wall
    Guarantees a viable path exists from (0, 0) to (rows-1, cols-1).
    """
    rng = random.Random(seed)
    grid = [[0.0 for _ in range(cols)] for _ in range(rows)]

    # Populate obstacles and weights
    for r in range(rows):
        for c in range(cols):
            # Reserve corners
            if (r == 0 and c == 0) or (r == rows - 1 and c == cols - 1):
                continue
            p = rng.random()
            if p < obstacle_density:
                grid[r][c] = -1.0
            elif p < obstacle_density + weighted_density:
                # Weighted terrain (e.g., mud/swamp)
                grid[r][c] = round(rng.uniform(1.5, 5.0), 1)

    # Carve guaranteed path from start to goal
    cr, cc = 0, 0
    grid[0][0] = 0.0
    while cr < rows - 1 or cc < cols - 1:
        if cr < rows - 1 and (cc == cols - 1 or rng.random() < 0.5):
            cr += 1
        else:
            cc += 1
        # Clear obstacles on guaranteed path
        if grid[cr][cc] < 0:
            grid[cr][cc] = 0.0

    return {
        "rows": rows,
        "cols": cols,
        "start": [0, 0],
        "goal": [rows - 1, cols - 1],
        "grid": grid,
        "seed": seed
    }
