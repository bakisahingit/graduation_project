#!/bin/bash

# Start the FastAPI server in the background
# The --host 0.0.0.0 is important to make it accessible from outside the container if needed
uvicorn admet.main:app --host 0.0.0.0 --port 8000 &

# Wait for the API to be ready
echo "Waiting for ADMET API to start on port 8000..."
python -c "import socket, time;
while True:
    try:
        with socket.create_connection(('localhost', 8000), timeout=1):
            break
    except (ConnectionRefusedError, OSError):
        time.sleep(1)
"
echo "ADMET API is ready! Starting worker..."

# Start the worker in the foreground
# This will be the main process for the container
python -u -m admet.worker
