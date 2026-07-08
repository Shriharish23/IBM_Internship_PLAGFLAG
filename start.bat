@echo off
TITLE PLAGFLAG Launcher
color 0A

echo.
echo  =====================================================
echo    PLAG FLAG  ^|  IBM Granite Plagiarism Analyzer
echo  =====================================================
echo.

:: ── Backend ────────────────────────────────────────────
echo  [1/2] Starting Backend (Flask ^| port 5000)...

cd backend

if not exist "venv\Scripts\python.exe" (
    echo  [SETUP] Creating Python virtual environment...
    python -m venv venv
    echo  [SETUP] Installing backend packages...
    call venv\Scripts\pip install -r requirements.txt --quiet
    call venv\Scripts\python -m nltk.downloader punkt stopwords punkt_tab 2>nul
)

if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo  [INFO]  Created backend\.env  ^<-- add your IBM credentials here
    )
)

start "PLAGFLAG Backend" cmd /k "title PLAGFLAG Backend && color 0B && venv\Scripts\activate && echo Backend starting on http://localhost:5000 && python app.py"

cd ..

:: ── Frontend ───────────────────────────────────────────
echo  [2/2] Starting Frontend (React ^| port 3000)...

cd frontend

if not exist "node_modules" (
    echo  [SETUP] Installing npm packages (first-time, please wait)...
    call npm install --silent
)

start "PLAGFLAG Frontend" cmd /k "title PLAGFLAG Frontend && color 0E && echo Frontend starting on http://localhost:3000 && npm start"

cd ..

:: ── Done ───────────────────────────────────────────────
echo.
echo  =====================================================
echo   PLAGFLAG is starting up!
echo.
echo   Frontend :  http://localhost:3000
echo   Backend  :  http://localhost:5000
echo   API Docs :  http://localhost:5000/api/health
echo  =====================================================
echo.
echo  Both windows will open automatically.
echo  Close those two terminal windows to stop the app.
echo.
timeout /t 5 /nobreak >nul
start http://localhost:3000
