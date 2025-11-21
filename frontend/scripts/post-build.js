#!/usr/bin/env node

/**
 * Post-build script for InspiraNet Frontend
 * Ensures all deployment files are copied to the build output
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const distPath = path.resolve(projectRoot, 'dist');
const publicPath = path.resolve(projectRoot, 'public');

console.log('🔧 Running post-build script...');

// Files to copy from public directory to dist
const filesToCopy = [
  '_redirects',
  '_headers',
  '404.html',
  'vercel.json',
  'render.yaml',
  'netlify.toml',
  'static.json',
  'render.json',
  'web.config'
];

async function copyDeploymentFiles() {
  try {
    console.log('📁 Copying deployment files...');
    
    for (const file of filesToCopy) {
      const sourcePath = path.join(publicPath, file);
      const destPath = path.join(distPath, file);
      
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, destPath);
        console.log(`✅ Copied ${file} to dist/`);
      } else {
        // Try copying from root directory
        const rootSourcePath = path.join(projectRoot, file);
        if (await fs.pathExists(rootSourcePath)) {
          await fs.copy(rootSourcePath, destPath);
          console.log(`✅ Copied ${file} to dist/ (from root)`);
        } else {
          console.log(`⚠️ File not found: ${file}`);
        }
      }
    }
    
    // Verify critical files exist
    const criticalFiles = ['index.html', '_redirects'];
    for (const file of criticalFiles) {
      const filePath = path.join(distPath, file);
      if (await fs.pathExists(filePath)) {
        console.log(`✅ Critical file exists: ${file}`);
      } else {
        console.error(`❌ Critical file missing: ${file}`);
        process.exit(1);
      }
    }
    
    // Create deployment manifest
    const manifest = {
      buildTime: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      files: await fs.readdir(distPath)
    };
    
    await fs.writeJson(path.join(distPath, 'deployment-manifest.json'), manifest, { spaces: 2 });
    console.log('✅ Created deployment manifest');
    
    console.log('🎉 Post-build script completed successfully!');
    
  } catch (error) {
    console.error('❌ Post-build script failed:', error);
    process.exit(1);
  }
}

copyDeploymentFiles();
