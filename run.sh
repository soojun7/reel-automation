#!/bin/bash
# Reel Automation Pipeline Runner

cd "$(dirname "$0")"

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Run CLI
python src/cli.py "$@"
