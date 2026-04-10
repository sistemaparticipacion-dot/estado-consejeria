const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datosConsejeros = [];
let consejeroEncontrado = null;

async function cargarDatos() {
    try {
        // Añadimos un timestamp para evitar que el navegador guarde una versión vieja
        const respuesta = await fetch(SHEET_CSV_URL + '&t=' + Date.now());
        const textoOriginal = await respuesta.text();
        
        // Dividir por filas y limpiar espacios raros
        const filas = textoOriginal.split(/\r?\n/).filter(f => f.trim() !== "");
        if (filas.length < 2) return;

        const cabeceras = filas[0].split(',').map(h => h.replace(/"/g, '').trim());

        datosConsejeros = filas.slice(1).map(fila => {
            // Regex para separar por comas pero ignorar comas dentro de comillas
            const valores = fila.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            let obj = {};
            cabeceras.forEach((header, i) => {
                let val = valores[i] ? valores[i].replace(/"/g, '').trim() : "";
                obj[header] = val;
            });
            return obj;
        });
        console.log("Base de datos cargada. Registros:", datosConsejeros.length);
    } catch (error) {
        console.error("Error al cargar datos:", error);
    }
}

cargarDatos();

async function consultar() {
    const inputDoc = document.getElementById("documento").value.trim();
    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    resBox.style.display = "none";
    btnPdf.style.display = "none";

    if (!inputDoc) {
        alert("Escribe un número de documento.");
        return;
    }

    // BÚSQUEDA TODOTERRENO: 
    // Buscamos el documento comparando contra TODAS las propiedades de la fila
    // por si Google Sheets cambió el nombre de la columna "No. Documento"
    consejeroEncontrado = datosConsejeros.find(c => {
        return Object.values(c).some(valor => String(valor).trim() === inputDoc);
    });

    if (consejeroEncontrado) {
        resBox.style.display = "block";
        
        // Buscamos el nombre y estado de forma flexible
        const nombre = consejeroEncontrado["Nombre completo"] || consejeroEncontrado["Nombre"] || "Consejero/a";
        const consejo = consejeroEncontrado["Consejo"] || "Consejo Distrital";
        const estado = (consejeroEncontrado["Estado"] || "").toLowerCase();

        if (estado.includes("activo")) {
            resBox.className = "resultado activo";
            resBox.innerHTML = `✅ <strong>${nombre}</strong><br>Estado: <strong>ACTIVO</strong><br><small>${consejo}</small>`;
            btnPdf.style.display = "block";
            reproducirSonido("activo");
        } else {
            resBox.className = "resultado error";
            resBox.innerHTML = `⚠️ <strong>${nombre}</strong><br>Estado: <strong>INACTIVO</strong><br><small>Trámite en curso según Decreto 480.</small>`;
            reproducirSonido("inactivo");
        }
    } else {
        resBox.className = "resultado error";
        resBox.innerHTML = "❌ Documento no encontrado en la base de datos oficial.";
        resBox.style.display = "block";
        reproducirSonido("error");
    }
}

function reproducirSonido(tipo) {
    const audio = new Audio(`sonido_${tipo}.mp3`);
    audio.play().catch(() => {});
}

function generarCertificado() {
    if (!consejeroEncontrado) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const nombre = consejeroEncontrado["Nombre completo"] || consejeroEncontrado["Nombre"] || "Consejero/a";
    const documento = consejeroEncontrado["No. Documento"] || document.getElementById("documento").value;

    doc.setFont("helvetica", "bold");
    doc.text("CERTIFICADO DE CONSEJERÍA", 105, 40, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${nombre}`, 20, 60);
    doc.text(`Documento: ${documento}`, 20, 70);
    doc.text(`Consejo: ${consejeroEncontrado["Consejo"] || "N/A"}`, 20, 80);
    doc.text(`Expedido el: ${new Date().toLocaleDateString()}`, 20, 100);
    
    doc.save(`Certificado_${documento}.pdf`);
}
