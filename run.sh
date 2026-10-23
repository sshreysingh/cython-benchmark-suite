#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
fi

echo "Compiling Cython extensions..."
./venv/bin/python setup.py build_ext --inplace

case "$1" in
    benchmark)
        shift
        echo "Running CLI benchmark suite..."
        ./venv/bin/python benchmark.py "$@"
        ;;
    web|"")
        echo "Launching web dashboard on http://localhost:5001..."
        ./venv/bin/python app.py
        ;;
    *)
        echo "Usage: $0 [benchmark|web]"
        exit 1
        ;;
esac
