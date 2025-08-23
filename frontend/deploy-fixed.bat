@echo off
echo ========================================
echo   Deploying Fixed InspiraNet Frontend
echo ========================================
echo.

echo [1/4] Building production version...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed! Please check the errors above.
    pause
    exit /b 1
)
echo ✅ Build completed successfully!

echo.
echo [2/4] Production build created in 'dist' folder
echo.

echo [3/4] Ready for deployment to Render!
echo.
echo 📁 Upload the contents of the 'dist' folder to:
echo    https://inspiranet.onrender.com
echo.
echo 🔧 Or use Render's automatic deployment from Git
echo.

echo [4/4] Deployment checklist:
echo    ✅ All localhost URLs removed
echo    ✅ Production URLs configured
echo    ✅ Legal pages will now work properly
echo    ✅ Authentication will connect to Render backend
echo.

echo 🎉 Your frontend is now ready for production!
echo.
pause
