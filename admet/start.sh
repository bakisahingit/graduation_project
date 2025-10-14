#!/bin/bash

# Start the FastAPI server in the background
# The --host 0.0.0.0 is important to make it accessible from outside the container if needed
uvicorn admet.main:app --host 0.0.0.0 --port 8000 &

# Start the worker in the foreground
# This will be the main process for the container
python -u -m admet.worker
