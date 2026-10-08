import sys
import numpy as np
import os
sys.path.append(os.path.abspath('d:/STS/hydropulse/physics-engine'))
from pipe_wave_synthesizer import calculate_korteweg_velocity, generate_transient_pulse

v_s = calculate_korteweg_velocity(0.4, 0.012)
sample_rate = 10000
dist_a = 185.0
dist_b = 315.0

time_delay_a = dist_a / v_s
time_delay_b = dist_b / v_s

shift_a = int(round(time_delay_a * sample_rate))
shift_b = int(round(time_delay_b * sample_rate))

clean_pulse = generate_transient_pulse(sample_rate, 1.0)
gain_a = np.exp(-0.0012 * dist_a)
gain_b = np.exp(-0.0012 * dist_b)

total_samples = 10000
sig_a = np.zeros(total_samples)
sig_b = np.zeros(total_samples)

sig_a[shift_a:] = clean_pulse[:total_samples - shift_a] * gain_a
sig_b[shift_b:] = clean_pulse[:total_samples - shift_b] * gain_b

print(f"Shift A: {shift_a}, Shift B: {shift_b}, Shift diff (B - A): {shift_b - shift_a}")
print(f"Max sig_a: {np.max(np.abs(sig_a))}, Max sig_b: {np.max(np.abs(sig_b))}")

snr_db = 6.0
noise_sigma = 10 ** (-snr_db / 20.0)
print(f"Noise sigma at 6dB: {noise_sigma}")
print(f"Ratio of signal peak to noise sigma: {np.max(np.abs(sig_a)) / noise_sigma:.2f}")

# Cross correlation of CLEAN sig_a and sig_b
corr_clean = np.correlate(sig_b, sig_a, mode='full')
lags = np.arange(-total_samples + 1, total_samples)
best_clean_lag = lags[np.argmax(corr_clean)]
print(f"Best clean lag: {best_clean_lag}")
