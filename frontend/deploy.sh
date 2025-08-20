#!/bin/bash

# InspiraNet Frontend Deployment Script for Vercel
echo "🚀 Starting InspiraNet Frontend Deployment..."

# Check if we're in the frontend directory
if [ ! -f "package.json" ] || [ ! -f "vite.config.ts" ]; then
    echo "❌ Error: Please run this script from the frontend directory"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel..."
    vercel login
fi

# Build the project locally to check for errors
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Go to your Vercel dashboard"
echo "2. Set the following environment variables:"
echo "   - VITE_BACKEND_URL"
echo "   - VITE_FRONTEND_URL"
echo "   - VITE_SOCKET_URL"
echo "   - VITE_CLOUDINARY_CLOUD_NAME"
echo "   - VITE_CLOUDINARY_UPLOAD_PRESET"
echo "3. Redeploy if needed: vercel --prod"
