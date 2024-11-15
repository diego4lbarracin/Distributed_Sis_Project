// TaxiProcess.js
const zmq = require("zeromq");
const fs = require("fs");

// Redirect console output to a file
const logFile = fs.createWriteStream("TaxiProcess.txt", { flags: "a" });
const logStdout = process.stdout;

console.log = function (message) {
  logFile.write(message + "\n");
  logStdout.write(message + "\n");
};

console.error = console.log;

// Extract arguments passed to the process
const [id, x, y, speed, numberOfServices, N, M, available, port] = process.argv
  .slice(2)
  .map((arg, index) => (index < 8 ? Number(arg) : arg === "true" ? true : Number(arg)));

let currentX = x;
let currentY = y;
let isAvailable = true;
let servicesLeft = numberOfServices;

// Create a ZeroMQ Publish socket
const sock = new zmq.Publisher();

// Create a ZeroMQ Subscriber socket to receive notifications
const subscriber = new zmq.Subscriber();
subscriber.connect("tcp://10.43.100.93:5000");
subscriber.subscribe("");

// Function to update the taxi's position
function updatePosition() {
  if (speed > 0) {
    // Randomly choose to move horizontally or vertically
    const moveHorizontally = Math.random() < 0.5;

    if (moveHorizontally) {
      currentX += speed;
      if (currentX > N) currentX = N;
      if (currentX < 0) currentX = 0;
    } else {
      currentY += speed;
      if (currentY > M) currentY = M;
      if (currentY < 0) currentY = 0;
    }

    console.log(`Taxi ${id} position updated to (${currentX}, ${currentY})`);
  }
}

// Function to send taxi data to the server
async function sendTaxiData() {
  const data = {
    id,
    x: currentX,
    y: currentY,
    speed,
    numberOfServices: servicesLeft,
    available: isAvailable,
  };
  await sock.send(["taxiData", JSON.stringify(data)]);
  console.log(`Taxi ${id} data sent: ${JSON.stringify(data)}`);
}

// Function to handle assignment notification
async function handleAssignment(userId, userX, userY) {
  servicesLeft -= 1;
  isAvailable = false;
  console.log(`Taxi ${id} assigned to user ${userId}. Services left: ${servicesLeft}`);

  // Wait for 30 seconds before returning to the original position
  await new Promise((resolve) => setTimeout(resolve, 30000));

  if (servicesLeft > 0) {
    currentX = x;
    currentY = y;
    isAvailable = true;
    console.log(`Taxi ${id} returned to original position (${currentX}, ${currentY}) and is now available.`);
  } else {
    console.log(`Taxi ${id} has no services left and will be disconnected.`);
    await sendTaxiData(); // Send final data before disconnecting
    process.exit(0); // Kill the process
  }

  await sendTaxiData(); // Send updated data
}

// Listen for assignment notifications
(async () => {
  for await (const [msg] of subscriber) {
    const { taxiId, userId, userX, userY } = JSON.parse(msg.toString());
    if (taxiId === id) {
      handleAssignment(userId, userX, userY);
    }
  }
})();

// Bind the socket and start sending data
(async () => {
  await sock.bind(`tcp://10.43.101.15:${port}`);
  console.log(`Taxi ${id} bound to port ${port}`);

  // Notify the server about the taxi's port
  const notificationSock = new zmq.Request();
  await notificationSock.connect("tcp://10.43.100.93:6000");
  await notificationSock.send(JSON.stringify({ id, port }));
  await notificationSock.close();

  // Send initial data
  sendTaxiData();

  // Update position and send data every 30 seconds
  setInterval(() => {
    if (isAvailable) {
      updatePosition();
      sendTaxiData();
    }
  }, 30000);
})();
