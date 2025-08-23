@echo off
echo ========================================
echo   Complete Render Build & Deploy
echo ========================================
echo.

echo [1/6] Cleaning previous build...
if exist dist rmdir /s /q dist
echo ✅ Cleaned previous build

echo.
echo [2/6] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Dependencies installation failed!
    pause
    exit /b 1
)
echo ✅ Dependencies installed

echo.
echo [3/6] Building production version...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed! Please check the errors above.
    pause
    exit /b 1
)
echo ✅ Build completed successfully!

echo.
echo [4/6] Verifying critical files...
if not exist dist\index.html (
    echo ❌ Build output is missing index.html!
    pause
    exit /b 1
)
if not exist dist\_redirects (
    echo ❌ Build output is missing _redirects!
    pause
    exit /b 1
)
if not exist dist\static.json (
    echo ❌ Build output is missing static.json!
    pause
    exit /b 1
)
if not exist dist\placeholder.svg (
    echo ❌ Build output is missing placeholder.svg!
    pause
    exit /b 1
)
echo ✅ All critical files verified

echo.
echo [5/6] Creating deployment package...
echo 📁 Build output contents:
dir dist /b
echo.

echo [6/6] Render deployment ready!
echo.
echo 🚀 DEPLOYMENT INSTRUCTIONS:
echo.
echo 1. Go to your Render dashboard
echo 2. Select your frontend service
echo 3. Go to 'Manual Deploy' section
echo 4. Upload the ENTIRE 'dist' folder
echo 5. Wait for deployment to complete
echo.
echo 📋 CRITICAL FILES INCLUDED:
echo    ✅ index.html (main entry point)
echo    ✅ _redirects (SPA routing - backup)
echo    ✅ static.json (SPA routing - primary)
echo    ✅ placeholder.svg (missing asset)
echo    ✅ All static assets
echo    ✅ Production URLs configured
echo.
echo 🔧 ROUTING CONFIGURATION:
echo    - static.json: Primary routing for Render
echo    - _redirects: Backup routing method
echo    - Both ensure SPA routing works
echo.
echo 🎯 EXPECTED RESULTS:
echo    - No more 404 errors on any route
echo    - Legal pages open in new tabs properly
echo    - Meeting rooms accessible
echo    - All navigation works seamlessly
echo.
echo 🎉 Your frontend is ready for Render!
echo.
pause
