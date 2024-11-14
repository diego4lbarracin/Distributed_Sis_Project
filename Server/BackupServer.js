const zmq = require("zeromq");
const fs = require("fs");

const sock = new zmq.Reply();
const subscriber = new zmq.Subscriber();
const publisher = new zmq.Publisher();
const notificationSock = new zmq.Reply();

const logFile = fs.createWriteStream("BackupServerRecords.txt", { flags: "w" });
const logStdout = process.stdout;

console.log = function (message) {
  logFile.write(message + "\n");
  logStdout.write(message + "\n");
};

console.error = console.log;

const taxis = [];

// Function to start the backup server
async function startBackupServer() {
  await sock.bind("tcp://10.43.102.178:3000");
  await publisher.bind("tcp://10.43.102.178:5000");
  await notificationSock.bind("tcp://10.43.102.178:6000");
  subscriber.subscribe("taxiData");

  console.log("Backup server is up and running.");
}

// Handle incoming taxi data
async function handleTaxiData() {
  for await (const [topic, msg] of subscriber) {
    const taxiData = JSON.parse(msg.toString());
    let taxi = taxis.find((t) => t.id === taxiData.id);
    if (taxi) {
      taxi.x = taxiData.x;
      taxi.y = taxiData.y;
      taxi.libre = taxiData.available;
      taxi.numberOfServices = taxiData.numberOfServices;
    } else {
      taxi = {
        id: taxiData.id,
        x: taxiData.x,
        y: taxiData.y,
        libre: taxiData.available,
        numberOfServices: taxiData.numberOfServices,
      };
      taxis.push(taxi);
    }
    console.log(`Current state of taxi ${taxi.id}: ${JSON.stringify(taxi)}`);
  }
}

// Handle incoming user requests
async function handleUserRequests() {
  for await (const [msg] of sock) {
    const { userId, userX, userY } = JSON.parse(msg.toString());
    console.log(`User ${userId} requesting a taxi at (${userX}, ${userY})`);

    let assignedTaxi = null;
    let minDistance = Infinity;

    taxis.forEach((taxi) => {
      if (taxi.libre == 1) {
        const distance = Math.abs(taxi.x - userX) + Math.abs(taxi.y - userY);
        if (distance < minDistance || (distance === minDistance && taxi.id < (assignedTaxi ? assignedTaxi.id : Infinity))) {
          minDistance = distance;
          assignedTaxi = taxi;
        }
      }
    });

    if (assignedTaxi) {
      assignedTaxi.libre = 0;
      console.log(`Taxi ${assignedTaxi.id} assigned to user ${userId}.`);

      await publisher.send(
        JSON.stringify({
          taxiId: assignedTaxi.id,
          userId,
          userX,
          userY,
        })
      );

      await sock.send(
        JSON.stringify({
          success: true,
          taxiId: assignedTaxi.id,
          distance: minDistance,
        })
      );
    } else {
      console.log(`No taxis available for user ${userId}.`);
      await sock.send(
        JSON.stringify({
          success: false,
          message: "No taxis available at the moment.",
        })
      );
    }
  }
}

// Handle incoming taxi port notifications
async function handleTaxiNotifications() {
  for await (const [msg] of notificationSock) {
    const { id, port } = JSON.parse(msg.toString());
    console.log(`Notification received: Taxi ${id} on port ${port}`);

    subscriber.connect(`tcp://10.43.101.15:${port}`);
    subscriber.subscribe("taxiData");

    await notificationSock.send("ack");
  }
}

(async () => {
  try {
    await startBackupServer();
    await Promise.all([
      handleTaxiData(),
      handleUserRequests(),
      handleTaxiNotifications(),
    ]);
  } catch (error) {
    console.error("Error in the backup server:", error);
  }
})();