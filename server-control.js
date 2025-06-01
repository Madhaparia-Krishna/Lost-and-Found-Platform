// Helper script to start/stop the server with additional error handling
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Setup readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to the server process ID file
const pidFilePath = path.join(__dirname, 'server.pid');

// Function to check if a port is in use
function checkPort(port) {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' 
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port}`;
      
    exec(command, (error, stdout) => {
      if (error || !stdout) {
        resolve(false); // Port is not in use
      } else {
        resolve(true); // Port is in use
      }
    });
  });
}

// Function to kill a process by PID
function killProcess(pid) {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' 
      ? `taskkill /F /PID ${pid}`
      : `kill -9 ${pid}`;
      
    exec(command, (error, stdout) => {
      if (error) {
        console.error(`Error killing process: ${error.message}`);
        resolve(false);
      } else {
        console.log(`Successfully terminated process with PID ${pid}`);
        resolve(true);
      }
    });
  });
}

// Function to find and kill processes using a specific port
async function killProcessOnPort(port) {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' 
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port} | grep LISTEN | awk '{print $2}'`;
      
    exec(command, async (error, stdout) => {
      if (error || !stdout) {
        console.log(`No process found using port ${port}`);
        resolve(false);
      } else {
        let pids = [];
        
        if (process.platform === 'win32') {
          // Parse Windows netstat output to extract PIDs
          const lines = stdout.trim().split('\n');
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length > 4) {
              const pid = parts[parts.length - 1];
              // Skip PID 0 as it's a system process
              if (pid !== '0' && !pids.includes(pid)) {
                pids.push(pid);
              }
            }
          }
        } else {
          // Unix/Linux already gives us PIDs
          pids = stdout.trim().split('\n').filter(pid => pid !== '0');
        }
        
        if (pids.length === 0) {
          console.log(`No process found using port ${port}`);
          resolve(false);
          return;
        }
        
        console.log(`Found processes using port ${port}: ${pids.join(', ')}`);
        
        for (const pid of pids) {
          await killProcess(pid);
        }
        
        console.log(`All processes using port ${port} have been terminated`);
        resolve(true);
      }
    });
  });
}

// Function to start the server
async function startServer() {
  console.log('Starting server...');
  
  // Check if port 5000 is in use
  const isPortInUse = await checkPort(5000);
  if (isPortInUse) {
    console.log('Port 5000 is already in use. Would you like to:');
    console.log('1. Kill the process and start the server');
    console.log('2. Start the server on a different port');
    console.log('3. Cancel');
    
    rl.question('Enter your choice (1, 2, or 3): ', async (answer) => {
      if (answer === '1') {
        await killProcessOnPort(5000);
        launchServer();
      } else if (answer === '2') {
        rl.question('Enter the port number to use: ', (port) => {
          process.env.PORT = port;
          launchServer();
        });
      } else {
        console.log('Server start canceled.');
        rl.close();
      }
    });
  } else {
    launchServer();
  }
}

// Function to launch the server process
function launchServer() {
  const serverProcess = spawn('node', ['server.js'], {
    detached: true,
    stdio: 'inherit'
  });
  
  // Save the PID to a file
  fs.writeFileSync(pidFilePath, `${serverProcess.pid}`);
  
  console.log(`Server started with PID: ${serverProcess.pid}`);
  console.log('To stop the server, run "node server-control.js stop"');
  
  // Allow the process to continue running after this script exits
  serverProcess.unref();
  rl.close();
}

// Function to stop the server
async function stopServer() {
  // Check if PID file exists
  if (fs.existsSync(pidFilePath)) {
    const pid = fs.readFileSync(pidFilePath, 'utf8').trim();
    console.log(`Stopping server with PID: ${pid}`);
    
    const killed = await killProcess(pid);
    if (killed) {
      fs.unlinkSync(pidFilePath);
      console.log('Server stopped successfully');
    } else {
      console.log('Failed to stop server process. It may have already been terminated.');
      // Clean up the PID file anyway
      fs.unlinkSync(pidFilePath);
    }
  } else {
    console.log('No running server found. Checking for processes on port 5000...');
    await killProcessOnPort(5000);
  }
  
  rl.close();
}

// Main function
async function main() {
  const command = process.argv[2] || 'start';
  
  if (command === 'start') {
    await startServer();
  } else if (command === 'stop') {
    await stopServer();
  } else if (command === 'restart') {
    await stopServer();
    console.log('Waiting for port to be released...');
    // Wait a bit for the port to be released
    setTimeout(async () => {
      await startServer();
    }, 2000);
  } else {
    console.log('Unknown command. Use "start", "stop", or "restart"');
    rl.close();
  }
}

// Run the main function
main(); 