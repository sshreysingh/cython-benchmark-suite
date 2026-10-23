"""
Pure Python implementation of Dijkstra's Shortest Path Algorithm on a 2D Grid.
Uses standard library heapq and Python dictionaries/lists.
"""

import heapq
from typing import List, Tuple, Dict, Any

def dijkstra_grid(
    grid: List[List[float]],
    start: Tuple[int, int],
    goal: Tuple[int, int],
    capture_explored: bool = True,
    sample_rate: int = 1
) -> Dict[str, Any]:
    """
    Find shortest path from start to goal on a 2D grid.
    Grid values:
        -1: Obstacle / Wall
        >= 0: Movement cost / weight of traversing into that cell (e.g. 1.0 for standard)
    """
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0

    sr, sc = start
    gr, gc = goal

    if sr < 0 or sr >= rows or sc < 0 or sc >= cols or grid[sr][sc] < 0:
        return {"found": False, "cost": -1.0, "path": [], "visited_count": 0, "explored_order": []}
    if gr < 0 or gr >= rows or gc < 0 or gc >= cols or grid[gr][gc] < 0:
        return {"found": False, "cost": -1.0, "path": [], "visited_count": 0, "explored_order": []}

    # Distance matrix
    dist = [[float('inf')] * cols for _ in range(rows)]
    parent = [[None] * cols for _ in range(rows)]
    visited = [[False] * cols for _ in range(rows)]

    dist[sr][sc] = 0.0
    # Min-heap: (current_distance, r, c)
    pq = [(0.0, sr, sc)]

    explored_order = []
    visited_count = 0
    found = False

    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    while pq:
        d, r, c = heapq.heappop(pq)

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
                    # default step cost 1.0 + cell weight
                    new_dist = d + 1.0 + cell_weight
                    if new_dist < dist[nr][nc]:
                        dist[nr][nc] = new_dist
                        parent[nr][nc] = (r, c)
                        heapq.heappush(pq, (new_dist, nr, nc))

    path = []
    if found:
        curr = (gr, gc)
        while curr is not None:
            path.append(list(curr))
            curr = parent[curr[0]][curr[1]]
        path.reverse()

    return {
        "found": found,
        "cost": float(dist[gr][gc]) if found else -1.0,
        "path": path,
        "visited_count": visited_count,
        "explored_order": explored_order
    }
