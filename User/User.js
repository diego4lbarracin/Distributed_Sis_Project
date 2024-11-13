class Usuario{
    constructor(userID, x, y, wait){
        this.userID = userID;
        this.x = x;
        this.y = y;
        this.wait = wait;
        this.esperarSolicitud();
    }
    async solicitarTaxi(){
        try{
            const response = await fetch("http://localhost:3000/solicitar-taxi", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ userId: this.userID, userX: this.x, userY: this.y })
            });
            const data = await response.json();
            this.manejarRespuesta(data);
        }
        catch(error){
            console.error("Error al solicitar el taxi", error);
        }
    }
    async esperarSolicitud(){
        console.log(`Usuario ${this.userID} esperando ${this.wait} segundos antes de solicitar un taxi.`);
        await new Promise(resolve => setTimeout(resolve, this.wait * 1000));
        this.solicitarTaxi();
    }
    manejarRespuesta(data){
        if(data.success){
            console.log(`Usuario ${this.userID} ha recibido el taxi con ID ${data.taxiId}. Distancia: ${data.distancia} km.`);
        } else{
            console.log(`Usuario ${this.userID} no pudo recibir un taxi: ${data.message}`);
        }
    }
}

const args = process.argv.slice(2);
const userID = parseInt(args[0], 10);
const x = parseInt(args[1], 10);
const y = parseInt(args[2], 10);
const tiempoEspera = parseInt(args[3], 10);

const usuario = new Usuario(userID, x, y, tiempoEspera);