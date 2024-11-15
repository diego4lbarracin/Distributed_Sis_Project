// Import required modules
const fs = require("fs");
const { Worker } = require("worker_threads");
const path = require("path");

// Function to create a user and run it in a worker thread
function crearUsuario(userId, x, y, tiempoEspera) {
  return new Promise((resolve, reject) => {
    // Create a new worker thread to handle the user
    const worker = new Worker(path.resolve(__dirname, "usuarioHiloWorker.js"), {
      workerData: { userId, x, y, tiempoEspera }, // Pass user data to the worker
    });
    // Resolve the promise when the worker sends a message
    worker.on("message", resolve);
    // Reject the promise if the worker encounters an error
    worker.on("error", reject);
    // Reject the promise if the worker exits with a non-zero exit code
    worker.on("exit", (code) => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}

// Function to generate multiple users based on coordinates from a file
async function generarUsuarios(archivoCoordenadas, numUsuarios, waitMax) {
  try {
    // Read the coordinates file
    const data = fs.readFileSync(archivoCoordenadas, "utf8");
    const lineas = data.trim().split("\n"); // Split file content into lines
    const usuarios = [];
    // Loop through the number of users or the number of lines in the file, whichever is smaller
    for (let i = 0; i < numUsuarios && i < lineas.length; i++) {
      const [x, y] = lineas[i].split(",").map(Number); // Parse coordinates
      const tiempoEspera = Math.floor(Math.random() * waitMax) + 1; // Random wait time
      usuarios.push(crearUsuario(i + 1, x, y, tiempoEspera)); // Create user and add to the list
      await sleep(100); // Wait 100ms before creating the next user
    }
    await Promise.all(usuarios); // Wait for all users to complete their tasks
    console.log("All users have completed their taxi requests.");
  } catch (error) {
    console.log("Error reading the file or creating users: ", error); // Log any errors
  }
}

// Function to sleep for a given number of milliseconds
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Parse command line arguments
const numUsuarios = parseInt(process.argv[2], 10) || 5;
const tiempoEsperaMax = parseInt(process.argv[3], 10) || 10;
const colMat = parseInt(process.argv[4], 10) || 10;
const filMat = parseInt(process.argv[5], 10) || 10;
const archivoCoordenadas = `./${process.argv[6]}`;

// Generate users based on the parsed arguments
generarUsuarios(archivoCoordenadas, numUsuarios, tiempoEsperaMax);
