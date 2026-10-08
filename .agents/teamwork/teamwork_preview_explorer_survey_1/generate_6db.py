import sys
import json
import os

# Import physics-engine
sys.path.append(os.path.abspath('d:/STS/hydropulse/physics-engine'))
from pipe_wave_synthesizer import simulate_pipe_leak

# Generate burst at SNR = 6 dB
scenario_6db = simulate_pipe_leak(snr_db=6.0)
out_path = 'd:/STS/hydropulse/.agents/teamwork/teamwork_preview_explorer_survey_1/burst_6db.json'
with open(out_path, 'w') as f:
    json.dump(scenario_6db, f)

print(f"Generated 6dB burst. Meta: {scenario_6db['metadata']}")
