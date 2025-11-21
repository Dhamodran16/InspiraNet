@echo off
echo ========================================
echo   Building for Render Deployment
echo ========================================
echo.

echo [1/5] Cleaning previous build...
if exist dist rmdir /s /q dist
echo ✅ Cleaned previous build

echo.
echo [2/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Dependencies installation failed!
    pause
    exit /b 1
)
echo ✅ Dependencies installed

echo.
echo [3/5] Building production version...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed! Please check the errors above.
    pause
    exit /b 1
)
echo ✅ Build completed successfully!

echo.
echo [4/5] Verifying build output...
if not exist dist\index.html (
    echo ❌ Build output is missing index.html!
    pause
    exit /b 1
)
echo ✅ Build output verified

echo.
echo [5/5] Render deployment ready!
echo.
echo 📁 Upload the contents of the 'dist' folder to Render
echo 🔗 Or push to Git for automatic deployment
echo.
echo 📋 Files included:
echo    ✅ index.html (main entry point)
echo    ✅ _redirects (SPA routing)
echo    ✅ All static assets
echo    ✅ Production URLs configured
echo.
echo 🎉 Your frontend is ready for Render!
echo.
pause
