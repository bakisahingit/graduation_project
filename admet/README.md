# ADMET Prediction Microservice

This directory contains a Python-based microservice for performing ADMET (Absorption, Distribution, Metabolism, Excretion, and Toxicity) analysis on chemical compounds.

The service is built with **FastAPI** and uses libraries such as **RDKit** and **admet-ai** for its predictions.

---

## ⚙️ API Endpoints

### 1. Run Prediction

Runs the full analysis pipeline for a given molecule.

-   **Endpoint:** `/predict`
-   **Method:** `POST`
-   **Request Body:**

    ```json
    {
      "smiles": "CCO",
      "name": "ethanol"
    }
    ```
    *Note: Either `smiles` or `name` is required.*

-   **Success Response (200 OK):**

    Returns a JSON object containing the full analysis report, including risk scores, pharmacokinetic profiles, and key predictions.

-   **Error Response (500 Internal Server Error):**

    Returns an error detail if the analysis fails for any reason.

### 2. API Status

Checks if the API is running.

-   **Endpoint:** `/`
-   **Method:** `GET`
-   **Response:**

    ```json
    {
      "status": "ADMET API with external data sources is running"
    }
    ```

---

## 🚀 Setup and Running

1.  **Navigate to the project root directory.**

2.  **Create and activate a virtual environment:**

    ```bash
    # Create the virtual environment
    python -m venv admet/venv

    # Activate on Windows
    admet\venv\Scripts\activate

    # Activate on macOS/Linux
    source admet/venv/bin/activate
    ```

3.  **Install dependencies:**

    Make sure your virtual environment is active, then run:
    ```bash
    pip install -r admet/requirements.txt
    ```

4.  **Run the server:**

    From the project\'s **root directory**, run the following command:
    ```bash
    uvicorn admet.main:app --reload
    ```
    The `--reload` flag enables hot-reloading for development. The server will be available at `http://127.0.0.1:8000`
