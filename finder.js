// playit-handler.js
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Detects the current operating system and runs appropriate command
 * Special handling for Termux on Android
 * @returns {Promise<{success: boolean, output: string, error: string|null}>}
 */
export async function runPlayitCommand() {
  try {
    const platform = os.platform();
    const isTermux = await checkIfTermux();
    
    let command;
    
    if (isTermux) {
      // Use playit-cli directly on Termux
      command = 'playit-cli';
    } else {
      // For other platforms, find the appropriate binary
      const binaryPath = await findPlayitBinary(platform);
      if (!binaryPath) {
        return {
          success: false,
          output: '',
          error: 'Playit binary not found for this platform'
        };
      }
      command = binaryPath;
    }
    
    console.log(`Executing playit command: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    
    return {
      success: true,
      output: stdout,
      error: stderr || null
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error.message
    };
  }
}

/**
 * Check if we're running in Termux environment
 * @returns {Promise<boolean>}
 */
async function checkIfTermux() {
  try {
    // Check for Termux-specific paths or environment variables
    const termuxPrefix = process.env.PREFIX;
    if (termuxPrefix && termuxPrefix.includes('com.termux')) {
      return true;
    }
    
    // Try accessing a Termux-specific directory
    try {
      await fs.access('/data/data/com.termux', fs.constants.F_OK);
      return true;
    } catch {
      // Not accessible, likely not Termux
    }
    
    // Check for Android
    const platform = os.platform();
    const uname = await execAsync('uname -a');
    return platform === 'android' || uname.stdout.toLowerCase().includes('android');
    
  } catch (error) {
    // If any error occurs, assume we're not in Termux
    return false;
  }
}

/**
 * Find the appropriate Playit binary for the current platform
 * @param {string} platform - The OS platform (from os.platform())
 * @returns {Promise<string|null>} - Path to the binary or null if not found
 */
async function findPlayitBinary(platform) {
  // Common paths to look for binaries
  const binaryName = platform === 'win32' ? 'playit.exe' : 'playit';
  const commonPaths = [
    path.join(process.cwd(), binaryName),                  // Current directory
    path.join(process.cwd(), 'bin', binaryName),           // ./bin/
    path.join(os.homedir(), '.local', 'bin', binaryName),  // ~/.local/bin/
    path.join('/usr', 'local', 'bin', binaryName),         // /usr/local/bin/
    path.join('/usr', 'bin', binaryName),                  // /usr/bin/
  ];
  
  // Windows-specific paths
  if (platform === 'win32') {
    commonPaths.push(
      path.join(process.env.APPDATA || '', 'playit', binaryName),
      path.join(process.env.PROGRAMFILES || '', 'playit', binaryName),
      path.join(process.env.LOCALAPPDATA || '', 'playit', binaryName)
    );
  }
  
  // Check each path
  for (const binPath of commonPaths) {
    try {
      await fs.access(binPath, fs.constants.X_OK);
      return binPath; // Found executable binary
    } catch {
      // Binary not found at this path, continue checking
    }
  }
  
  // If we get here, try to find in PATH
  try {
    const whichCommand = platform === 'win32' ? 'where' : 'which';
    const { stdout } = await execAsync(`${whichCommand} ${binaryName}`);
    if (stdout.trim()) {
      return stdout.trim();
    }
  } catch {
    // Command not found in PATH
  }
  
  return null; // Binary not found
}

// Example usage
async function startPlayit() {
  const result = await runPlayitCommand();
  if (result.success) {
    console.log('Playit started successfully:');
    console.log(result.output);
  } else {
    console.error('Failed to start Playit:');
    console.error(result.error);
  }
  return result;
}

startPlayit()
