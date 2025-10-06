@echo off
echo 🔧 Killing any existing Node.js processes...
taskkill /IM node.exe /F 2>nul

echo 🔧 Checking for processes using port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo Killing process %%a using port 5000...
    taskkill /PID %%a /F 2>nul
)

echo 🚀 Starting backend server...
npm start

pause
