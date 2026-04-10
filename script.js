const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datosConsejeros = [];
let consejeroEncontrado = null;
let plantillaBase64 = null;

// 1. Cargar datos y plantilla al iniciar
async function inicializar() {
    try {
        const respuesta = await fetch(SHEET_CSV_URL + '&t=' + Date.now());
        const textoOriginal = await respuesta.text();
        
        // Analizar CSV respetando nombres completos (manejo de filas y columnas)
        const filas = textoOriginal.split(/\r?\n/).filter(f => f.trim() !== "");
        const cabeceras = filas[0].split(',').map(h => h.trim());

        datosConsejeros = filas.slice(1).map(fila => {
            // Regex para separar por comas pero ignorar comas dentro de celdas si las hubiera
            const valores = fila.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || fila.split(',');
            let obj = {};
            cabeceras.forEach((header, i) => {
                obj[header] = valores[i] ? valores[i].replace(/"/g, '').trim() : "";
            });
            return obj;
        });

        plantillaBase64 = await getBase64ImageFromUrl('plantilla.png');
        console.log("Sistema y Plantilla listos.");
    } catch (error) {
        console.error("Error en la carga inicial:", error);
    }
}

function getBase64ImageFromUrl(imageUrl) {
    return new Promise((resolve, reject) => {
        let img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imageUrl;
        img.onload = () => {
            let canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
    });
}

// Ejecutar inicialización
inicializar();

// 2. Función para buscar en la base de datos
async function consultar() {
    const inputDoc = document.getElementById("documento").value.trim();
    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    if (!inputDoc) {
        alert("Por favor ingresa un número de documento");
        return;
    }

    // Buscar coincidencia exacta por número de documento
    consejeroEncontrado = datosConsejeros.find(c => String(c["No. Documento"]) === inputDoc);

    if (consejeroEncontrado) {
        resBox.style.display = "block";
        resBox.className = "resultado activo";
        const nombreDisplay = (consejeroEncontrado["Nombre completo"] || "CONSEJERO/A").toUpperCase();
        resBox.innerHTML = `✅ <strong>${nombreDisplay}</strong><br>Estado: ACTIVO`;
        btnPdf.style.display = "block";
    } else {
        resBox.style.display = "block";
        resBox.className = "resultado error";
        resBox.innerHTML = "❌ Documento no encontrado en la base de datos oficial.";
        btnPdf.style.display = "none";
    }
}

// 3. Generar el PDF sobre la plantilla
function generarCertificado() {
    if (!consejeroEncontrado || !plantillaBase64) {
        alert("Error: La plantilla no ha cargado o no se ha encontrado el consejero.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Configuración de márgenes para que el texto no se corte (25mm a cada lado)
    const margin = 25;
    const textWidth = pageWidth - (margin * 2);

    // Fondo: Plantilla institucional
    doc.addImage(plantillaBase64, 'PNG', 0, 0, 210, 297);

    doc.setTextColor(0, 0, 0);
    
    // --- Texto 1: Cargo del Director ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const cargo = "EL SUSCRITO DIRECTOR DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE";
    doc.text(doc.splitTextToSize(cargo, textWidth), margin, 65);

    // --- Texto 2: Hace Constar ---
    doc.setFontSize(11);
    doc.text("HACE CONSTAR QUE:", pageWidth / 2, 88, { align: "center" });

    // --- Texto 3: Párrafo Principal ---
    doc.setFont("helvetica", "normal");
    const nombre = (consejeroEncontrado["Nombre completo"] || "").toUpperCase();
    const cedula = consejeroEncontrado["No. Documento"] || "";
    const sector = consejeroEncontrado["Sector"] || "";
    const consejo = consejeroEncontrado["Consejo"] || "";
    const resolucion = consejeroEncontrado["Acto de Reconocimiento"] || "Resolución No. 551 del 28 de julio de 2023";

    const parrafo1 = `${nombre}, identificado(a) con cédula de ciudadanía número ${cedula}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según ${resolucion}.`;
    
    // El truco para que no se corte es splitTextToSize + align: justify
    const lineasP1 = doc.splitTextToSize(parrafo1, textWidth);
    doc.text(lineasP1, margin, 105, { align: "justify" });

    // --- Texto 4: Párrafo de Estado ---
    const parrafo2 = "A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 17 del Decreto Distrital 336 de 2022.";
    const lineasP2 = doc.splitTextToSize(parrafo2, textWidth);
    doc.text(lineasP2, margin, 142, { align: "justify" });

    // --- Texto 5: Fecha ---
    const hoy = new Date();
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const fechaTexto = `La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;
    doc.text(doc.splitTextToSize(fechaTexto, textWidth), margin, 165);

    // --- Texto 6: Firma ---
    doc.setFont("helvetica", "bold");
    doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", margin, 205);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Director de Asuntos Locales y Participación", margin, 211);
    doc.text("Secretaría de Cultura, Recreación y Deporte", margin, 216);

    // Descargar
    doc.save(`Certificado_${cedula}.pdf`);
}
