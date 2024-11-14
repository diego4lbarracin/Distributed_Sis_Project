const zmq = require("zeromq");
const healthCheckInterval = 5000; // 5 segundos

async function checkHealth() {
    const socket = new zmq.Request();
    socket.connect("tcp://10.43.100.93:3000");

    try {
        await socket.send("health_check");
        const [response] = await socket.receive();
        console.log("El servidor principal está en funcionamiento:", response.toString());
    } catch (error) {
        console.error("Error: el servidor principal no está respondiendo.");
        activateBackupServer();
    } finally {
        socket.close();
    }
}

// Función para activar el servidor de respaldo
function activateBackupServer() {
    console.log("Activando el servidor de respaldo...");
    const backupSocket = new zmq.Request();
    backupSocket.connect("tcp://10.43.102.178:3001");
    // Envía un mensaje o ejecuta lógica para activar el servidor de respaldo.
}

// Ejecuta el health check en intervalos
setInterval(checkHealth, healthCheckInterval);