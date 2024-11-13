const zmq = require('zeromq');
const sock = new zmq.Reply();

const taxis = [
    { id: 1, x: 0, y: 0, libre: true },
    { id: 2, x: 5, y: 5, libre: true },
    // Puedes agregar más taxis con posiciones iniciales
];

async function iniciarServidor() {
    await sock.bind("tcp://*:3000");
    console.log("Servidor central escuchando en el puerto 3000...");

    for await (const [msg] of sock) {
        const { userId, userX, userY } = JSON.parse(msg.toString());

        console.log(`Solicitud recibida de usuario ${userId} en (${userX}, ${userY})`);

        // Buscar taxi disponible más cercano
        let taxiAsignado = null;
        let distanciaMinima = Infinity;

        taxis.forEach((taxi) => {
            if (taxi.libre) {
                const distancia = Math.abs(taxi.x - userX) + Math.abs(taxi.y - userY);
                if (distancia < distanciaMinima) {
                    distanciaMinima = distancia;
                    taxiAsignado = taxi;
                }
            }
        });

        if (taxiAsignado) {
            taxiAsignado.libre = false; // Marcar el taxi como ocupado
            console.log(`Taxi ${taxiAsignado.id} asignado al usuario ${userId}`);

            // Responder al usuario con los detalles del taxi asignado
            await sock.send(JSON.stringify({
                success: true,
                taxiId: taxiAsignado.id,
                distancia: distanciaMinima
            }));
        } else {
            console.log(`No hay taxis disponibles para el usuario ${userId}`);
            
            // Responder con un mensaje de rechazo
            await sock.send(JSON.stringify({
                success: false,
                message: "No hay taxis disponibles en este momento."
            }));
        }
    }
}

iniciarServidor().catch(error => console.error("Error en el servidor:", error));
