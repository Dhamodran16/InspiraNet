@echo off
echo 🚀 Starting InspiraNet Frontend Deployment for Render...

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

REM Check if render.yaml exists
if not exist "render.yaml" (
    echo ❌ Error: render.yaml not found. Please ensure it exists in the frontend directory
    pause
    exit /b 1
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

REM Check if git is initialized
if not exist ".git" (
    echo 📦 Initializing git repository...
    git init
    git add .
    git commit -m "Initial commit for Render deployment"
)

REM Check if remote is set
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo 🔗 Please add your git remote:
    echo    git remote add origin ^<your-repository-url^>
    echo    git push -u origin main
    pause
    exit /b 1
)

REM Push to repository
echo 📤 Pushing to repository...
git add .
git commit -m "Deploy to Render - %date% %time%"
git push origin main

echo ✅ Code pushed to repository!
echo.
echo 📋 Next steps:
echo 1. Go to https://render.com
echo 2. Create a new Static Site
echo 3. Connect your repository
echo 4. Configure settings:
echo    - Build Command: npm install ^&^& npm run build
echo    - Publish Directory: dist
echo 5. Set environment variables:
echo    - VITE_BACKEND_URL
echo    - VITE_FRONTEND_URL
echo    - VITE_SOCKET_URL
echo    - VITE_CLOUDINARY_CLOUD_NAME
echo    - VITE_CLOUDINARY_UPLOAD_PRESET
echo 6. Deploy!

pause
