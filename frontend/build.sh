#!/bin/bash

# Build script for Render deployment
echo "🚀 Starting build process for Render..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Build output is in the 'dist' directory"
else
    echo "❌ Build failed!"
    exit 1
fi
