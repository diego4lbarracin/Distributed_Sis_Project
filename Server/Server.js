const express = require('express');
const app = express();
const PORT = 3000;

// Middleware para procesar JSON
app.use(express.json());

// Simulador de taxis disponibles
let taxisDisponibles = [
    { id: 1, x: 2, y: 3 },
    { id: 2, x: 5, y: 7 },
    { id: 3, x: 8, y: 1 },
];

// Ruta para recibir solicitud de taxi del usuario
app.post('/solicitar-taxi', (req, res) => {
    const { userId, userX, userY } = req.body;

    console.log(`Usuario ${userId} solicitó un taxi desde (${userX}, ${userY})`);

    // Simulación de asignación de taxi más cercano
    let taxiAsignado = null;
    let menorDistancia = Infinity;

    taxisDisponibles.forEach(taxi => {
        const distancia = Math.abs(taxi.x - userX) + Math.abs(taxi.y - userY);
        if (distancia < menorDistancia) {
            menorDistancia = distancia;
            taxiAsignado = taxi;
        }
    });

    // Si encuentra un taxi disponible
    if (taxiAsignado) {
        res.json({
            success: true,
            message: `Taxi asignado: ${taxiAsignado.id}`,
            taxiId: taxiAsignado.id,
            distancia: menorDistancia
        });
    } else {
        res.json({
            success: false,
            message: "No hay taxis disponibles"
        });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
