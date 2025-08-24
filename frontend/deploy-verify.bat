@echo off
REM InspiraNet Render Deployment Verification Script (Windows)
REM This script verifies that the application is ready for Render deployment

echo 🔍 InspiraNet Render Deployment Verification
echo ==============================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ package.json not found. Please run this script from the frontend directory.
    exit /b 1
)

echo [INFO] Checking project structure...
echo.

REM Check critical files
set CRITICAL_FILES=package.json vite.config.ts src\main.tsx src\App.tsx public\index.html render.yaml public\render.json public\_redirects

for %%f in (%CRITICAL_FILES%) do (
    if exist "%%f" (
        echo ✅ %%f exists
    ) else (
        echo ❌ %%f missing
        exit /b 1
    )
)

echo.
echo [INFO] Checking configuration files...

REM Check HashRouter usage
findstr /C:"HashRouter" src\main.tsx >nul
if %errorlevel% equ 0 (
    echo ✅ HashRouter is configured
) else (
    echo ❌ HashRouter not found in main.tsx
    exit /b 1
)

REM Check render.yaml configuration
findstr /C:"staticSites" render.yaml >nul
if %errorlevel% equ 0 (
    echo ✅ render.yaml is configured for static site
) else (
    echo ❌ render.yaml not properly configured
    exit /b 1
)

REM Check environment configuration
if exist ".env.local" (
    echo ✅ Environment file exists
) else if exist ".env" (
    echo ✅ Environment file exists
) else (
    echo ⚠️ No environment file found. Using defaults.
)

echo.
echo [INFO] Running build test...

REM Clean previous build
if exist "dist" rmdir /s /q dist

REM Install dependencies if needed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    npm install
)

REM Run build
echo [INFO] Building application...
npm run build

REM Verify build output
if not exist "dist" (
    echo ❌ Build failed: dist directory not created
    exit /b 1
)

REM Check critical build files
if exist "dist\index.html" (
    echo ✅ dist\index.html exists
) else (
    echo ❌ dist\index.html missing from build
    exit /b 1
)

if exist "dist\_redirects" (
    echo ✅ dist\_redirects exists
) else (
    echo ❌ dist\_redirects missing from build
    exit /b 1
)

echo.
echo [INFO] Checking for potential issues...

REM Check for common problems
findstr /C:"BrowserRouter" src\main.tsx >nul
if %errorlevel% equ 0 (
    echo ❌ BrowserRouter found - should use HashRouter for Render
    exit /b 1
)

echo.
echo [INFO] Render Deployment Checklist:
echo ==================================
echo ✅ HashRouter configured for SPA routing
echo ✅ render.yaml configured for static site
echo ✅ Build process working correctly
echo ✅ Critical files present in build output
echo ✅ SPA routing configured with _redirects

echo.
echo [INFO] Next Steps for Render Deployment:
echo ========================================
echo 1. Push your code to GitHub
echo 2. Connect your repository to Render
echo 3. Configure environment variables in Render dashboard:
echo    - VITE_BACKEND_URL=https://your-backend.onrender.com
echo    - VITE_SOCKET_URL=https://your-backend.onrender.com
echo    - VITE_MEETING_URL=https://your-backend.onrender.com
echo    - VITE_FRONTEND_URL=https://your-frontend.onrender.com
echo 4. Deploy the application

echo.
echo 🎉 Application is ready for Render deployment!
echo [INFO] Your application should work correctly on Render with these configurations.

REM Optional: Test the build locally
if "%1"=="--test" (
    echo.
    echo [INFO] Starting local preview server...
    npm run preview
)

pause
