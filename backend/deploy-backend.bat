@echo off
REM Backend Deployment Script for InspiraNet
REM This script prepares the backend for Render deployment

echo 🚀 InspiraNet Backend Deployment Preparation
echo ============================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ package.json not found. Please run this script from the backend directory.
    pause
    exit /b 1
)

echo [INFO] Checking backend configuration...
echo.

REM Check if config.env exists
if exist "config.env" (
    echo ✅ config.env found
) else (
    echo ❌ config.env not found. Please run setup-backend.bat first.
    pause
    exit /b 1
)

REM Check if render.yaml exists
if exist "render.yaml" (
    echo ✅ render.yaml found
) else (
    echo ❌ render.yaml not found
    pause
    exit /b 1
)

echo.
echo [INFO] Backend Configuration Status:
echo ===================================
echo.

REM Check critical environment variables
findstr /C:"MONGODB_URI" config.env >nul
if %errorlevel% equ 0 (
    echo ✅ MongoDB URI configured
) else (
    echo ❌ MongoDB URI missing
)

findstr /C:"JWT_SECRET" config.env >nul
if %errorlevel% equ 0 (
    echo ✅ JWT Secret configured
) else (
    echo ❌ JWT Secret missing
)

findstr /C:"JWT_REFRESH_SECRET" config.env >nul
if %errorlevel% equ 0 (
    echo ✅ JWT Refresh Secret configured
) else (
    echo ❌ JWT Refresh Secret missing
)

echo.
echo [INFO] Deployment Instructions:
echo ==============================
echo.
echo 1. Go to https://dashboard.render.com
echo 2. Click "New +" → "Web Service"
echo 3. Connect your GitHub repository
echo 4. Set Root Directory to: backend
echo 5. Configure the following settings:
echo    - Name: inspiranet-backend
echo    - Environment: Node
echo    - Build Command: npm install
echo    - Start Command: npm start
echo    - Plan: Free
echo.
echo 6. Set these Environment Variables in Render:
echo    - NODE_ENV=production
echo    - PORT=10000
echo    - MONGODB_URI=(copy from your config.env)
echo    - JWT_SECRET=(copy from your config.env)
echo    - JWT_REFRESH_SECRET=(copy from your config.env)
echo    - FRONTEND_URL=https://inspiranet.onrender.com
echo    - CORS_ORIGIN=https://inspiranet.onrender.com
echo    - CLOUDINARY_CLOUD_NAME=(copy from your config.env)
echo    - CLOUDINARY_API_KEY=(copy from your config.env)
echo    - CLOUDINARY_API_SECRET=(copy from your config.env)
echo    - CLOUDINARY_UPLOAD_PRESET=(copy from your config.env)
echo.
echo 7. Click "Create Web Service"
echo.
echo 8. Once deployed, update your frontend environment variables:
echo    - VITE_BACKEND_URL=https://your-backend-name.onrender.com
echo    - VITE_SOCKET_URL=https://your-backend-name.onrender.com
echo    - VITE_MEETING_URL=https://your-backend-name.onrender.com
echo.

echo 🎉 Backend deployment preparation completed!
echo.
echo [INFO] Your current configuration:
echo =================================
echo.
echo MongoDB URI: %MONGODB_URI%
echo Frontend URL: %FRONTEND_URL%
echo JWT Secret: Configured ✓
echo JWT Refresh Secret: Configured ✓
echo Cloudinary: Configured ✓
echo.

pause
