# admet/notifications.py
"""Backend notification utilities - lightweight module without heavy ADMET dependencies."""

import os
import requests

BACKEND_URL = os.environ.get("ADMET_BACKEND_URL", "http://localhost:3000")
BACKEND_TIMEOUT_SECONDS = 30

def notify_backend(payload):
    """Notifies the backend that the task is complete."""
    try:
        url = f"{BACKEND_URL}/api/task-complete"
        print(f"Notifying backend at {url} for session {payload['sessionId']}")
        requests.post(url, json=payload, timeout=BACKEND_TIMEOUT_SECONDS)
    except requests.exceptions.RequestException as e:
        print(f"COULD NOT NOTIFY BACKEND for session {payload['sessionId']}: {e}")
