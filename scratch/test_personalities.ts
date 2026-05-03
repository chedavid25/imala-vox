import { PERSONALIDADES } from "./src/lib/constants/personalidades";

async function testPersonality() {
    console.log("--- TEST DE PERSONALIDADES ---");
    PERSONALIDADES.forEach(p => {
        console.log(`ID: ${p.id} | Nombre: ${p.nombre} | Prompt: ${p.prompt.slice(0, 50)}...`);
    });
}

testPersonality();
