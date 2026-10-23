try:
    from .c_nqueens import solve_nqueens_count, solve_nqueens_first
    from .c_dijkstra import dijkstra_grid
    from .c_astar import astar_grid
    __all__ = ["solve_nqueens_count", "solve_nqueens_first", "dijkstra_grid", "astar_grid"]
except ImportError:
    # Extensions not yet compiled
    pass
