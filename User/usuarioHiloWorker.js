const { parentPort, workerData, threadId } = require("worker_threads");
const zmq = require("zeromq");
const fs = require("fs");

const logFile = fs.createWriteStream("UsersRecords.txt", { flags: "a" });
const logStdout = process.stdout;

console.log = function (message) {
  logFile.write(message + "\n");
  logStdout.write(message + "\n");
};

console.error = console.log;

let serverIP = "10.43.100.93";
let serverPort = 3000;

// Create a Subscriber to listen for redirection notifications
const subscriber = new zmq.Subscriber();
subscriber.connect("tcp://10.43.100.93:5000"); // Connect to the main server's publisher
subscriber.subscribe(""); // Subscribe to all messages

subscriber.on("message", (topic, message) => {
  const data = JSON.parse(message.toString());
  if (data.redirect) {
    serverIP = data.newServerIP;
    serverPort = data.userPort;
    console.log(`User ${workerData.userId} redirected to new server: ${serverIP}:${serverPort}`);
  }
});

// Function to request a taxi for a user
async function requestTaxi(userId, x, y) {
  const sock = new zmq.Request();
  sock.connect(`tcp://${serverIP}:${serverPort}`);
  
  console.log(`Thread: ${threadId} - User ${userId} requesting a taxi from: (${x}, ${y})...`);
  const startTime = Date.now();
  await sock.send(JSON.stringify({ userId, userX: x, userY: y }));
  const [result] = await sock.receive();
  const data = JSON.parse(result);
  const responseTime = Date.now() - startTime;
  sock.close();
  
  return { data, responseTime };
}

async function executeUser() {
  const { userId, x, y, tiempoEspera } = workerData;

  console.log(`Thread: ${threadId} - User ${userId} waiting ${tiempoEspera} seconds before requesting a taxi.`);
  await new Promise((resolve) => setTimeout(resolve, tiempoEspera * 1000));

  try {
    const { data: response, responseTime } = await requestTaxi(userId, x, y);
    if (response.success) {
      console.log(`Thread: ${threadId} - User ${userId} received taxi ${response.taxiId}. Distance: ${response.distance} km. Server response time: ${responseTime} ms`);
    } else {
      console.log(`Thread: ${threadId} - User ${userId} could not receive a taxi: ${response.message}`);
    }
  } catch (error) {
    console.error(`Error in user ${userId}'s request:`, error);
  } finally {
    parentPort.postMessage({ userId, completed: true });
    process.exit(0);
  }
}

// Execute the user's actions
executeUser();
