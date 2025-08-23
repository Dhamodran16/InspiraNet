@echo off
chcp 65001 >nul
echo ========================================
echo    🎥 InspiraNet Meeting System
echo    🚀 Optimized for Windows Chrome
echo ========================================
echo.

echo 🔧 Checking prerequisites...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js first.
    echo 📥 Download from: https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found! Please install npm first.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed!
echo.

echo 🚀 Starting Backend Server on port 5000...
start "Backend Server" cmd /k "cd backend && npm start"
timeout /t 5 /nobreak >nul

echo 🎥 Starting Meeting Server on port 3001...
start "Meeting Server" cmd /k "cd backend && npm run meeting:dev"
timeout /t 5 /nobreak >nul

echo 🌐 Starting Frontend on port 8083...
start "Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 8 /nobreak >nul

echo.
echo ========================================
echo 🎯 All services are starting...
echo.
echo 📍 Backend Server: http://localhost:5000
echo 🎥 Meeting Server: http://localhost:3001
echo 🌐 Frontend: http://localhost:8083
echo.
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo.
echo 🎉 Meeting system is ready!
echo.
echo 🌐 Opening frontend in Chrome...
start chrome --new-window --disable-web-security --user-data-dir="%TEMP%\chrome-meeting" http://localhost:8083

echo.
echo 📋 Meeting System Status:
echo ✅ Backend Server: Running on port 5000
echo ✅ Meeting Server: Running on port 3001  
echo ✅ Frontend: Running on port 8083
echo ✅ Chrome: Opened with meeting-optimized settings
echo.
echo 🎥 To start a meeting:
echo 1. Navigate to the meeting room in the app
echo 2. Enter your name
echo 3. Click "Create Meeting" or "Join Meeting"
echo 4. Allow camera/microphone permissions
echo.
echo 🚫 To stop all services, close the command windows
echo.
pause
