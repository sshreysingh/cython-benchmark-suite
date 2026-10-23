"""
Pure Python implementation of A* (A-Star) Shortest Path Search on a 2D Grid.
Uses standard library heapq, tracking g_score and f_score.
"""

import heapq
import math
from typing import List, Tuple, Dict, Any

def heuristic(r1: int, c1: int, r2: int, c2: int, kind: str = "manhattan") -> float:
    if kind == "euclidean":
        return math.hypot(r1 - r2, c1 - c2)
    # Default Manhattan distance
    return abs(r1 - r2) + abs(c1 - c2)

def astar_grid(
    grid: List[List[float]],
    start: Tuple[int, int],
    goal: Tuple[int, int],
    heuristic_kind: str = "manhattan",
    capture_explored: bool = True,
    sample_rate: int = 1
) -> Dict[str, Any]:
    """
    Find shortest path from start to goal using A* algorithm.
    Grid values:
        -1: Obstacle / Wall
        >= 0: Movement cost / weight of cell
    """
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0

    sr, sc = start
    gr, gc = goal

    if sr < 0 or sr >= rows or sc < 0 or sc >= cols or grid[sr][sc] < 0:
        return {"found": False, "cost": -1.0, "path": [], "visited_count": 0, "explored_order": []}
    if gr < 0 or gr >= rows or gc < 0 or gc >= cols or grid[gr][gc] < 0:
        return {"found": False, "cost": -1.0, "path": [], "visited_count": 0, "explored_order": []}

    g_score = [[float('inf')] * cols for _ in range(rows)]
    f_score = [[float('inf')] * cols for _ in range(rows)]
    parent = [[None] * cols for _ in range(rows)]
    visited = [[False] * cols for _ in range(rows)]

    g_score[sr][sc] = 0.0
    h_start = heuristic(sr, sc, gr, gc, heuristic_kind)
    f_score[sr][sc] = h_start

    # Min-heap: (f_score, g_score, r, c)
    pq = [(f_score[sr][sc], 0.0, sr, sc)]

    explored_order = []
    visited_count = 0
    found = False

    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    while pq:
        f, g, r, c = heapq.heappop(pq)

        if visited[r][c]:
            continue
        visited[r][c] = True
        visited_count += 1

        if capture_explored and (visited_count % sample_rate == 0 or (r == gr and c == gc)):
            explored_order.append([r, c])

        if r == gr and c == gc:
            found = True
            break

        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                cell_weight = grid[nr][nc]
                if cell_weight >= 0 and not visited[nr][nc]:
                    tentative_g = g + 1.0 + cell_weight
                    if tentative_g < g_score[nr][nc]:
                        g_score[nr][nc] = tentative_g
                        h = heuristic(nr, nc, gr, gc, heuristic_kind)
                        f = tentative_g + h
                        f_score[nr][nc] = f
                        parent[nr][nc] = (r, c)
                        heapq.heappush(pq, (f, tentative_g, nr, nc))

    path = []
    if found:
        curr = (gr, gc)
        while curr is not None:
            path.append(list(curr))
            curr = parent[curr[0]][curr[1]]
        path.reverse()

    return {
        "found": found,
        "cost": float(g_score[gr][gc]) if found else -1.0,
        "path": path,
        "visited_count": visited_count,
        "explored_order": explored_order
    }
