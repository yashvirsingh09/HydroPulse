@echo off
title HydroPulse SCADA Launch Center
echo ========================================================
echo   HYDROPULSE: Autonomous Acoustic Triangulation SCADA
echo ========================================================
echo.
echo [1/2] Starting AWS Backend Server on port 5000...
start cmd /k "title HydroPulse Backend && cd backend-aws && npm start"
timeout /t 2 >nul
echo [2/2] Launching Web SCADA Console on port 3000...
start http://localhost:3000
cd web-console
npm run preview
pause
