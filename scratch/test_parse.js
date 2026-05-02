async function testParse() {
  const url = 'http://localhost:3000/api/parse-objects';
  const data = {
    rawText: "Producto: Zapatillas Nike, Precio: 50000 ARS, Descripcion: Zapatillas de running",
    sourceUrl: "https://test.com",
    wsId: "XoOuVNi5pvfqkYFIGWdB",
    recursoId: "7uA1uhu84L8fsP5EDR7U"
  };

  try {
    console.log("Calling api/parse-objects...");
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    console.log("Status:", response.status);
    const result = await response.json();
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error calling endpoint:", err.message);
  }
}

testParse();
