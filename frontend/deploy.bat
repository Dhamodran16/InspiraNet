@echo off
echo 🚀 Starting InspiraNet Frontend Deployment...

REM Check if we're in the frontend directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the frontend directory
    pause
    exit /b 1
)

if not exist "vite.config.ts" (
    echo ❌ Error: Please run this script from the frontend directory
    pause
    exit /b 1
)

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing Vercel CLI...
    npm install -g vercel
)

REM Check if user is logged in to Vercel
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo 🔐 Please login to Vercel...
    vercel login
)

REM Build the project locally to check for errors
echo 🔨 Building project...
npm run build

if errorlevel 1 (
    echo ❌ Build failed. Please fix the errors before deploying.
    pause
    exit /b 1
)

echo ✅ Build successful!

REM Deploy to Vercel
echo 🚀 Deploying to Vercel...
vercel --prod

echo ✅ Deployment completed!
echo.
echo 📋 Next steps:
echo 1. Go to your Vercel dashboard
echo 2. Set the following environment variables:
echo    - VITE_BACKEND_URL
echo    - VITE_FRONTEND_URL
echo    - VITE_SOCKET_URL
echo    - VITE_CLOUDINARY_CLOUD_NAME
echo    - VITE_CLOUDINARY_UPLOAD_PRESET
echo 3. Redeploy if needed: vercel --prod

pause
