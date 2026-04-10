const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datosConsejeros = [];
let consejeroEncontrado = null;

// Función para cargar y limpiar los datos de Google Sheets
async function cargarDatos() {
    try {
        const respuesta = await fetch(SHEET_CSV_URL + '&cache=none' + Date.now());
        const textoOriginal = await respuesta.text();
        
        // Dividir por filas
        const filas = textoOriginal.split(/\r?\n/);
        if (filas.length < 2) return;

        // Limpiar encabezados
        const cabeceras = filas[0].split(',').map(h => h.replace(/"/g, '').trim());

        // Procesar cada fila de forma segura
        datosConsejeros = filas.slice(1).map(fila => {
            // Esta expresión regular separa por comas pero respeta las comas dentro de comillas
            const valores = fila.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            let obj = {};
            cabeceras.forEach((header, i) => {
                let val = valores[i] ? valores[i].replace(/"/g, '').trim() : "";
                obj[header] = val;
            });
            return obj;
        });
        console.log("Base de datos sincronizada con Google Sheets.");
    } catch (error) {
        console.error("Error crítico de carga:", error);
    }
}

// Cargar al abrir la web
cargarDatos();

async function consultar() {
    const inputDoc = document.getElementById("documento").value.trim();
    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    // Limpieza visual
    resBox.style.display = "none";
    btnPdf.style.display = "none";

    if (!inputDoc) {
        alert("Escribe un número de documento.");
        return;
    }

    // BUSCADOR ROBUSTO: Busca en la columna "No. Documento"
    consejeroEncontrado = datosConsejeros.find(c => {
        const docEnTabla = String(c["No. Documento"] || "").replace(/\D/g, ""); // Solo números
        const docBuscado = inputDoc.replace(/\D/g, "");
        return docEnTabla === docBuscado;
    });

    if (consejeroEncontrado) {
        resBox.style.display = "block";
        const nombre = consejeroEncontrado["Nombre completo"] || "Consejero/a";
        const estado = (consejeroEncontrado["Estado"] || "").toLowerCase();

        if (estado.includes("activo")) {
            resBox.className = "resultado activo";
            resBox.innerHTML = `✅ <strong>${nombre}</strong><br>Estado: <strong>ACTIVO</strong><br><small>${consejeroEncontrado["Consejo"] || ""}</small>`;
            btnPdf.style.display = "block";
            reproducirSonido("activo");
        } else {
            resBox.className = "resultado error";
            resBox.innerHTML = `⚠️ <strong>${nombre}</strong><br>Estado: <strong>INACTIVO</strong><br><small>Trámite en curso según Decreto 480.</small>`;
            reproducirSonido("inactivo");
        }
    } else {
        resBox.className = "resultado error";
        resBox.innerHTML = "❌ El documento no se encuentra en la base de datos.<br><small>Verifica el número o contacta a la Secretaría.</small>";
        resBox.style.display = "block";
        reproducirSonido("error");
    }
}

function reproducirSonido(tipo) {
    new Audio(`sonido_${tipo}.mp3`).play().catch(() => {});
}

function generarCertificado() {
    if (!consejeroEncontrado) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.text("CERTIFICADO DE CONSEJERÍA", 105, 40, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${consejeroEncontrado["Nombre completo"]}`, 20, 60);
    doc.text(`Cédula: ${consejeroEncontrado["No. Documento"]}`, 20, 70);
    doc.text(`Consejo: ${consejeroEncontrado["Consejo"]}`, 20, 80);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 100);
    
    doc.save(`Certificado_${consejeroEncontrado["No. Documento"]}.pdf`);
}
