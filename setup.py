from setuptools import setup, Extension
from Cython.Build import cythonize
import sys

extra_compile_args = ["-O3"]
if sys.platform != "win32":
    extra_compile_args.extend(["-Wall", "-Wno-unreachable-code"])

extensions = [
    Extension(
        "algorithms.cython_ext.c_nqueens",
        ["algorithms/cython_ext/c_nqueens.pyx"],
        extra_compile_args=extra_compile_args
    ),
    Extension(
        "algorithms.cython_ext.c_dijkstra",
        ["algorithms/cython_ext/c_dijkstra.pyx"],
        extra_compile_args=extra_compile_args
    ),
    Extension(
        "algorithms.cython_ext.c_astar",
        ["algorithms/cython_ext/c_astar.pyx"],
        extra_compile_args=extra_compile_args
    ),
]

setup(
    name="cython_benchmark_suite",
    packages=["algorithms", "algorithms.python", "algorithms.cython_ext"],
    ext_modules=cythonize(extensions, language_level=3, compiler_directives={'binding': True})
)
