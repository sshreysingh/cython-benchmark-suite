# cython: language_level=3
# cython: boundscheck=False
# cython: wraparound=False
# cython: cdivision=True

"""
High-performance Cython implementation of N-Queens Solver.
Directly uses C-level unsigned integers, bitwise operations,
and fast C-call recursion without Python object wrapping.
"""

from libc.stdlib cimport malloc, free

cdef void c_backtrack(unsigned int cols, unsigned int diag1, unsigned int diag2, unsigned int all_queens, unsigned long long *count) noexcept nogil:
    if cols == all_queens:
        count[0] += 1
        return

    cdef unsigned int available = (~(cols | diag1 | diag2)) & all_queens
    cdef unsigned int bit

    while available:
        bit = available & -available
        available -= bit
        c_backtrack(
            cols | bit,
            (diag1 | bit) << 1,
            (diag2 | bit) >> 1,
            all_queens,
            count
        )

def solve_nqueens_count(int n):
    """
    Count all distinct solutions to the N-Queens problem using optimized Cython.
    """
    if n <= 0 or n > 31:
        return 0

    cdef unsigned int all_queens = (1 << n) - 1
    cdef unsigned long long total = 0

    with nogil:
        c_backtrack(0, 0, 0, all_queens, &total)

    return total


cdef int c_backtrack_first(int row, int n, unsigned int cols, unsigned int diag1, unsigned int diag2, unsigned int all_queens, int *placement) noexcept nogil:
    if row == n:
        return 1

    cdef unsigned int available = (~(cols | diag1 | diag2)) & all_queens
    cdef unsigned int bit
    cdef unsigned int temp
    cdef int col

    while available:
        bit = available & -available
        available -= bit
        
        # Calculate bit position (log2 of power of 2)
        col = 0
        temp = bit
        while temp > 1:
            temp >>= 1
            col += 1

        placement[row] = col
        if c_backtrack_first(row + 1, n, cols | bit, (diag1 | bit) << 1, (diag2 | bit) >> 1, all_queens, placement):
            return 1
        placement[row] = -1

    return 0

def solve_nqueens_first(int n):
    """
    Find the first valid placement of N queens on an N x N board.
    Returns a Python list of queen column positions.
    """
    if n <= 0:
        return []

    cdef int *placement = <int *>malloc(n * sizeof(int))
    cdef unsigned int all_queens = (1 << n) - 1
    cdef int i

    for i in range(n):
        placement[i] = -1

    cdef int found = 0
    with nogil:
        found = c_backtrack_first(0, n, 0, 0, 0, all_queens, placement)

    result = []
    if found:
        for i in range(n):
            result.append(placement[i])

    free(placement)
    return result
