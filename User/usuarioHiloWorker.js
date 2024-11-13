const { parentPort, workerData, threadId } = require('worker_threads');
const zmq = require('zeromq');

async function solicitarTaxi(userId, x, y) {
    const sock = new zmq.Request();
    sock.connect("tcp://localhost:3000");

    console.log(`Hilo: ${threadId} - Usuario ${userId} solicitando taxi desde (${x}, ${y})...`);
    const startTime = Date.now();
    await sock.send(JSON.stringify({ userId, userX: x, userY: y }));
    const [result] = await sock.receive();
    const data = JSON.parse(result);
    const responseTime = Date.now() - startTime;
    sock.close();
    return {data, responseTime};
}

async function ejecutarUsuario() {
    const { userId, x, y, tiempoEspera } = workerData;

    console.log(`Hilo: ${threadId} - Usuario ${userId} esperando ${tiempoEspera} segundos antes de solicitar un taxi.`);
    await new Promise(resolve => setTimeout(resolve, tiempoEspera * 1000));

    try {
        const {data: respuesta, responseTime} = await solicitarTaxi(userId, x, y);
        if (respuesta.success) {
            console.log(`Hilo: ${threadId} - Usuario ${userId} ha recibido el taxi con ID ${respuesta.taxiId}. Distancia: ${respuesta.distancia} km. Tiempo de respuesta del servidor: ${responseTime} ms`);
        } else {
            console.log(`Hilo: ${threadId} - Usuario ${userId} no pudo recibir un taxi: ${respuesta.message}`);
        }
    } catch (error) {
        console.error(`Error en la solicitud del usuario ${userId}:`, error);
    } finally {
        // Notifica que el trabajo del usuario ha terminado
        parentPort.postMessage({ userId, completado: true });
    }
}

ejecutarUsuario();
