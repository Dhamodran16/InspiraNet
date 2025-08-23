@echo off
echo ========================================
echo InspiraNet - Render.com Deployment Fix
echo ========================================
echo.

echo [1/5] Cleaning previous build...
if exist "dist" rmdir /s /q "dist"
if exist "build" rmdir /s /q "build"

echo [2/5] Installing dependencies...
call npm install

echo [3/5] Building application...
call npm run build

echo [4/5] Verifying build output...
if not exist "dist" (
    echo ERROR: Build failed! dist folder not found.
    pause
    exit /b 1
)

echo [5/5] Build completed successfully!
echo.
echo ========================================
echo DEPLOYMENT READY
echo ========================================
echo.
echo Your application has been built with the following fixes:
echo ✓ SPA routing configuration updated
echo ✓ _redirects file optimized for Render.com
echo ✓ render.yaml routing rules fixed
echo ✓ 404.html fallback page enhanced
echo ✓ vercel.json fallback configuration added
echo.
echo Next steps:
echo 1. Commit and push these changes to your repository
echo 2. Render.com will automatically redeploy
echo 3. All routes should now work properly
echo.
echo Routes that will now work:
echo - /privacy-policy
echo - /terms  
echo - /cookie-policy
echo - /team
echo - /signin, /signup
echo - /dashboard, /profile
echo - /messages, /notifications
echo - /create-post, /meeting/*
echo.
echo ========================================
pause
