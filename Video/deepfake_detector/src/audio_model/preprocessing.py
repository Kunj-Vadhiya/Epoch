"""Documented log-Mel preprocessing for the reconstructed checkpoint."""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import torch
from scipy.io import wavfile
from scipy.signal import resample_poly

SAMPLE_RATE = 16_000
N_MELS = 64
N_FFT = 1024
HOP_LENGTH = 512
TIME_FRAMES = 313
WINDOW_SAMPLES = 160_000  # 10 seconds; implied by 313 frames at this hop.


def load_wav(path: str | Path) -> tuple[np.ndarray, float]:
    """Load a WAV, convert to mono/float32, and resample to 16 kHz."""
    try:
        source_rate, audio = wavfile.read(str(path))
    except (OSError, ValueError) as exc:
        raise ValueError(f"Could not read WAV audio: {exc}") from exc
    if audio.size == 0:
        raise ValueError("Audio file is empty")
    if audio.ndim == 2:
        audio = audio.mean(axis=1)
    if np.issubdtype(audio.dtype, np.integer):
        info = np.iinfo(audio.dtype)
        scale = max(abs(info.min), info.max)
        audio = audio.astype(np.float32) / scale
    else:
        audio = audio.astype(np.float32)
    if not np.isfinite(audio).all():
        raise ValueError("Audio contains non-finite samples")
    if source_rate != SAMPLE_RATE:
        gcd = math.gcd(int(source_rate), SAMPLE_RATE)
        audio = resample_poly(audio, SAMPLE_RATE // gcd, source_rate // gcd)
    duration = len(audio) / SAMPLE_RATE
    return audio.astype(np.float32), duration


def _mel_filterbank(sample_rate: int, n_fft: int, n_mels: int) -> torch.Tensor:
    """Build the conventional Slaney-style triangular Mel filterbank.

    The original training implementation is absent, so this choice is
    explicit rather than presented as recovered fact.
    """
    low_mel = 1127.0 * math.log1p(20.0 / 700.0)
    high_mel = 1127.0 * math.log1p((sample_rate / 2) / 700.0)
    points = torch.linspace(low_mel, high_mel, n_mels + 2)
    hz = 700.0 * (torch.exp(points / 1127.0) - 1.0)
    bins = torch.floor((n_fft + 1) * hz / sample_rate).long()
    bank = torch.zeros(n_mels, n_fft // 2 + 1)
    for index in range(n_mels):
        left, center, right = bins[index : index + 3].tolist()
        if center > left:
            bank[index, left:center] = torch.arange(left, center) - left
            bank[index, left:center] /= center - left
        if right > center:
            bank[index, center:right] = (right - torch.arange(center, right))
            bank[index, center:right] /= right - center
    return bank


def log_mel_window(audio: np.ndarray) -> torch.Tensor:
    """Return one [1, 64, 313] model input with zero padding."""
    if audio.size == 0:
        raise ValueError("Audio window is empty")
    window = np.zeros(WINDOW_SAMPLES, dtype=np.float32)
    window[: min(audio.size, WINDOW_SAMPLES)] = audio[:WINDOW_SAMPLES]
    waveform = torch.from_numpy(window)
    stft = torch.stft(
        waveform,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
        win_length=N_FFT,
        window=torch.hann_window(N_FFT),
        center=True,
        return_complex=True,
    )
    power = stft.abs().square()
    mel = _mel_filterbank(SAMPLE_RATE, N_FFT, N_MELS) @ power
    features = torch.log(torch.clamp(mel, min=1e-10))
    if features.shape != (N_MELS, TIME_FRAMES):
        raise RuntimeError(f"Unexpected log-Mel shape {tuple(features.shape)}")
    return features.unsqueeze(0)
