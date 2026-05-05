// Using global fetch

async function triggerScraper() {
  const functionUrl = 'https://us-central1-imala-vox.cloudfunctions.net/procesarScrapingWeb';
  const payload = {
    wsId: 'flDZE5EJvvzgV8CgDWTa',
    recursoId: 'WYnNWxwDhdE4abKqbnAJ',
    url: 'https://www.imalavox.com/',
    secret: 'imala_vox_internal_key'
  };

  console.log(`Llamando a la función: ${functionUrl}`);
  try {
    const resp = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`Status: ${resp.status}`);
    const data = await resp.json();
    console.log('Respuesta:', data);
  } catch (err) {
    console.error('Error al llamar:', err);
  }
}

triggerScraper();
