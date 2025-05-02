# PlayIt Module Documentation

The PlayIt module provides a convenient way to interact with the playit-cli tool using a modern JavaScript API. This module allows you to manage tunnels programmatically with event-based feedback.

## Installation

1. Save the module file to your project directory (e.g., as `v4.js`)
2. Make sure you have the `playit-cli` command line tool already installed

## Basic Usage
### Importing the Module

```javascript
import PlayItClient from './v4.js';
```

### Creating a Client Instance

```javascript
const playit = new PlayItClient();
```

### Common Operations

#### Login and Generate Claim Code

```javascript
// Set up event listeners first
playit.on('claim', ({ code, url }) => {
  console.log(`Visit ${url} to claim your tunnel`);
});

playit.on('secret', ({ path, key }) => {
  console.log(`Secret saved to ${path}`);
});

// Start the login process
playit.login();
```

#### List Available Tunnels

```javascript
playit.on('tunnels', (tunnelData) => {
  console.log('Your tunnels:', tunnelData);
});

playit.listTunnels();
```

#### Start the PlayIt Agent

```javascript
playit.on('starting', () => {
  console.log('PlayIt agent is starting...');
});

playit.on('stopped', (code) => {
  console.log(`PlayIt agent stopped with code ${code}`);
});

playit.start();
```

## Event Reference

The PlayItClient emits the following events:

| Event | Data | Description |
|-------|------|-------------|
| `claim` | `{ code, url }` | Emitted when a claim code is generated |
| `exchanging` | `claimCode` | Emitted when exchanging the claim code for a secret |
| `secret` | `{ path, key }` | Emitted when a secret key is successfully obtained and saved |
| `tunnels` | `tunnelData` | Emitted with tunnel information when listing tunnels |
| `starting` | - | Emitted when the agent is starting |
| `stopped` | `exitCode` | Emitted when the agent stops |
| `resetting` | - | Emitted when resetting the configuration |
| `reset-complete` | `exitCode` | Emitted when reset is complete |
| `secret-path` | `path` | Emitted with the path to the secret key file |
| `version` | `versionString` | Emitted with the playit-cli version |
| `help` | `helpText` | Emitted with help information |
| `error` | `errorMessage` | Emitted when any error occurs |
| `warning` | `warningMessage` | Emitted for non-critical issues |

## Complete Example

```javascript
import PlayItClient from './v4.js';

const playit = new PlayItClient();

// Set up event listeners
playit.on('claim', ({ code, url }) => {
  console.log(`Please visit ${url} to claim your instance`);
  console.log(`Your claim code is: ${code}`);
});

playit.on('exchanging', (code) => {
  console.log(`Exchanging claim code: ${code}`);
});

playit.on('secret', ({ path, key }) => {
  console.log(`Secret key saved to: ${path}`);
  console.log(`Your secret key is: ${key}`);
  
  // Once we have the secret, we can start the agent
  playit.start();
});

playit.on('starting', () => {
  console.log('PlayIt agent is starting...');
});

playit.on('tunnels', (tunnelData) => {
  console.log('Your active tunnels:');
  console.log(JSON.stringify(tunnelData, null, 2));
});

playit.on('error', (error) => {
  console.error('Error occurred:', error);
});

// Start the login process
playit.login();
```

## Command Line Usage

The module can still be used as a command line tool for backward compatibility:

```bash
node v4 --login    # Start login process
node v4 --start    # Start the agent
node v4 --list     # List all tunnels
node v4 --reset    # Reset configuration
node v4 --secret-path  # Show secret path
node v4 --version  # Show version
node v4 --help     # Show help information
```

## Configuration

The module uses the default PlayIt configuration path: `~/.config/playit_gg/playit.toml`

## Advanced Usage

### Creating a Web Interface

You can integrate this module with a web server to create a web interface for managing your tunnels:

```javascript
import express from 'express';
import PlayItClient from './v4.js';

const app = express();
const playit = new PlayItClient();
let tunnelInfo = null;

// Store tunnel information when available
playit.on('tunnels', (data) => {
  tunnelInfo = data;
});

// API endpoint to get tunnels
app.get('/api/tunnels', (req, res) => {
  res.json(tunnelInfo || { error: 'No tunnel information available' });
});

// API endpoint to start tunnels
app.post('/api/start', (req, res) => {
  playit.start();
  res.json({ status: 'started' });
});

app.listen(3000, () => {
  console.log('Web interface running on port 3000');
});

// Initial tunnel list
playit.listTunnels();
```

### Auto-Reconnect Feature

You can implement an auto-reconnect feature:

```javascript
import PlayItClient from './v4.js';

const playit = new PlayItClient();
let reconnectTimer = null;

function startWithReconnect() {
  playit.start();
}

playit.on('stopped', (code) => {
  console.log(`PlayIt agent stopped with code ${code}`);
  
  // Reconnect after 5 seconds if not stopped manually
  if (code !== 0) {
    console.log('Reconnecting in 5 seconds...');
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(startWithReconnect, 5000);
  }
});

// Initial start
startWithReconnect();
```

## Troubleshooting

### Common Issues

1. **"playit-cli not found"**: Ensure playit-cli is installed and in your PATH
2. **Secret key not saving**: Check file permissions in the ~/.config directory
3. **Connection issues**: Verify your internet connection and firewall settings

### Debugging

For detailed debug logs, you can listen to all events:

```javascript
const events = [
  'claim', 'exchanging', 'secret', 'tunnels', 'starting', 
  'stopped', 'resetting', 'reset-complete', 'secret-path', 
  'version', 'help', 'error', 'warning'
];

events.forEach(event => {
  playit.on(event, (data) => {
    console.log(`[DEBUG] Event: ${event}`, data);
  });
});
```

## License

This module uses the MIT license.
