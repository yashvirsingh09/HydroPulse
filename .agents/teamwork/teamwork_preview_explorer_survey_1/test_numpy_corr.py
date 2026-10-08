import sys
import numpy as np
import os
sys.path.append(os.path.abspath('d:/STS/hydropulse/physics-engine'))
from pipe_wave_synthesizer import simulate_pipe_leak

for snr in [24, 18, 12, 6]:
    errors = []
    for _ in range(10):
        sc = simulate_pipe_leak(snr_db=float(snr))
        a = np.array(sc['node_a']['samples'], dtype=float)
        b = np.array(sc['node_b']['samples'], dtype=float)
        
        # Standard cross-correlation in numpy
        corr = np.correlate(b, a, mode='full')
        lags = np.arange(-len(a) + 1, len(a))
        best_lag = lags[np.argmax(corr)]
        
        delta_t = best_lag / 10000.0
        est_leak = (500.0 - 1258.1 * delta_t) / 2.0
        err = abs(est_leak - 185.0)
        errors.append(err)
    print(f"SNR {snr} dB (numpy raw cross-corr): Mean Err = {np.mean(errors):.2f} m, Max Err = {np.max(errors):.2f} m")
