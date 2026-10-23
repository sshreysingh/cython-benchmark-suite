# cython: language_level=3
# cython: boundscheck=False
# cython: wraparound=False
# cython: cdivision=True

"""
High-performance Cython implementation of A* (A-Star) Search on a 2D grid.
Uses flat C buffers, fast inlined heuristics, custom min-heap, and nogil execution.
"""

from libc.stdlib cimport malloc, free, realloc
from libc.math cimport sqrt, fabs
from libc.float cimport DBL_MAX

cdef struct AStarHeapNode:
    double f_score
    double g_score
    int r
    int c

cdef struct AStarMinHeap:
    AStarHeapNode *data
    int size
    int capacity

cdef AStarMinHeap* heap_create(int initial_cap) noexcept nogil:
    cdef AStarMinHeap *h = <AStarMinHeap *>malloc(sizeof(AStarMinHeap))
    if h == NULL:
        return NULL
    h.data = <AStarHeapNode *>malloc(initial_cap * sizeof(AStarHeapNode))
    h.size = 0
    h.capacity = initial_cap
    return h

cdef void heap_destroy(AStarMinHeap *h) noexcept nogil:
    if h != NULL:
        if h.data != NULL:
            free(h.data)
        free(h)

cdef void heap_push(AStarMinHeap *h, double f_score, double g_score, int r, int c) noexcept nogil:
    if h.size >= h.capacity:
        h.capacity *= 2
        h.data = <AStarHeapNode *>realloc(h.data, h.capacity * sizeof(AStarHeapNode))

    cdef int idx = h.size
    h.size += 1

    cdef int parent_idx
    cdef AStarHeapNode temp

    h.data[idx].f_score = f_score
    h.data[idx].g_score = g_score
    h.data[idx].r = r
    h.data[idx].c = c

    # Bubble up
    while idx > 0:
        parent_idx = (idx - 1) >> 1
        if h.data[idx].f_score < h.data[parent_idx].f_score:
            temp = h.data[idx]
            h.data[idx] = h.data[parent_idx]
            h.data[parent_idx] = temp
            idx = parent_idx
        else:
            break

cdef int heap_pop(AStarMinHeap *h, AStarHeapNode *out) noexcept nogil:
    if h.size == 0:
        return 0

    out[0] = h.data[0]
    h.size -= 1

    if h.size == 0:
        return 1

    h.data[0] = h.data[h.size]

    cdef int idx = 0
    cdef int left, right, smallest
    cdef AStarHeapNode temp

    # Bubble down
    while True:
        left = (idx << 1) + 1
        right = left + 1
        smallest = idx

        if left < h.size and h.data[left].f_score < h.data[smallest].f_score:
            smallest = left
        if right < h.size and h.data[right].f_score < h.data[smallest].f_score:
            smallest = right

        if smallest != idx:
            temp = h.data[idx]
            h.data[idx] = h.data[smallest]
            h.data[smallest] = temp
            idx = smallest
        else:
            break

    return 1


cdef inline double c_heuristic(int r1, int c1, int r2, int c2, int is_euclidean) noexcept nogil:
    cdef double dr = <double>(r1 - r2)
    cdef double dc = <double>(c1 - c2)
    if is_euclidean:
        return sqrt(dr * dr + dc * dc)
    return fabs(dr) + fabs(dc)


def astar_grid(
    list grid,
    tuple start,
    tuple goal,
    str heuristic_kind="manhattan",
    bint capture_explored=True,
    int sample_rate=1
):
    """
    Cython A* shortest path search on 2D grid.
    """
    cdef int rows = len(grid)
    if rows == 0:
        return {"found": False, "cost": -1.0, "path": [], "visited_count": 0, "explored_order": []}
    cdef int cols = len(grid[0])

    cdef int sr = start[0]
    cdef int sc = start[1]
    cdef int gr = goal[0]
    cdef int gc = goal[1]

    if sr < 0 or sr >= rows or sc < 0 or sc >= cols or grid[sr][sc] < 0:
        return {"found": False, "cost": -1.0, "path": [], "visited_count": 0, "explored_order": []}
    if gr < 0 or gr >= rows or gc < 0 or gc >= cols or grid[gr][gc] < 0:
        return {"found": False, "cost": -1.0, "path": [], "visited_count": 0, "explored_order": []}

    cdef int is_euclidean = 1 if heuristic_kind == "euclidean" else 0
    cdef int total_cells = rows * cols
    cdef double *c_grid = <double *>malloc(total_cells * sizeof(double))
    cdef double *g_score = <double *>malloc(total_cells * sizeof(double))
    cdef double *f_score = <double *>malloc(total_cells * sizeof(double))
    cdef int *parent = <int *>malloc(total_cells * sizeof(int))
    cdef unsigned char *visited = <unsigned char *>malloc(total_cells * sizeof(unsigned char))

    cdef int r, c, idx
    for r in range(rows):
        row_vals = grid[r]
        for c in range(cols):
            idx = r * cols + c
            c_grid[idx] = <double>(row_vals[c])
            g_score[idx] = DBL_MAX
            f_score[idx] = DBL_MAX
            parent[idx] = -1
            visited[idx] = 0

    cdef int start_idx = sr * cols + sc
    cdef int goal_idx = gr * cols + gc
    g_score[start_idx] = 0.0
    cdef double h_start = c_heuristic(sr, sc, gr, gc, is_euclidean)
    f_score[start_idx] = h_start

    cdef AStarMinHeap *heap = heap_create(total_cells // 4 + 64)
    heap_push(heap, h_start, 0.0, sr, sc)

    cdef AStarHeapNode curr
    cdef int visited_count = 0
    cdef int found = 0
    cdef int nr, nc, n_idx
    cdef double tentative_g, cell_w, h, f
    cdef int dr[4]
    cdef int dc[4]
    dr[0] = -1; dr[1] = 1; dr[2] = 0; dr[3] = 0
    dc[0] = 0;  dc[1] = 0; dc[2] = -1; dc[3] = 1
    cdef int i

    explored_order = []

    with nogil:
        while heap.size > 0:
            if not heap_pop(heap, &curr):
                break

            idx = curr.r * cols + curr.c
            if visited[idx]:
                continue
            visited[idx] = 1
            visited_count += 1

            if curr.r == gr and curr.c == gc:
                found = 1
                break

            for i in range(4):
                nr = curr.r + dr[i]
                nc = curr.c + dc[i]
                if 0 <= nr < rows and 0 <= nc < cols:
                    n_idx = nr * cols + nc
                    cell_w = c_grid[n_idx]
                    if cell_w >= 0 and not visited[n_idx]:
                        tentative_g = curr.g_score + 1.0 + cell_w
                        if tentative_g < g_score[n_idx]:
                            g_score[n_idx] = tentative_g
                            h = c_heuristic(nr, nc, gr, gc, is_euclidean)
                            f = tentative_g + h
                            f_score[n_idx] = f
                            parent[n_idx] = idx
                            heap_push(heap, f, tentative_g, nr, nc)

    # Reconstruct path and sample visited cells
    path = []
    cdef double final_cost = -1.0
    if found:
        final_cost = g_score[goal_idx]
        curr_idx = goal_idx
        while curr_idx != -1:
            path.append([curr_idx // cols, curr_idx % cols])
            curr_idx = parent[curr_idx]
        path.reverse()

    if capture_explored:
        for r in range(rows):
            for c in range(cols):
                idx = r * cols + c
                if visited[idx] and (idx % sample_rate == 0 or idx == goal_idx or idx == start_idx):
                    explored_order.append([r, c])

    heap_destroy(heap)
    free(c_grid)
    free(g_score)
    free(f_score)
    free(parent)
    free(visited)

    return {
        "found": bool(found),
        "cost": final_cost,
        "path": path,
        "visited_count": visited_count,
        "explored_order": explored_order
    }
