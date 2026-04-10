const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datosConsejeros = [];

// Función para cargar los datos desde Google Sheets al abrir la página
async function cargarDatos() {
    try {
        const respuesta = await fetch(SHEET_CSV_URL);
        const texto = await respuesta.text();
        
        // Convertimos el CSV a un formato que el buscador entienda
        const filas = texto.split('\n').slice(1); // Quitamos la fila de títulos
        datosConsejeros = filas.map(fila => {
            const columnas = fila.split(',');
            return {
                nombre: columnas[0]?.trim(),
                documento: columnas[1]?.trim(),
                consejo: columnas[2]?.trim(),
                sector: columnas[3]?.trim(),
                estado: columnas[4]?.trim()
            };
        });
        console.log("Base de datos cargada desde Google Sheets");
    } catch (error) {
        console.error("Error cargando Google Sheets:", error);
    }
}

// Llamamos a la función al cargar la página
cargarDatos();

async function consultar() {
    const inputDoc = document.getElementById("documento").value.trim();
    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    if (!inputDoc) return;

    // Buscamos en los datos cargados de la hoja
    const consejero = datosConsejeros.find(c => c.documento === inputDoc);

    if (consejero) {
        window.datosConsejeroActual = consejero; // Guardar para el PDF
        const esActivo = consejero.estado.toLowerCase().includes("activo");

        if (esActivo) {
            resBox.className = "resultado activo";
            resBox.innerHTML = `✅ <strong>${consejero.nombre}</strong><br>Estado: ACTIVO<br><small>${consejero.consejo}</small>`;
            btnPdf.style.display = "block";
        } else {
            resBox.className = "resultado error";
            resBox.innerHTML = `⚠️ <strong>${consejero.nombre}</strong><br>Estado: INACTIVO`;
            btnPdf.style.display = "none";
        }
        resBox.style.display = "block";
    } else {
        resBox.className = "resultado error";
        resBox.innerHTML = "❌ Documento no encontrado.";
        resBox.style.display = "block";
        btnPdf.style.display = "none";
    }
}
