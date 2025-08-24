#!/bin/bash

# InspiraNet Render Deployment Verification Script
# This script verifies that the application is ready for Render deployment

set -e

echo "🔍 InspiraNet Render Deployment Verification"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the frontend directory."
    exit 1
fi

echo ""
print_status "Checking project structure..."

# Check critical files
CRITICAL_FILES=(
    "package.json"
    "vite.config.ts"
    "src/main.tsx"
    "src/App.tsx"
    "public/index.html"
    "render.yaml"
    "public/render.json"
    "public/_redirects"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "✅ $file exists"
    else
        print_error "❌ $file missing"
        exit 1
    fi
done

echo ""
print_status "Checking configuration files..."

# Check HashRouter usage
if grep -q "HashRouter" src/main.tsx; then
    print_success "✅ HashRouter is configured"
else
    print_error "❌ HashRouter not found in main.tsx"
    exit 1
fi

# Check render.yaml configuration
if grep -q "staticSites" render.yaml; then
    print_success "✅ render.yaml is configured for static site"
else
    print_error "❌ render.yaml not properly configured"
    exit 1
fi

# Check environment configuration
if [ -f ".env.local" ] || [ -f ".env" ]; then
    print_success "✅ Environment file exists"
else
    print_warning "⚠️ No environment file found. Using defaults."
fi

echo ""
print_status "Running build test..."

# Clean previous build
rm -rf dist

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Run build
print_status "Building application..."
npm run build

# Verify build output
if [ ! -d "dist" ]; then
    print_error "❌ Build failed: dist directory not created"
    exit 1
fi

# Check critical build files
BUILD_FILES=("index.html" "_redirects")
for file in "${BUILD_FILES[@]}"; do
    if [ -f "dist/$file" ]; then
        print_success "✅ dist/$file exists"
    else
        print_error "❌ dist/$file missing from build"
        exit 1
    fi
done

# Check build size
BUILD_SIZE=$(du -sh dist | cut -f1)
print_status "Build size: $BUILD_SIZE"

echo ""
print_status "Checking for potential issues..."

# Check for common problems
if grep -q "BrowserRouter" src/main.tsx; then
    print_error "❌ BrowserRouter found - should use HashRouter for Render"
    exit 1
fi

if [ ! -f "dist/_redirects" ]; then
    print_error "❌ _redirects file not copied to build output"
    exit 1
fi

# Check if environment variables are set for production
if [ -f ".env.local" ]; then
    if grep -q "localhost" .env.local; then
        print_warning "⚠️ Localhost URLs found in environment file"
        print_warning "   Make sure to update URLs for production deployment"
    fi
fi

echo ""
print_status "Render Deployment Checklist:"
echo "=================================="

echo "✅ HashRouter configured for SPA routing"
echo "✅ render.yaml configured for static site"
echo "✅ Build process working correctly"
echo "✅ Critical files present in build output"
echo "✅ SPA routing configured with _redirects"

echo ""
print_status "Next Steps for Render Deployment:"
echo "========================================"

echo "1. Push your code to GitHub"
echo "2. Connect your repository to Render"
echo "3. Configure environment variables in Render dashboard:"
echo "   - VITE_BACKEND_URL=https://your-backend.onrender.com"
echo "   - VITE_SOCKET_URL=https://your-backend.onrender.com"
echo "   - VITE_MEETING_URL=https://your-backend.onrender.com"
echo "   - VITE_FRONTEND_URL=https://your-frontend.onrender.com"
echo "4. Deploy the application"

echo ""
print_success "🎉 Application is ready for Render deployment!"
print_status "Your application should work correctly on Render with these configurations."

# Optional: Test the build locally
if [ "$1" = "--test" ]; then
    echo ""
    print_status "Starting local preview server..."
    npm run preview
fi
