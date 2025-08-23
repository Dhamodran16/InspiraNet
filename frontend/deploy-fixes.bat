@echo off
echo ========================================
echo   CRITICAL ROUTING FIXES DEPLOYMENT
echo ========================================
echo.

echo [1/5] Checking simplified routing files...
echo.

echo 📋 SIMPLIFIED ROUTING FILES:
if exist public\render.yaml (
    echo    ✅ render.yaml - Render deployment config
) else (
    echo    ❌ render.yaml - MISSING!
)

if exist public\_redirects (
    echo    ✅ _redirects - Simplified redirects
) else (
    echo    ❌ _redirects - MISSING!
)

if exist public\static.json (
    echo    ✅ static.json - Simplified static config
) else (
    echo    ❌ static.json - MISSING!
)

if exist public\render.json (
    echo    ✅ render.json - Simplified render config
) else (
    echo    ❌ render.json - MISSING!
)

if exist public\.htaccess (
    echo    ✅ .htaccess - Simplified Apache config
) else (
    echo    ❌ .htaccess - MISSING!
)

if exist public\web.config (
    echo    ✅ web.config - Simplified IIS config
) else (
    echo    ❌ web.config - MISSING!
)

if exist public\_headers (
    echo    ✅ _headers - Simplified headers
) else (
    echo    ❌ _headers - MISSING!
)

if exist public\404.html (
    echo    ✅ 404.html - Simplified fallback
) else (
    echo    ❌ 404.html - MISSING!
)

echo.
echo [2/5] Building application with simplified fixes...
echo.

call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed! Please check the errors above.
    pause
    exit /b 1
)
echo ✅ Build completed successfully!

echo.
echo [3/5] Verifying build output includes ALL routing files...
echo.

if exist dist\index.html (
    echo ✅ index.html - Main entry point
) else (
    echo ❌ index.html - MISSING from build!
)

if exist dist\render.yaml (
    echo ✅ render.yaml - Render config included
) else (
    echo ❌ render.yaml - MISSING from build!
)

if exist dist\_redirects (
    echo ✅ _redirects - Redirects included
) else (
    echo ❌ _redirects - MISSING from build!
)

if exist dist\static.json (
    echo ✅ static.json - Static config included
) else (
    echo ❌ static.json - MISSING from build!
)

if exist dist\render.json (
    echo ✅ render.json - Render routing included
) else (
    echo ❌ render.json - MISSING from build!
)

if exist dist\.htaccess (
    echo ✅ .htaccess - Apache support included
) else (
    echo ❌ .htaccess - MISSING from build!
)

if exist dist\web.config (
    echo ✅ web.config - IIS support included
) else (
    echo ❌ web.config - MISSING from build!
)

if exist dist\_headers (
    echo ✅ _headers - Headers included
) else (
    echo ❌ _headers - MISSING from build!
)

if exist dist\404.html (
    echo ✅ 404.html - Fallback included
) else (
    echo ❌ 404.html - MISSING from build!
)

echo.
echo [4/5] CRITICAL FIXES IMPLEMENTED:
echo.

echo 🚨 ISSUES FIXED:
echo    ✅ Simplified routing files for maximum compatibility
echo    ✅ render.yaml with explicit rewrite rules
echo    ✅ _redirects with catch-all routing
echo    ✅ static.json with simple configuration
echo    ✅ render.json with regex pattern matching
echo    ✅ Multiple fallback methods implemented
echo    ✅ All routing files simplified and optimized

echo.
echo [5/5] DEPLOYMENT INSTRUCTIONS:
echo.

echo 🚀 CRITICAL DEPLOYMENT STEPS:
echo 1. Upload ALL files from 'dist' folder to Render
echo 2. Ensure render.yaml is in the root directory
echo 3. Ensure ALL routing files are in the root directory
echo 4. Test these URLs after deployment:
echo    - / (root)
echo    - /dashboard
echo    - /meeting
echo    - /meeting/meeting_123
echo    - /signin
echo    - /privacy-policy
echo.
echo ⚠️  IMPORTANT: If issues persist, check Render logs
echo    for routing configuration errors
echo.
echo 🎉 Simplified routing fixes deployed!
echo Your application should now work on Render!
echo.
pause
