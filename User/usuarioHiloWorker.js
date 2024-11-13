// Import required modules from worker_threads and zeromq
const { parentPort, workerData, threadId } = require("worker_threads");
const zmq = require("zeromq");

// Function to request a taxi for a user
async function solicitarTaxi(userId, x, y) {
  const sock = new zmq.Request(); // Create a new ZeroMQ request socket
  sock.connect("tcp://localhost:3000"); // Connect to the server at localhost on port 3000

  console.log(
    `Hilo: ${threadId} - Usuario ${userId} solicitando taxi desde (${x}, ${y})...`
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
    `Hilo: ${threadId} - Usuario ${userId} esperando ${tiempoEspera} segundos antes de solicitar un taxi.`
  );
  await new Promise((resolve) => setTimeout(resolve, tiempoEspera * 1000)); // Wait for the specified time before requesting a taxi

  try {
    const { data: respuesta, responseTime } = await solicitarTaxi(userId, x, y); // Request a taxi and get the response
    if (respuesta.success) {
      console.log(
        `Hilo: ${threadId} - Usuario ${userId} ha recibido el taxi con ID ${respuesta.taxiId}. Distancia: ${respuesta.distancia} km. Tiempo de respuesta del servidor: ${responseTime} ms`
      );
    } else {
      console.log(
        `Hilo: ${threadId} - Usuario ${userId} no pudo recibir un taxi: ${respuesta.message}`
      );
    }
  } catch (error) {
    console.error(`Error en la solicitud del usuario ${userId}:`, error); // Log any errors
  } finally {
    // Notify that the user's task is complete
    parentPort.postMessage({ userId, completado: true });
    process.exit(0); // Terminate the worker thread
  }
}

// Execute the user's actions
ejecutarUsuario();
