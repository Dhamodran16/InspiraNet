@echo off
REM Backend Setup Script for InspiraNet
REM This script helps set up the backend configuration

echo 🚀 InspiraNet Backend Setup
echo ===========================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ package.json not found. Please run this script from the backend directory.
    pause
    exit /b 1
)

echo [INFO] Setting up backend configuration...
echo.

REM Create config.env if it doesn't exist
if not exist "config.env" (
    echo [INFO] Creating config.env from template...
    copy "config.env.example" "config.env"
    echo ✅ config.env created
) else (
    echo ⚠️ config.env already exists
)

echo.
echo [INFO] Backend Setup Checklist:
echo ===============================
echo.
echo 1. ✅ Backend directory structure verified
echo 2. ✅ config.env file ready
echo.
echo [INFO] Next Steps:
echo =================
echo.
echo 1. Edit config.env with your actual values:
echo    - MONGODB_URI (MongoDB Atlas connection string)
echo    - JWT_SECRET (random secret key)
echo    - JWT_REFRESH_SECRET (random secret key)
echo.
echo 2. Deploy to Render:
echo    - Go to https://dashboard.render.com
echo    - Create new Web Service
echo    - Set root directory to: backend
echo    - Configure environment variables
echo.
echo 3. Test deployment:
echo    - Check health endpoint: /health
echo    - Test API endpoints
echo.
echo [INFO] Required Environment Variables for Render:
echo ================================================
echo NODE_ENV=production
echo PORT=10000
echo MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
echo JWT_SECRET=your_random_secret_key_here
echo JWT_REFRESH_SECRET=your_random_refresh_secret_key_here
echo FRONTEND_URL=https://inspiranet.onrender.com
echo CORS_ORIGIN=https://inspiranet.onrender.com
echo.

echo 🎉 Backend setup completed!
echo.
pause
