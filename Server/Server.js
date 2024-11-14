const zmq = require("zeromq");
const sock = new zmq.Reply(); // Create a ZeroMQ Reply socket
const subscriber = new zmq.Subscriber(); // Create a ZeroMQ Subscriber socket
const publisher = new zmq.Publisher(); // Create a ZeroMQ Publisher socket
const notificationSock = new zmq.Reply(); // Create a ZeroMQ Reply socket for notifications

// Array to store taxi information
const taxis = [];

// Function to start the server
async function iniciarServidor() {
  // Bind the Reply socket to port 3000 to listen for user requests
  await sock.bind("tcp://*:3000");
  console.log("Servidor central escuchando en el puerto 3000...");

  // Bind the Publisher socket to port 5000 for sending notifications
  await publisher.bind("tcp://*:5001");
  console.log("Servidor publicando notificaciones en el puerto 5000...");

  // Bind the notification socket to port 6000 for receiving taxi port notifications
  await notificationSock.bind("tcp://*:6000");
  console.log(
    "Servidor escuchando notificaciones de taxis en el puerto 6000..."
  );

  // Subscribe to the taxi data topic
  subscriber.subscribe("taxiData");
}

// Handle incoming taxi data
async function handleTaxiData() {
  for await (const [topic, msg] of subscriber) {
    const taxiData = JSON.parse(msg.toString());
    console.log(`Datos recibidos del taxi: ${JSON.stringify(taxiData)}`);

    // Update the taxi information in the taxis array
    let taxi = taxis.find((t) => t.id === taxiData.id);
    if (taxi) {
      taxi.x = taxiData.x;
      taxi.y = taxiData.y;
      taxi.libre = taxiData.available;
      taxi.numberOfServices = taxiData.numberOfServices;
    } else {
      // Add new taxi if it doesn't exist
      taxis.push({
        id: taxiData.id,
        x: taxiData.x,
        y: taxiData.y,
        libre: taxiData.available,
        numberOfServices: taxiData.numberOfServices,
      });
    }
    console.log(`Estado actual de los taxis: ${JSON.stringify(taxis)}`);
  }
}

// Handle incoming user requests
async function handleUserRequests() {
  for await (const [msg] of sock) {
    const { userId, userX, userY } = JSON.parse(msg.toString());

    console.log(
      `Solicitud recibida de usuario ${userId} en (${userX}, ${userY})`
    );
    console.log(
      `Estado actual de los taxis antes de asignar: ${JSON.stringify(taxis)}`
    );

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
      console.log(`Taxi ${taxiAsignado.id} asignado al usuario ${userId}`);

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
      console.log(`No hay taxis disponibles para el usuario ${userId}`);

      // Responder con un mensaje de rechazo
      await sock.send(
        JSON.stringify({
          success: false,
          message: "No hay taxis disponibles en este momento.",
        })
      );
    }
  }
}

// Handle incoming taxi port notifications
async function handleTaxiNotifications() {
  for await (const [msg] of notificationSock) {
    const { id, port } = JSON.parse(msg.toString());
    console.log(`Notificación recibida: Taxi ${id} en el puerto ${port}`);

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
    console.error("Error en el servidor:", error);
  }
})();
