const fs = require('fs');
const {Worker} = require ('worker_threads');
const path = require('path');

function crearUsuario(userId, x, y, tiempoEspera) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.resolve(__dirname, 'usuarioHiloWorker.js'), {
            workerData: { userId, x, y, tiempoEspera }
        });
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}
async function generarUsuarios(archivoCoordenadas, numUsuarios, waitMax){
    try{
        const data = fs.readFileSync(archivoCoordenadas, 'utf8');
        const lineas = data.trim().split('\n');
        const usuarios = [];
        for(let i = 0; i<numUsuarios && i<lineas.length; i++){
            const [x, y] = lineas[i].split(',').map(Number);
            const tiempoEspera = Math.floor(Math.random()* waitMax) + 1;
            usuarios.push(crearUsuario(i+1, x, y, tiempoEspera));
            await sleep(100);
        }
        await Promise.all(usuarios);
        console.log('Todos los usuarios han completado su solicitud de Taxi. ');
    } catch(error){
        console.log('Error al leer el archivo o crear usuarios: ', error);
    }
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const numUsuarios = parseInt(process.argv[2], 10) || 5;
const tiempoEsperaMax = parseInt(process.argv[3], 10) || 10;
const colMat = parseInt(process.argv[4], 10) || 10;
const filMat = parseInt(process.argv[5], 10) || 10;
const archivoCoordenadas = `./${process.argv[6]}`;
generarUsuarios(archivoCoordenadas, numUsuarios, tiempoEsperaMax);