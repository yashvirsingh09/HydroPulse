"""
HydroPulse Acoustic Physics Engine: Pipe Wave Synthesizer
Simulates high-fidelity acoustic pressure transients in water distribution networks.
Models Korteweg wave velocity, fluid attenuation, and urban traffic noise.
"""

import numpy as np
import json
import os

# Physical Constants
BULK_MODULUS_WATER_PA = 2.15e9       # K (Pascals)
WATER_DENSITY_KG_M3 = 1000.0         # rho (kg/m^3)
YOUNGS_MODULUS_DUCTILE_IRON = 2.0e11 # E (Pascals)

def calculate_korteweg_velocity(diameter_m: float, wall_thickness_m: float, youngs_modulus_pa: float = YOUNGS_MODULUS_DUCTILE_IRON) -> float:
    """
    Computes fluid-structure acoustic wave velocity via Korteweg formula.
    """
    k = BULK_MODULUS_WATER_PA
    rho = WATER_DENSITY_KG_M3
    e = wall_thickness_m
    d = diameter_m
    
    denominator = 1.0 + (k / youngs_modulus_pa) * (d / e)
    v_s = np.sqrt((k / rho) / denominator)
    return float(v_s)

def generate_transient_pulse(sample_rate: int = 10000, duration_sec: float = 1.0, center_freq: float = 850.0) -> np.ndarray:
    """
    Generates a realistic acoustic water hammer / rupture transient:
    A causal physical wavefront with exponential decay and pipe resonance modes.
    """
    t = np.linspace(0, duration_sec, int(sample_rate * duration_sec), endpoint=False)
    t0 = 0.05  # Burst originates at 50ms in source reference time
    
    # Sharp impulse wavefront
    sigma = 0.004
    pulse = np.exp(-0.5 * ((t - t0) / sigma) ** 2)
    
    # Causal resonant ring-down (active only for t >= t0)
    ringing = np.where(
        t >= t0,
        np.sin(2.0 * np.pi * center_freq * (t - t0)) * np.exp(-(t - t0) * 150.0),
        0.0
    )
    
    transient = 0.7 * pulse + 0.3 * ringing
    return transient

def simulate_pipe_leak(
    pipe_length_m: float = 500.0,
    leak_distance_from_node_a_m: float = 185.0,
    pipe_diameter_m: float = 0.4,       # 400 mm
    wall_thickness_m: float = 0.012,    # 12 mm
    sample_rate: int = 10000,
    snr_db: float = 18.0
):
    """
    Simulates dual acoustic hydrophones capturing a rupture at leak_distance_from_node_a_m.
    Returns synchronized sensor readings and ground-truth metrics.
    """
    v_s = calculate_korteweg_velocity(pipe_diameter_m, wall_thickness_m)
    
    dist_a = leak_distance_from_node_a_m
    dist_b = pipe_length_m - leak_distance_from_node_a_m
    
    time_delay_a = dist_a / v_s
    time_delay_b = dist_b / v_s
    
    delta_t_true = time_delay_b - time_delay_a
    
    total_samples = int(sample_rate * 1.0)
    t = np.linspace(0, 1.0, total_samples, endpoint=False)
    
    # Base transient source
    clean_pulse = generate_transient_pulse(sample_rate, duration_sec=1.0)
    
    # Delay shifts in samples
    shift_a = int(round(time_delay_a * sample_rate))
    shift_b = int(round(time_delay_b * sample_rate))
    
    sig_a = np.zeros(total_samples)
    sig_b = np.zeros(total_samples)
    
    # Attenuation model: A(d) = A0 * exp(-alpha * d)
    alpha = 0.0012
    gain_a = np.exp(-alpha * dist_a)
    gain_b = np.exp(-alpha * dist_b)
    
    if shift_a < total_samples:
        sig_a[shift_a:] = clean_pulse[:total_samples - shift_a] * gain_a
    if shift_b < total_samples:
        sig_b[shift_b:] = clean_pulse[:total_samples - shift_b] * gain_b
        
    # Uncorrelated urban traffic rumble (independent surface vibrations across 500m distance)
    t_vibe = np.linspace(0, 1.0, total_samples, endpoint=False)
    traffic_noise_a = 0.06 * np.sin(2 * np.pi * 38.0 * t_vibe) + np.random.normal(0, 0.04, total_samples)
    traffic_noise_b = 0.06 * np.sin(2 * np.pi * 54.0 * t_vibe) + np.random.normal(0, 0.04, total_samples)
    
    # White Gaussian noise (Hydrophone AFE noise floor)
    noise_a = np.random.normal(0, 10 ** (-snr_db / 20.0), total_samples)
    noise_b = np.random.normal(0, 10 ** (-snr_db / 20.0), total_samples)
    
    final_a = sig_a + traffic_noise_a + noise_a
    final_b = sig_b + traffic_noise_b + noise_b
    
    # Normalize to 16-bit ADC scale (-32768 to 32767)
    scale = 30000.0 / max(np.max(np.abs(final_a)), np.max(np.abs(final_b)), 1e-6)
    adc_a = np.clip(np.round(final_a * scale), -32768, 32767).astype(np.int16)
    adc_b = np.clip(np.round(final_b * scale), -32768, 32767).astype(np.int16)
    
    return {
        "metadata": {
            "pipe_length_m": pipe_length_m,
            "pipe_diameter_m": pipe_diameter_m,
            "wall_thickness_m": wall_thickness_m,
            "wave_speed_m_s": round(v_s, 2),
            "sample_rate_hz": sample_rate,
            "ground_truth_leak_m": leak_distance_from_node_a_m,
            "ground_truth_delta_t_ms": round(delta_t_true * 1000.0, 4)
        },
        "node_a": {
            "node_id": 1,
            "samples": adc_a.tolist()
        },
        "node_b": {
            "node_id": 2,
            "samples": adc_b.tolist()
        }
    }

if __name__ == "__main__":
    scenario = simulate_pipe_leak()
    print(f"Synthesized Burst: Pipe {scenario['metadata']['pipe_length_m']}m")
    print(f"Calculated Wave Speed: {scenario['metadata']['wave_speed_m_s']} m/s")
    print(f"Ground-Truth Leak Position: {scenario['metadata']['ground_truth_leak_m']} m")
    print(f"True Time Difference (Delta t): {scenario['metadata']['ground_truth_delta_t_ms']} ms")
    
    output_path = os.path.join(os.path.dirname(__file__), "sample_burst_bawana.json")
    with open(output_path, "w") as f:
        json.dump(scenario, f)
    print(f"Saved scenario payload to: {output_path}")
