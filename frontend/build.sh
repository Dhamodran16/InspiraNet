#!/bin/bash

# InspiraNet Frontend Build Script
# This script handles the complete build process for deployment

set -e  # Exit on any error

echo "🚀 Starting InspiraNet Frontend Build Process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check Node.js version
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check npm version
NPM_VERSION=$(npm --version)
print_status "npm version: $NPM_VERSION"

# Clean previous build
print_status "Cleaning previous build..."
rm -rf dist
rm -rf node_modules/.vite

# Install dependencies
print_status "Installing dependencies..."
npm ci --production=false

# Validate environment configuration
print_status "Validating environment configuration..."
if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
    print_warning "No environment file found. Using default configuration."
    cp env.example .env.local 2>/dev/null || print_warning "Could not copy env.example"
fi

# Run type checking
print_status "Running TypeScript type checking..."
npm run lint || {
    print_warning "TypeScript errors found, but continuing with build..."
}

# Build the application
print_status "Building application..."
npm run build

# Verify build output
if [ ! -d "dist" ]; then
    print_error "Build failed: dist directory not created"
    exit 1
fi

# Copy critical deployment files
print_status "Copying deployment files..."

# Files to copy from public directory
DEPLOYMENT_FILES=(
    "_redirects"
    "_headers"
    "404.html"
    "vercel.json"
    "render.yaml"
    "netlify.toml"
    "static.json"
    "render.json"
    "web.config"
)

for file in "${DEPLOYMENT_FILES[@]}"; do
    if [ -f "public/$file" ]; then
        cp "public/$file" "dist/$file"
        print_success "Copied public/$file to dist/"
    elif [ -f "$file" ]; then
        cp "$file" "dist/$file"
        print_success "Copied $file to dist/"
    else
        print_warning "Deployment file not found: $file"
    fi
done

# Create index.html fallback for SPA routing
if [ ! -f "dist/index.html" ]; then
    print_error "index.html not found in dist directory. Build may have failed."
    exit 1
fi

# Verify critical files exist
CRITICAL_FILES=("index.html" "_redirects")
for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "dist/$file" ]; then
        print_error "Critical file missing: dist/$file"
        exit 1
    fi
done

# Check build size
BUILD_SIZE=$(du -sh dist | cut -f1)
print_status "Build size: $BUILD_SIZE"

# List dist contents
print_status "Build contents:"
ls -la dist/

# Run build verification
print_status "Verifying build..."
if [ -f "dist/index.html" ]; then
    print_success "✅ Build verification passed"
else
    print_error "❌ Build verification failed"
    exit 1
fi

# Create deployment manifest
print_status "Creating deployment manifest..."
cat > dist/deployment-manifest.json << EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "$(node -p "require('./package.json').version")",
  "environment": "$(node -p "process.env.NODE_ENV || 'production'")",
  "buildSize": "$BUILD_SIZE",
  "files": [
    $(find dist -type f -name "*.html" -o -name "*.js" -o -name "*.css" | head -10 | sed 's/^/    "/' | sed 's/$/",/' | sed '$ s/,$//')
  ]
}
EOF

print_success "✅ Build completed successfully!"
print_status "Build output: dist/"
print_status "Deployment manifest: dist/deployment-manifest.json"

# Optional: Start preview server
if [ "$1" = "--preview" ]; then
    print_status "Starting preview server..."
    npm run preview
fi

echo ""
print_success "🎉 InspiraNet Frontend is ready for deployment!"
