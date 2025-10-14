FROM mambaorg/micromamba:1.4.0

# Use micromamba to install RDKit and heavy scientific deps from conda-forge fast and reliably
WORKDIR /app

# Install core Python packages (RDKit from conda-forge is much faster than building from source)
RUN micromamba install -y -n base -c conda-forge \
    python=3.11 \
    rdkit=2024.* \
    numpy \
    pandas \
    pillow \
    chembl_webresource_client \
    pubchempy \
    uvicorn \
    fastapi \
    && micromamba clean -afy

# Copy requirements and install remaining pip-only packages but exclude rdkit (already installed)
COPY admet/requirements.txt ./requirements.txt
RUN grep -vE '^rdkit' requirements.txt > req_no_rdkit.txt || cp requirements.txt req_no_rdkit.txt
# Run pip via micromamba to ensure the conda-installed python/pip are used
RUN micromamba run -n base pip install --no-cache-dir -r req_no_rdkit.txt

# --- EKLEDIĞIM SATIR BAŞLANGICI ---
# PyTorch 2.6+ versiyonundaki 'weights_only=True' varsayılan ayarından kaynaklanan hatayı düzeltir.
# chemprop kütüphanesindeki ilgili torch.load() çağrısına 'weights_only=False' parametresini ekler.
RUN sed -i "s/torch.load(path, map_location=lambda storage, loc: storage)/torch.load(path, map_location=lambda storage, loc: storage, weights_only=False)/" /opt/conda/lib/python3.11/site-packages/chemprop/utils.py
# --- EKLEDIĞIM SATIR SONU ---

# Copy source
COPY admet/ ./admet/

# Copy the start script
COPY admet/start.sh /app/start.sh

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# Run the script using bash, which doesn't require the executable bit
CMD ["/bin/bash", "/app/start.sh"]