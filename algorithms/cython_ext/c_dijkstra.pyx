# cython: language_level=3
# cython: boundscheck=False
# cython: wraparound=False
# cython: cdivision=True

"""
High-performance Cython implementation of Dijkstra's Algorithm on a 2D grid.
Uses flat C memory buffers, raw pointers, and a fast binary min-heap in C.
"""

from libc.stdlib cimport malloc, free, realloc
from libc.float cimport DBL_MAX

cdef struct HeapNode:
    double priority
    int r
    int c

cdef struct MinHeap:
    HeapNode *data
    int size
    int capacity

cdef MinHeap* heap_create(int initial_cap) noexcept nogil:
    cdef MinHeap *h = <MinHeap *>malloc(sizeof(MinHeap))
    if h == NULL:
        return NULL
    h.data = <HeapNode *>malloc(initial_cap * sizeof(HeapNode))
    h.size = 0
    h.capacity = initial_cap
    return h

cdef void heap_destroy(MinHeap *h) noexcept nogil:
    if h != NULL:
        if h.data != NULL:
            free(h.data)
        free(h)

cdef void heap_push(MinHeap *h, double priority, int r, int c) noexcept nogil:
    if h.size >= h.capacity:
        h.capacity *= 2
        h.data = <HeapNode *>realloc(h.data, h.capacity * sizeof(HeapNode))

    cdef int idx = h.size
    h.size += 1

    cdef int parent_idx
    cdef HeapNode temp

    h.data[idx].priority = priority
    h.data[idx].r = r
    h.data[idx].c = c

    # Bubble up
    while idx > 0:
        parent_idx = (idx - 1) >> 1
        if h.data[idx].priority < h.data[parent_idx].priority:
            temp = h.data[idx]
            h.data[idx] = h.data[parent_idx]
            h.data[parent_idx] = temp
            idx = parent_idx
        else:
            break

cdef int heap_pop(MinHeap *h, HeapNode *out) noexcept nogil:
    if h.size == 0:
        return 0

    out[0] = h.data[0]
    h.size -= 1

    if h.size == 0:
        return 1

    h.data[0] = h.data[h.size]

    cdef int idx = 0
    cdef int left, right, smallest
    cdef HeapNode temp

    # Bubble down
    while True:
        left = (idx << 1) + 1
        right = left + 1
        smallest = idx

        if left < h.size and h.data[left].priority < h.data[smallest].priority:
            smallest = left
        if right < h.size and h.data[right].priority < h.data[smallest].priority:
            smallest = right

        if smallest != idx:
            temp = h.data[idx]
            h.data[idx] = h.data[smallest]
            h.data[smallest] = temp
            idx = smallest
        else:
            break

    return 1


def dijkstra_grid(
    list grid,
    tuple start,
    tuple goal,
    bint capture_explored=True,
    int sample_rate=1
):
    """
    Cython Dijkstra shortest path on 2D grid.
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

    cdef int total_cells = rows * cols
    cdef double *c_grid = <double *>malloc(total_cells * sizeof(double))
    cdef double *dist = <double *>malloc(total_cells * sizeof(double))
    cdef int *parent = <int *>malloc(total_cells * sizeof(int))
    cdef unsigned char *visited = <unsigned char *>malloc(total_cells * sizeof(unsigned char))

    cdef int r, c, idx
    for r in range(rows):
        row_vals = grid[r]
        for c in range(cols):
            idx = r * cols + c
            c_grid[idx] = <double>(row_vals[c])
            dist[idx] = DBL_MAX
            parent[idx] = -1
            visited[idx] = 0

    cdef int start_idx = sr * cols + sc
    cdef int goal_idx = gr * cols + gc
    dist[start_idx] = 0.0

    cdef MinHeap *heap = heap_create(total_cells // 4 + 64)
    heap_push(heap, 0.0, sr, sc)

    cdef HeapNode curr
    cdef int visited_count = 0
    cdef int found = 0
    cdef int nr, nc, n_idx
    cdef double new_dist, cell_w
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
                        new_dist = curr.priority + 1.0 + cell_w
                        if new_dist < dist[n_idx]:
                            dist[n_idx] = new_dist
                            parent[n_idx] = idx
                            heap_push(heap, new_dist, nr, nc)

    # Reconstruct path and sample explored order if needed
    path = []
    cdef double final_cost = -1.0
    if found:
        final_cost = dist[goal_idx]
        curr_idx = goal_idx
        while curr_idx != -1:
            path.append([curr_idx // cols, curr_idx % cols])
            curr_idx = parent[curr_idx]
        path.reverse()

    if capture_explored:
        # Collect visited cells for visualization
        for r in range(rows):
            for c in range(cols):
                idx = r * cols + c
                if visited[idx] and (idx % sample_rate == 0 or idx == goal_idx or idx == start_idx):
                    explored_order.append([r, c])

    heap_destroy(heap)
    free(c_grid)
    free(dist)
    free(parent)
    free(visited)

    return {
        "found": bool(found),
        "cost": final_cost,
        "path": path,
        "visited_count": visited_count,
        "explored_order": explored_order
    }
