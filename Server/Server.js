const zmq = require("zeromq");
const fs = require("fs");

const sock = new zmq.Reply(); // Create a ZeroMQ Reply socket
const subscriber = new zmq.Subscriber(); // Create a ZeroMQ Subscriber socket
const publisher = new zmq.Publisher(); // Create a ZeroMQ Publisher socket
const notificationSock = new zmq.Reply(); // Create a ZeroMQ Reply socket for notifications
// Redirect console output to a file
const logFile = fs.createWriteStream("ServerRecords.txt", { flags: "w" });
const logStdout = process.stdout;

console.log = function (message) {
  logFile.write(message + "\n");
  logStdout.write(message + "\n");
};

console.error = console.log;

// Array to store taxi information
const taxis = [];

// Function to start the server
async function iniciarServidor() {
  // Bind the Reply socket to port 3000 to listen for user requests
  await sock.bind("tcp://*:3000");
  console.log(
    "Server listening to user's requests and replying on port 3000 (Request-Reply)"
  );

  // Bind the Publisher socket to port 5000 for sending notifications
  await publisher.bind("tcp://*:5000");
  console.log(
    "Server publishing taxis' information updates on port 5000 (Publisher-Subscriber)"
  );

  // Bind the notification socket to port 6000 for receiving taxi port notifications
  await notificationSock.bind("tcp://*:6000");
  console.log(
    "Server listening to taxi's information (taxi ID and port) and replying on port 6000 (Request-Reply)"
  );

  // Subscribe to the taxi data topic
  subscriber.subscribe("taxiData");
}

// Handle incoming taxi data
async function handleTaxiData() {
  for await (const [topic, msg] of subscriber) {
    const taxiData = JSON.parse(msg.toString());
    // console.log(`Datos recibidos del taxi: ${JSON.stringify(taxiData)}`);

    // Update the taxi information in the taxis array
    let taxi = taxis.find((t) => t.id === taxiData.id);
    if (taxi) {
      taxi.x = taxiData.x;
      taxi.y = taxiData.y;
      taxi.libre = taxiData.available;
      taxi.numberOfServices = taxiData.numberOfServices;
    } else {
      // Add new taxi if it doesn't exist
      taxi = {
        id: taxiData.id,
        x: taxiData.x,
        y: taxiData.y,
        libre: taxiData.available,
        numberOfServices: taxiData.numberOfServices,
      };
      taxis.push(taxi);
    }

    if (taxi) {
      console.log(
        `Current Taxi State = ID: ${taxi.id}, POS X: ${taxi.x}, POS Y: ${taxi.y}, AVAILABILITY: ${taxi.libre}, SERVICES: ${taxi.numberOfServices}`
      ); // Print the updated taxi information
    } else {
      console.log(
        `Taxi data could not be processed: ${JSON.stringify(taxiData)}`
      );
    }
  }
}

// Handle incoming user requests
async function handleUserRequests() {
  for await (const [msg] of sock) {
    const { userId, userX, userY } = JSON.parse(msg.toString());

    console.log(
      `Request obtained by the user ${userId} at (${userX}, ${userY})`
    );
    // console.log(
    //   `Estado actual de los taxis antes de asignar: ${JSON.stringify(taxis)}`
    // );

    // Buscar taxi disponible más cercano
    let taxiAsignado = null;
    let distanciaMinima = Infinity;

    taxis.forEach((taxi) => {
      if (taxi.libre == 1) {
        // Check if the taxi is available
        const distancia = Math.abs(taxi.x - userX) + Math.abs(taxi.y - userY);
        if (
          distancia < distanciaMinima ||
          (distancia === distanciaMinima &&
            taxi.id < (taxiAsignado ? taxiAsignado.id : Infinity))
        ) {
          distanciaMinima = distancia;
          taxiAsignado = taxi;
        }
      }
    });

    if (taxiAsignado) {
      taxiAsignado.libre = 0; // Marcar el taxi como ocupado
      console.log(`Taxi ${taxiAsignado.id} assigned to the user ${userId}.`);

      // Send notification to the assigned taxi
      await publisher.send(
        JSON.stringify({
          taxiId: taxiAsignado.id,
          userId,
          userX,
          userY,
        })
      );

      // Responder al usuario con los detalles del taxi asignado
      await sock.send(
        JSON.stringify({
          success: true,
          taxiId: taxiAsignado.id,
          distancia: distanciaMinima,
        })
      );
    } else {
      console.log(`There are not taxis availble for the user: ${userId}.`);

      // Responder con un mensaje de rechazo
      await sock.send(
        JSON.stringify({
          success: false,
          message: "There are not taxis available at the moment.",
        })
      );
    }
  }
}

// Handle incoming taxi port notifications
async function handleTaxiNotifications() {
  for await (const [msg] of notificationSock) {
    const { id, port } = JSON.parse(msg.toString());
    console.log(`Notification received: Taxi ${id} on ${port}`);

    // Connect the Subscriber socket to the taxi's port
    subscriber.connect(`tcp://localhost:${port}`);
    subscriber.subscribe("taxiData");

    // Send acknowledgment
    await notificationSock.send("ack");
  }
}

// Start the server and handle any errors
(async () => {
  try {
    await iniciarServidor();
    await Promise.all([
      handleTaxiData(),
      handleUserRequests(),
      handleTaxiNotifications(),
    ]);
  } catch (error) {
    console.error("Server error:", error);
  }
})();
