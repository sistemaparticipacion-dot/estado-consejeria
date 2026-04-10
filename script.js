// Enlace a tu Google Sheets en formato CSV
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datosConsejeros = [];
let consejeroEncontrado = null;

// Función para cargar los datos al iniciar la página
async function cargarDatos() {
    try {
        const respuesta = await fetch(SHEET_CSV_URL);
        const texto = await respuesta.text();
        
        // Procesar CSV (divide por líneas y luego por comas)
        const filas = texto.split('\n').map(fila => fila.split(','));
        const cabeceras = filas[0].map(h => h.trim());

        datosConsejeros = filas.slice(1).map(fila => {
            let obj = {};
            cabeceras.forEach((cabecera, i) => {
                obj[cabecera] = fila[i] ? fila[i].trim() : "";
            });
            return obj;
        });
        console.log("Base de datos de Google Sheets cargada con éxito.");
    } catch (error) {
        console.error("Error cargando la base de datos:", error);
    }
}

// Cargar datos apenas abra la web
cargarDatos();

async function consultar() {
    const documentoInput = document.getElementById("documento").value.trim();
    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    if (!documentoInput) {
        alert("Por favor ingrese un número de documento.");
        return;
    }

    // Buscar en la lista (ajustado al nombre de columna de tu Excel)
    // El campo debe llamarse "No. Documento" en tu Google Sheets
    consejeroEncontrado = datosConsejeros.find(c => c["No. Documento"] === documentoInput);

    if (consejeroEncontrado) {
        resBox.style.display = "block";
        const nombre = consejeroEncontrado["Nombre completo"] || consejeroEncontrado["Nombre"];
        const estado = (consejeroEncontrado["Estado"] || "Inactivo").toLowerCase();

        if (estado === "activo") {
            resBox.className = "resultado activo";
            resBox.innerHTML = `✅ <strong>${nombre}</strong><br>Estado: ACTIVO<br><small>${consejeroEncontrado["Consejo"]}</small>`;
            btnPdf.style.display = "block";
            reproducirSonido("activo");
        } else {
            resBox.className = "resultado error";
            resBox.innerHTML = `⚠️ <strong>${nombre}</strong><br>Estado: INACTIVO<br><small>Por favor contacte a la Secretaría de Cultura.</small>`;
            btnPdf.style.display = "none";
            reproducirSonido("inactivo");
        }
    } else {
        resBox.className = "resultado error";
        resBox.innerHTML = "❌ Documento no encontrado en la base de datos oficial.";
        resBox.style.display = "block";
        btnPdf.style.display = "none";
        reproducirSonido("error");
    }
}

function reproducirSonido(tipo) {
    const audio = new Audio(`sonido_${tipo}.mp3`);
    audio.play().catch(() => console.log("El navegador bloqueó el audio automático."));
}

function generarCertificado() {
    if (!consejeroEncontrado) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configuración visual del PDF
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("CERTIFICADO DE CONSEJERÍA ACTIVA", 105, 40, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("El Sistema Distrital de Arte, Cultura y Patrimonio certifica que:", 20, 60);
    
    doc.setFont("helvetica", "bold");
    doc.text(`${consejeroEncontrado["Nombre completo"] || consejeroEncontrado["Nombre"]}`, 20, 75);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Identificado(a) con No. Documento: ${consejeroEncontrado["No. Documento"]}`, 20, 85);
    doc.text(`Consejo: ${consejeroEncontrado["Consejo"]}`, 20, 95);
    doc.text(`Sector: ${consejeroEncontrado["Sector"]}`, 20, 105);
    
    const hoy = new Date();
    doc.text(`Fecha de expedición: ${hoy.toLocaleDateString()}`, 20, 130);
    
    doc.save(`Certificado_SDACP_${consejeroEncontrado["No. Documento"]}.pdf`);
}
