#!/usr/bin/env node
/**
 * Rebuild better-sqlite3 for Electron environment
 * This script rebuilds better-sqlite3 using node-gyp with Electron headers
 * 
 * NODE_MODULE_VERSION 136 = Node.js 23.x = Electron 28+
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function findBetterSqlite3() {
  const extensionPath = path.resolve(__dirname, '..');
  const rootPath = path.resolve(extensionPath, '..', '..');
  
  // Try pnpm workspace location first (check for any version)
  const pnpmBasePath = path.join(rootPath, 'node_modules', '.pnpm');
  if (fs.existsSync(pnpmBasePath)) {
    const entries = fs.readdirSync(pnpmBasePath);
    for (const entry of entries) {
      if (entry.startsWith('better-sqlite3@')) {
        const pnpmPath = path.join(pnpmBasePath, entry, 'node_modules', 'better-sqlite3');
        if (fs.existsSync(pnpmPath)) {
          return pnpmPath;
        }
      }
    }
  }
  
  // Try local node_modules
  const localPath = path.join(extensionPath, 'node_modules', 'better-sqlite3');
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  
  // Search in node_modules
  const searchPaths = [
    path.join(rootPath, 'node_modules', 'better-sqlite3'),
    path.join(extensionPath, 'node_modules', 'better-sqlite3'),
  ];
  
  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      return searchPath;
    }
  }
  
  return null;
}

function rebuild() {
  console.log('Rebuilding better-sqlite3 for Electron (NODE_MODULE_VERSION 136)...');
  console.log('This corresponds to Node.js 22.x / Electron 37+\n');

  const betterSqlite3Path = findBetterSqlite3();
  
  if (!betterSqlite3Path) {
    console.error('❌ better-sqlite3 not found. Please run pnpm install first.');
    process.exit(1);
  }

  console.log(`Found better-sqlite3 at: ${betterSqlite3Path}\n`);

  const bindingGypPath = path.join(betterSqlite3Path, 'binding.gyp');
  let bindingGypBackup = null;
  let bindingGypModified = false;

  try {
    // Step 0: Modify binding.gyp to use C++20 (required for Electron 37.7.0)
    console.log('Step 0: Updating binding.gyp to use C++20...');
    if (fs.existsSync(bindingGypPath)) {
      const bindingGypContent = fs.readFileSync(bindingGypPath, 'utf8');
      // Backup original
      bindingGypBackup = bindingGypContent;
      // Replace C++17 with C++20
      const modifiedContent = bindingGypContent
        .replace(/-std=c\+\+17/g, '-std=c++20')
        .replace(/\/std:c\+\+17/g, '/std:c++20');
      
      if (modifiedContent !== bindingGypContent) {
        fs.writeFileSync(bindingGypPath, modifiedContent, 'utf8');
        bindingGypModified = true;
        console.log('   Updated binding.gyp: C++17 -> C++20\n');
      }
    }

    // Step 1: Clean previous build
    console.log('Step 1: Cleaning previous build...');
    try {
      execSync('npx node-gyp clean', {
        cwd: betterSqlite3Path,
        stdio: 'pipe',
      });
    } catch (e) {
      // Ignore clean errors
    }

    // Step 2: Rebuild with Electron headers
    // VSCode/Cursor uses Electron with Node.js 22.20.0
    // We need to use the Electron version, not Node.js version
    // Electron 37.7.0 uses Node.js 22.20.0 (NODE_MODULE_VERSION 136)
    const electronVersion = '37.7.0';
    console.log(`\nStep 2: Rebuilding for Electron ${electronVersion} (Node.js 22.20.0, NODE_MODULE_VERSION 136)...`);
    console.log('This may take a few minutes...\n');
    
    execSync(
      `npx node-gyp rebuild --target=${electronVersion} --arch=x64 --dist-url=https://electronjs.org/headers`,
      {
        cwd: betterSqlite3Path,
        stdio: 'inherit',
        env: {
          ...process.env,
          npm_config_target: electronVersion,
          npm_config_arch: 'x64',
          npm_config_target_arch: 'x64',
          npm_config_dist_url: 'https://electronjs.org/headers',
          npm_config_runtime: 'electron',
          npm_config_build_from_source: 'true',
        },
      }
    );

    console.log('\n✅ Successfully rebuilt better-sqlite3 for Electron!');
    console.log(`   The module is now compiled for Electron ${electronVersion} (Node.js 22.20.0, NODE_MODULE_VERSION 136)`);
    console.log('\n   Please restart VSCode/Cursor to load the new native bindings.');

    console.log('\n✅ Successfully rebuilt better-sqlite3 for Electron!');
    console.log(`   The module is now compiled for Electron ${electronVersion} (Node.js 22.20.0, NODE_MODULE_VERSION 136)`);
    console.log('\n   Please restart VSCode/Cursor to load the new native bindings.');
  } catch (error) {
    console.error('\n❌ Failed to rebuild better-sqlite3 for Electron');
    console.error(`   Error: ${error.message}`);
    console.log('\n💡 Manual rebuild instructions:');
    console.log('   1. Find better-sqlite3 location:');
    console.log('      cd apps/extension');
    console.log('      find node_modules -name "better-sqlite3" -type d | head -1');
    console.log('   2. Navigate to that directory');
    console.log('   3. Run: npx node-gyp rebuild --target=37.7.0 --arch=x64 --dist-url=https://electronjs.org/headers');
    console.log('\n   Or use electron-rebuild (if it works):');
    console.log('   npx @electron/rebuild --version=28.0.0 --only=better-sqlite3');
    process.exit(1);
  } finally {
    // Restore original binding.gyp if modified
    if (bindingGypModified && bindingGypBackup) {
      try {
        fs.writeFileSync(bindingGypPath, bindingGypBackup, 'utf8');
        console.log('\n   Restored original binding.gyp');
      } catch (e) {
        console.warn('\n   Warning: Could not restore original binding.gyp');
      }
    }
  }
}

rebuild();
