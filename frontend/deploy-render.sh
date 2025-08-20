#!/bin/bash

# InspiraNet Frontend Deployment Script for Render
echo "🚀 Starting InspiraNet Frontend Deployment for Render..."

# Check if we're in the frontend directory
if [ ! -f "package.json" ] || [ ! -f "vite.config.ts" ]; then
    echo "❌ Error: Please run this script from the frontend directory"
    exit 1
fi

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo "❌ Error: render.yaml not found. Please ensure it exists in the frontend directory"
    exit 1
fi

# Build the project locally to check for errors
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for Render deployment"
fi

# Check if remote is set
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "🔗 Please add your git remote:"
    echo "   git remote add origin <your-repository-url>"
    echo "   git push -u origin main"
    exit 1
fi

# Push to repository
echo "📤 Pushing to repository..."
git add .
git commit -m "Deploy to Render - $(date)"
git push origin main

echo "✅ Code pushed to repository!"
echo ""
echo "📋 Next steps:"
echo "1. Go to [render.com](https://render.com)"
echo "2. Create a new Static Site"
echo "3. Connect your repository"
echo "4. Configure settings:"
echo "   - Build Command: npm install && npm run build"
echo "   - Publish Directory: dist"
echo "5. Set environment variables:"
echo "   - VITE_BACKEND_URL"
echo "   - VITE_FRONTEND_URL"
echo "   - VITE_SOCKET_URL"
echo "   - VITE_CLOUDINARY_CLOUD_NAME"
echo "   - VITE_CLOUDINARY_UPLOAD_PRESET"
echo "6. Deploy!"
