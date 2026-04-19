
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        env[match[1]] = value;
    }
});

// Configurar Firebase Admin
if (!admin.apps.length) {
    const serviceAccountBase64 = env.FIREBASE_SERVICE_ACCOUNT_KEY_B64;
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString());
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkMetaSubscription() {
    console.log("🔍 Iniciando diagnóstico de suscripción Meta...");
    
    const wsSnap = await db.collection('espaciosDeTrabajo').get();
    
    for (const wsDoc of wsSnap.docs) {
        const canalesSnap = await db.collection('espaciosDeTrabajo').doc(wsDoc.id).collection('canales').get();
        
        for (const canalDoc of canalesSnap.docs) {
            const canal = canalDoc.data();
            if (canal.tipo === 'facebook' || canal.tipo === 'instagram') {
                const metaPageId = canal.metaPageId;
                if (!metaPageId) continue;

                const secretSnap = await db.doc(`espaciosDeTrabajo/${wsDoc.id}/canales/${canalDoc.id}/secrets/config`).get();
                if (!secretSnap.exists) continue;
                const { metaAccessToken } = secretSnap.data();

                console.log(`\nChecking Channel: ${canal.nombre} | Page ID: ${metaPageId}`);
                try {
                    const res = await fetch(`https://graph.facebook.com/v19.0/${metaPageId}/subscribed_apps?access_token=${metaAccessToken}`);
                    const data = await res.json();
                    
                    if (data.data) {
                        console.log(`  Subscribed Apps:`, JSON.stringify(data.data, null, 2));
                        const app = data.data.find(a => a.id === '966716519072300');
                        if (app) {
                            console.log(`  🎉 OK: La App está suscrita. Campos: ${app.subscribed_fields.join(', ')}`);
                        } else {
                            console.log(`  ❌ FAIL: La App NO está suscrita a esta página.`);
                        }
                    } else {
                        console.log(`  ❌ Error de Meta:`, data.error?.message);
                    }
                } catch (e) {
                    console.log(`  ❌ Error:`, e.message);
                }
            }
        }
    }
}

checkMetaSubscription().then(() => process.exit(0));
