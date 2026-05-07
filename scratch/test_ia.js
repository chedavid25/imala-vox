
const { procesarMensajeConIA } = require('./src/lib/ai/engine');
const { adminDb } = require('./src/lib/firebase-admin');

async function testIA() {
  try {
    const wsId = 'test-workspace'; // Replace with a real one if known
    const agenteId = 'test-agente'; 
    const conversacionId = 'test-conv';
    
    console.log("Testing IA Engine...");
    // This will probably fail because of missing IDs, but it will tell us if the imports work
  } catch (err) {
    console.error(err);
  }
}

testIA();
