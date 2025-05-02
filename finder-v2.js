// playit-manager.js
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';

const execAsync = promisify(exec);

/**
 * Find or install Playit binary for the current system
 * @param {Object} options - Configuration options
 * @param {boolean} [options.autoInstall=false] - Whether to install if not found
 * @param {string} [options.installDir] - Custom installation directory
 * @returns {Promise<{path: string|null, installed: boolean, error: string|null}>}
 */
export async function getPlayitBinary(options = {}) {
  const { autoInstall = false, installDir } = options;
  
  try {
    // Detect platform, architecture and check if we're on Termux
    const platformInfo = await detectPlatform();
    
    // First try to find existing binary
    const binaryPath = await findPlayitBinary(platformInfo);
    
    if (binaryPath) {
      return {
        path: binaryPath,
        installed: true,
        error: null
      };
    }
    
    // If binary not found and autoInstall is enabled, try to install
    if (autoInstall) {
      const installResult = await installPlayitBinary(platformInfo, installDir);
      return installResult;
    }
    
    // Binary not found and auto-install not enabled
    return {
      path: null,
      installed: false,
      error: 'Playit binary not found. Set autoInstall to true to attempt installation.'
    };
    
  } catch (error) {
    return {
      path: null,
      installed: false,
      error: `Error finding Playit binary: ${error.message}`
    };
  }
}

/**
 * Detect the current platform, architecture and environment
 * @returns {Promise<{platform: string, arch: string, isTermux: boolean}>}
 */
async function detectPlatform() {
  const platform = os.platform();
  const arch = os.arch();
  const isTermux = await checkIfTermux();
  
  return { 
    platform, 
    arch, 
    isTermux 
  };
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
 * @param {Object} platformInfo - Platform information
 * @returns {Promise<string|null>} - Path to the binary or null if not found
 */
async function findPlayitBinary(platformInfo) {
  const { platform, isTermux } = platformInfo;
  
  // If on Termux, check if playit-cli is available in PATH
  if (isTermux) {
    try {
      const { stdout } = await execAsync('which playit-cli');
      if (stdout.trim()) {
        return 'playit-cli'; // Return command name rather than path
      }
    } catch {
      // Not in PATH
    }
  }
  
  // For other platforms, find the appropriate binary
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

/**
 * Install Playit binary using GitHub API
 * @param {Object} platformInfo - Platform information
 * @param {string} [customInstallDir] - Custom installation directory
 * @returns {Promise<{path: string|null, installed: boolean, error: string|null}>}
 */
async function installPlayitBinary(platformInfo, customInstallDir) {
  const { platform, arch, isTermux } = platformInfo;
  
  try {
    // If on Termux, we'll use pkg to install playit-cli
    if (isTermux) {
      try {
        console.log('Installing playit-cli on Termux...');
        await execAsync('pkg install playit-cli');
        return {
          path: 'playit-cli',
          installed: true,
          error: null
        };
      } catch (error) {
        return {
          path: null,
          installed: false,
          error: `Failed to install playit-cli on Termux: ${error.message}`
        };
      }
    }
    
    // For other platforms, use GitHub API to get the latest release
    const releaseInfo = await getLatestReleaseInfo();
    if (!releaseInfo) {
      return {
        path: null,
        installed: false,
        error: 'Failed to fetch release information from GitHub API'
      };
    }
    
    // Map OS and architecture to GitHub release asset pattern
    const assetPattern = getAssetPattern(platform, arch);
    if (!assetPattern) {
      return {
        path: null,
        installed: false,
        error: `Unsupported platform/architecture: ${platform}/${arch}`
      };
    }
    
    // Find matching asset in release
    const asset = releaseInfo.assets.find(asset => 
      asset.name.toLowerCase().includes(assetPattern.toLowerCase())
    );
    
    if (!asset) {
      return {
        path: null,
        installed: false,
        error: `No matching binary found for ${platform}/${arch} in release ${releaseInfo.tag_name}`
      };
    }
    
    // Determine installation directory
    const installDir = customInstallDir || (platform === 'win32' 
      ? path.join(os.homedir(), 'AppData', 'Local', 'playit')
      : path.join(os.homedir(), '.local', 'bin'));
    
    // Create directory if it doesn't exist
    await fs.mkdir(installDir, { recursive: true });
    
    // Determine binary name and path
    const binaryName = platform === 'win32' ? 'playit.exe' : 'playit';
    const binaryPath = path.join(installDir, binaryName);
    
    // Download binary
    console.log(`Downloading PlayIt from ${asset.browser_download_url}...`);
    await downloadFile(asset.browser_download_url, binaryPath);
    
    // Make binary executable (not needed on Windows)
    if (platform !== 'win32') {
      await fs.chmod(binaryPath, 0o755);
    }
    
    console.log(`PlayIt binary installed to: ${binaryPath}`);
    return {
      path: binaryPath,
      installed: true,
      error: null
    };
    
  } catch (error) {
    return {
      path: null,
      installed: false,
      error: `Installation failed: ${error.message}`
    };
  }
}

/**
 * Get latest release information from GitHub API
 * @returns {Promise<Object|null>}
 */
function getLatestReleaseInfo() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/playit-cloud/playit-agent/releases/latest',
      headers: {
        'User-Agent': 'Node.js PlayIt Binary Manager',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    https.get(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            console.error(`GitHub API returned status code ${res.statusCode}`);
            resolve(null);
          }
        } catch (e) {
          console.error('Error parsing GitHub API response:', e.message);
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error('Error accessing GitHub API:', err.message);
      resolve(null);
    });
  });
}

/**
 * Map platform and architecture to GitHub release asset pattern
 * @param {string} platform - OS platform
 * @param {string} arch - CPU architecture
 * @returns {string|null} - Asset pattern to look for
 */
function getAssetPattern(platform, arch) {
  // Map Node.js platform/arch to GitHub release asset patterns
  const patterns = {
    win32: {
      x64: 'windows-amd64',
      ia32: 'windows-386',
      arm64: 'windows-arm64'
    },
    linux: {
      x64: 'linux-amd64',
      ia32: 'linux-386',
      arm: 'linux-arm',
      arm64: 'linux-arm64'
    },
    darwin: {
      x64: 'darwin-amd64',
      arm64: 'darwin-arm64'
    }
  };
  
  if (patterns[platform] && patterns[platform][arch]) {
    return patterns[platform][arch];
  }
  
  return null;
}

/**
 * Download a file from a URL
 * @param {string} url - URL to download from
 * @param {string} destination - Path to save the file
 * @returns {Promise<void>}
 */
function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destination);
    
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        fileStream.close();
        return downloadFile(response.headers.location, destination)
          .then(resolve)
          .catch(reject);
      }
      
      // Check for successful response
      if (response.statusCode !== 200) {
        fileStream.close();
        return reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
      }
      
      // Pipe the response to the file
      response.pipe(fileStream);
      
      // Handle errors
      fileStream.on('error', (err) => {
        fileStream.close();
        reject(err);
      });
      
      // Resolve promise when download completes
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', (err) => {
      fileStream.close();
      reject(err);
    });
  });
}

// Example usage
export async function example() {
  // Just find binary, don't install
  const findResult = await getPlayitBinary();
  console.log('Find result:', findResult);
  
  // Find binary or install if not found
  const installResult = await getPlayitBinary({ 
    autoInstall: true,
    installDir: path.join(process.cwd(), 'bin')
  });
  console.log('Install result:', installResult);
  
  return installResult.path;
}

example()
