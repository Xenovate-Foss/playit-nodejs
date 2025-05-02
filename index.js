import PlayItClient from './v3.js';

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
