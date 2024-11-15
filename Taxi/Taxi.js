const fs = require("fs");
const { fork } = require("child_process");

// Function to initialize a new Taxi
function initializeTaxis(textFileName, N, M) {
  // Read the text file
  const data = fs.readFileSync(textFileName, "utf8");
  const lines = data.trim().split("\n"); // Split file content into lines

  // Loop through each line to initialize taxis
  lines.forEach((line, index) => {
    const [position, speed, numberOfServices] = line.split(" ");
    const [x, y] = position.split(",").map(Number);
    const id = Math.floor(Math.random() * 10000); // Generate a random ID
    const port = 4000 + index; // Assign a unique port for each taxi

    // Create a new process for each taxi
    const taxiProcess = fork("./TaxiProcess.js", [
      id,
      x,
      y,
      speed,
      numberOfServices,
      N,
      M,
      true, // Initialize available to true
      port, // Pass the unique port
    ]);

    console.log(
      `Taxi ${id} initialized at position (${x}, ${y}) with speed ${speed} and ${numberOfServices} services.`
    );
  });
}

// Capture arguments from the terminal
const [, , N, M, textFileName] = process.argv;

// Initialize taxis using the provided text file
initializeTaxis(textFileName, N, M);
