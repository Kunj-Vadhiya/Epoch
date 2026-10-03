#!/bin/bash
# ==============================================================================
# Google Colab NVIDIA T4 Deepfake Detector Runner Script
# ==============================================================================

set -e

echo "=== 1. Checking NVIDIA GPU ==="
nvidia-smi

echo "=== 2. Installing Dependencies ==="
pip install -r requirements.txt

echo "=== 3. Running Test Suite ==="
pytest -v tests/test_pipeline.py

echo "=== 4. Running Training & Evaluation with AMP ==="
python src/train.py --config configs/config.yaml

echo "=== 5. Training Completed Successfully! Check outputs/ for plots and checkpoints ==="
