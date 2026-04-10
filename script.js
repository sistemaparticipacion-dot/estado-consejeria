const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datosConsejeros = [];
let consejeroEncontrado = null;

// Función avanzada para separar CSV respetando comas dentro de comillas
function parseCSV(text) {
    const rows = text.split(/\r?\n/);
    return rows.map(row => {
        const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!matches) return [];
        return matches.map(val => val.replace(/^"|"$/g, "").trim());
    });
}

async function cargarDatos() {
    try {
        const respuesta = await fetch(SHEET_CSV_URL);
        const textoOriginal = await respuesta.text();
        
        const filas = parseCSV(textoOriginal);
        if (filas.length === 0) return;

        const cabeceras = filas[0];

        datosConsejeros = filas.slice(1).map(fila => {
            let obj = {};
            cabeceras.forEach((cabecera, i) => {
                obj[cabecera] = fila[i] || "";
            });
            return obj;
        });
        console.log("Base de datos cargada correctamente.");
    } catch (error) {
        console.error("Error al cargar datos:", error);
    }
}

cargarDatos();

async function consultar() {
    const documentoInput = document.getElementById("documento").value.trim();
    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    if (!documentoInput) {
        alert("Por favor ingrese un número de documento.");
        return;
    }

    // Buscamos el documento exactamente
    consejeroEncontrado = datosConsejeros.find(c => String(c["No. Documento"]) === documentoInput);

    if (consejeroEncontrado) {
        resBox.style.display = "block";
        const nombre = consejeroEncontrado["Nombre completo"] || consejeroEncontrado["Nombre"];
        const estado = (consejeroEncontrado["Estado"] || "").toLowerCase();

        if (estado.includes("activo")) {
            resBox.className = "resultado activo";
            resBox.innerHTML = `✅ <strong>${nombre}</strong><br>Estado: ACTIVO<br><small>${consejeroEncontrado["Consejo"]}</small>`;
            btnPdf.style.display = "block";
        } else {
            resBox.className = "resultado error";
            resBox.innerHTML = `⚠️ <strong>${nombre}</strong><br>Estado: INACTIVO<br><small>Trámite en curso según Decreto 480.</small>`;
            btnPdf.style.display = "none";
        }
    } else {
        resBox.className = "resultado error";
        resBox.innerHTML = "❌ Documento no encontrado en la base de datos oficial.";
        resBox.style.display = "block";
        btnPdf.style.display = "none";
    }
}

function generarCertificado() {
    if (!consejeroEncontrado) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("CERTIFICADO DE CONSEJERÍA", 105, 40, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Nombre: ${consejeroEncontrado["Nombre completo"] || consejeroEncontrado["Nombre"]}`, 20, 60);
    doc.text(`Documento: ${consejeroEncontrado["No. Documento"]}`, 20, 70);
    doc.text(`Consejo: ${consejeroEncontrado["Consejo"]}`, 20, 80);
    doc.save(`Certificado_${consejeroEncontrado["No. Documento"]}.pdf`);
}
