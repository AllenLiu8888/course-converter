import fs from 'fs';
import path from 'path';

// Create temp directory for tests if it doesn't exist
const tempDir = path.join(process.cwd(), 'temp_test');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Global test utilities
global.createTempDir = (name) => {
  const dir = path.join(tempDir, `test_${name}_${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

global.cleanupTempDir = (dir) => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

// Cleanup after all tests
process.on('exit', () => {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});