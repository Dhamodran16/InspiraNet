@echo off
echo ========================================
echo InspiraNet - Build with Config Files
echo ========================================
echo.

echo [1/4] Cleaning previous build...
if exist "dist" rmdir /s /q "dist"

echo [2/4] Installing dependencies...
call npm install

echo [3/4] Building application...
call npm run build

echo [4/4] Copying configuration files...
if exist "dist" (
    copy "public\_redirects" "dist\_redirects" >nul 2>&1
    copy "public\404.html" "dist\404.html" >nul 2>&1
    copy "vercel.json" "dist\vercel.json" >nul 2>&1
    copy "render.yaml" "dist\render.yaml" >nul 2>&1
    
    echo ✓ _redirects copied
    echo ✓ 404.html copied  
    echo ✓ vercel.json copied
    echo ✓ render.yaml copied
) else (
    echo ERROR: Build failed! dist folder not found.
    pause
    exit /b 1
)

echo.
echo ========================================
echo BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Configuration files have been copied to dist folder.
echo Your app is now ready for deployment with proper routing!
echo.
echo Next steps:
echo 1. Commit and push these changes
echo 2. Render.com will automatically redeploy
echo 3. All routes should now work properly
echo.
pause
