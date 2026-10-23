"""
Pure Python implementation of N-Queens Solver.
Uses bitmask-based backtracking to explore solutions efficiently.
"""

def solve_nqueens_count(n: int) -> int:
    """
    Count all distinct solutions to the N-Queens problem using pure Python.
    cols: bitmask of columns under attack
    diag1: bitmask of diagonals (row - col) under attack
    diag2: bitmask of anti-diagonals (row + col) under attack
    """
    all_queens = (1 << n) - 1
    count = 0

    def backtrack(cols: int, diag1: int, diag2: int):
        nonlocal count
        if cols == all_queens:
            count += 1
            return

        # Available positions in current row (0 means occupied/attacked, 1 means safe)
        available = ~(cols | diag1 | diag2) & all_queens
        while available:
            # Pick lowest safe bit
            bit = available & -available
            available -= bit
            backtrack(
                cols | bit,
                (diag1 | bit) << 1,
                (diag2 | bit) >> 1
            )

    backtrack(0, 0, 0)
    return count


def solve_nqueens_first(n: int) -> list:
    """
    Find the first valid placement of N queens on an N x N board.
    Returns a list of length n, where index is row and value is column.
    """
    all_queens = (1 << n) - 1
    placement = [-1] * n

    def backtrack(row: int, cols: int, diag1: int, diag2: int) -> bool:
        if row == n:
            return True

        available = ~(cols | diag1 | diag2) & all_queens
        while available:
            bit = available & -available
            available -= bit
            col = (bit.bit_length() - 1)
            placement[row] = col
            if backtrack(
                row + 1,
                cols | bit,
                (diag1 | bit) << 1,
                (diag2 | bit) >> 1
            ):
                return True
            placement[row] = -1
        return False

    backtrack(0, 0, 0, 0)
    return placement
