// Import required modules from worker_threads and zeromq
const { parentPort, workerData, threadId } = require("worker_threads");
const zmq = require("zeromq");
const fs = require("fs");

// Redirect console output to a file
// Make sure to delete the file before running the program
const logFile = fs.createWriteStream("UsersRecords.txt", { flags: "a" });
const logStdout = process.stdout;

console.log = function (message) {
  logFile.write(message + "\n");
  logStdout.write(message + "\n");
};

console.error = console.log;

// Function to request a taxi for a user
async function solicitarTaxi(userId, x, y) {
  const sock = new zmq.Request(); // Create a new ZeroMQ request socket
  sock.connect("tcp://10.43.100.93:3000"); // Connect to the server at localhost on port 300

  console.log(
    `Thread: ${threadId} - User ${userId} requesting a taxi from: (${x}, ${y})...`
  );
  const startTime = Date.now(); // Record the start time of the request
  await sock.send(JSON.stringify({ userId, userX: x, userY: y })); // Send the user data to the server
  const [result] = await sock.receive(); // Wait for the server's response
  const data = JSON.parse(result); // Parse the server's response
  const responseTime = Date.now() - startTime; // Calculate the response time
  sock.close(); // Close the socket
  return { data, responseTime }; // Return the server's response and the response time
}

// Function to execute the user's actions
async function ejecutarUsuario() {
  const { userId, x, y, tiempoEspera } = workerData; // Extract user data from workerData

  console.log(
    `Thread: ${threadId} - User ${userId} waiting ${tiempoEspera} seconds before requesting a taxi.`
  );
  await new Promise((resolve) => setTimeout(resolve, tiempoEspera * 1000)); // Wait for the specified time before requesting a taxi

  try {
    const { data: respuesta, responseTime } = await solicitarTaxi(userId, x, y); // Request a taxi and get the response
    if (respuesta.success) {
      console.log(
        `Thread: ${threadId} - User ${userId} has received a taxi with id ${respuesta.taxiId}. Distance: ${respuesta.distancia} km. Server's response time: ${responseTime} ms`
      );
    } else {
      console.log(
        `Thread: ${threadId} - User ${userId} couldn't receive a taxi: ${respuesta.message}`
      );
    }
  } catch (error) {
    console.error(`Error in the user's ${userId} request:`, error); // Log any errors
  } finally {
    // Notify that the user's task is complete
    parentPort.postMessage({ userId, completado: true });
    process.exit(0); // Terminate the worker thread
  }
}

// Execute the user's actions
ejecutarUsuario();
