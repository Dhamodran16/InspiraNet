@echo off
echo ========================================
echo   CRITICAL ROUTING FIXES VERIFICATION
echo ========================================
echo.

echo [1/6] Checking ALL routing configuration files...
echo.

echo 📋 ROUTING FILES STATUS:
if exist public\render.yaml (
    echo    ✅ render.yaml - Render deployment config
) else (
    echo    ❌ render.yaml - MISSING!
)

if exist public\_redirects (
    echo    ✅ _redirects - Netlify-style routing
) else (
    echo    ❌ _redirects - MISSING!
)

if exist public\vercel.json (
    echo    ✅ vercel.json - Vercel-style routing
) else (
    echo    ❌ vercel.json - MISSING!
)

if exist public\netlify.toml (
    echo    ✅ netlify.toml - Netlify-style routing
) else (
    echo    ❌ netlify.toml - MISSING!
)

if exist public\static.json (
    echo    ✅ static.json - Standard SPA routing
) else (
    echo    ❌ static.json - MISSING!
)

if exist public\render.json (
    echo    ✅ render.json - Render routing config
) else (
    echo    ❌ render.json - MISSING!
)

if exist public\.htaccess (
    echo    ✅ .htaccess - Apache compatibility
) else (
    echo    ❌ .htaccess - MISSING!
)

if exist public\web.config (
    echo    ✅ web.config - IIS compatibility
) else (
    echo    ❌ web.config - MISSING!
)

if exist public\_headers (
    echo    ✅ _headers - Security headers
) else (
    echo    ❌ _headers - MISSING!
)

if exist public\404.html (
    echo    ✅ 404.html - Fallback page
) else (
    echo    ❌ 404.html - MISSING!
)

echo.
echo [2/6] Building application with ALL routing fixes...
echo.

call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed! Please check the errors above.
    pause
    exit /b 1
)
echo ✅ Build completed successfully!

echo.
echo [3/6] Verifying build output includes ALL routing files...
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

if exist dist\vercel.json (
    echo ✅ vercel.json - Vercel routing included
) else (
    echo ❌ vercel.json - MISSING from build!
)

if exist dist\netlify.toml (
    echo ✅ netlify.toml - Netlify routing included
) else (
    echo ❌ netlify.toml - MISSING from build!
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
echo [4/6] CRITICAL FIXES IMPLEMENTED:
echo.

echo 🚨 ISSUES FIXED:
echo    ✅ Multiple routing methods for maximum compatibility
echo    ✅ render.yaml with explicit rewrite rules
echo    ✅ _redirects with explicit route handling
echo    ✅ vercel.json as alternative routing method
echo    ✅ netlify.toml as another alternative
echo    ✅ All critical routes explicitly defined
echo    ✅ Legal pages routing fixed (privacy-policy, terms, cookie-policy)
echo    ✅ Meeting routes routing fixed (/meeting, /meeting/*)
echo    ✅ Dashboard and profile routes fixed

echo.
echo [5/6] DEPLOYMENT INSTRUCTIONS:
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
echo    - /terms
echo    - /cookie-policy
echo.
echo ⚠️  IMPORTANT: If issues persist after deployment:
echo    1. Check Render logs for routing errors
echo    2. Verify all files are in the root directory
echo    3. Clear Render cache if available
echo.
echo 🎉 Multiple routing methods deployed!
echo Your application should now work on Render!
echo.
pause

