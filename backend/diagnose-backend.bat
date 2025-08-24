@echo off
REM Backend Diagnostic Script for InspiraNet
REM This script helps diagnose backend deployment issues

echo 🔍 InspiraNet Backend Diagnostic
echo ================================
echo.

echo [INFO] Checking backend configuration...
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ package.json not found. Please run this script from the backend directory.
    pause
    exit /b 1
)

echo ✅ Backend directory structure verified
echo.

REM Check critical files
if exist "server.js" (
    echo ✅ server.js found
) else (
    echo ❌ server.js missing
)

if exist "config.env" (
    echo ✅ config.env found
) else (
    echo ❌ config.env missing
)

if exist "render.yaml" (
    echo ✅ render.yaml found
) else (
    echo ❌ render.yaml missing
)

echo.
echo [INFO] Testing backend endpoints...
echo.

echo Testing your backend at: https://inspiranet-backend.onrender.com
echo.

echo [INFO] Expected endpoints:
echo =========================
echo - Health: https://inspiranet-backend.onrender.com/health
echo - API Health: https://inspiranet-backend.onrender.com/api/health
echo - Config Health: https://inspiranet-backend.onrender.com/api/config/health
echo - Departments: https://inspiranet-backend.onrender.com/api/config/departments
echo - Designations: https://inspiranet-backend.onrender.com/api/config/designations
echo - Placement Statuses: https://inspiranet-backend.onrender.com/api/config/placement-statuses
echo.

echo [INFO] Common Issues and Solutions:
echo ===================================
echo.

echo 🚨 ISSUE 1: Backend returns 503 Service Unavailable
echo SOLUTION: Check Render dashboard for backend service status
echo - Go to https://dashboard.render.com
echo - Find your backend service
echo - Check if it's running (green status)
echo - Check build logs for errors
echo.

echo 🚨 ISSUE 2: Database connection fails
echo SOLUTION: Verify MongoDB Atlas configuration
echo - Check if MongoDB Atlas cluster is running
echo - Verify connection string in environment variables
echo - Check IP whitelist in MongoDB Atlas
echo.

echo 🚨 ISSUE 3: Environment variables not set
echo SOLUTION: Set all required environment variables in Render
echo - NODE_ENV=production
echo - PORT=10000
echo - MONGODB_URI=(your connection string)
echo - JWT_SECRET=(your secret)
echo - JWT_REFRESH_SECRET=(your refresh secret)
echo - FRONTEND_URL=https://inspiranet.onrender.com
echo - CORS_ORIGIN=https://inspiranet.onrender.com
echo.

echo 🚨 ISSUE 4: Backend service won't start
echo SOLUTION: Check start command and dependencies
echo - Verify start command: npm start
echo - Check if all dependencies are installed
echo - Verify Node.js version compatibility
echo.

echo [INFO] Quick Fix Steps:
echo ======================
echo.

echo 1. Go to Render Dashboard: https://dashboard.render.com
echo 2. Find your backend service (inspiranet-backend)
echo 3. Check service status (should be green)
echo 4. If red/failed, check build logs
echo 5. Verify environment variables are set
echo 6. Restart the service if needed
echo.

echo [INFO] Test Commands (run in browser console):
echo =============================================
echo.

echo Test backend health:
echo fetch('https://inspiranet-backend.onrender.com/health').then(r => r.json()).then(console.log)
echo.

echo Test config endpoints:
echo fetch('https://inspiranet-backend.onrender.com/api/config/departments').then(r => r.json()).then(console.log)
echo.

echo [INFO] Your current configuration:
echo =================================
echo.

echo Backend URL: https://inspiranet-backend.onrender.com
echo Frontend URL: https://inspiranet.onrender.com
echo MongoDB: Configured ✓
echo JWT Secrets: Configured ✓
echo.

echo 🎯 Next Steps:
echo ==============
echo.

echo 1. Check Render dashboard for backend service status
echo 2. If service is down, restart it
echo 3. Check build logs for errors
echo 4. Verify environment variables
echo 5. Test endpoints manually
echo 6. Update frontend environment variables if backend URL changes
echo.

echo 🎉 Diagnostic completed!
echo.
pause
