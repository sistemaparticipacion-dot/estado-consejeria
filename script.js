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
    
    // REDUCIMOS EL ANCHO ÚTIL: Dejamos 30mm de margen a cada lado para evitar cortes
    const margin = 30; 
    const textWidth = pageWidth - (margin * 2); // Esto da aprox 150mm de ancho real

    // 1. Fondo de la Plantilla
    doc.addImage(plantillaBase64, 'PNG', 0, 0, 210, 297);

    // 2. Configuración de Texto General
    doc.setTextColor(0, 0, 0);
    
    // --- Título del Director ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const cargo = "EL SUSCRITO DIRECTOR DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE";
    // Usamos un ancho ligeramente menor para el título para que no toque los bordes
    doc.text(doc.splitTextToSize(cargo, textWidth), margin, 65);

    // --- Hace Constar ---
    doc.setFontSize(11);
    doc.text("HACE CONSTAR QUE:", pageWidth / 2, 88, { align: "center" });

    // --- Párrafo Principal (EL QUE SE CORTABA) ---
    // Bajamos a 10.5pt para que la justificación sea más fluida
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5); 
    
    const nombre = (consejeroEncontrado["Nombre completo"] || "").toUpperCase();
    const cedula = consejeroEncontrado["No. Documento"] || "";
    const sector = consejeroEncontrado["Sector"] || "";
    const consejo = consejeroEncontrado["Consejo"] || "";
    const resolucion = consejeroEncontrado["Acto de Reconocimiento"] || "Resolución No. 551 del 28 de julio de 2023";

    const parrafo1 = `${nombre}, identificado(a) con cédula de ciudadanía número ${cedula}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según ${resolucion}.`;
    
    // Dividimos el texto con el nuevo ancho de seguridad
    const lineasP1 = doc.splitTextToSize(parrafo1, textWidth);
    doc.text(lineasP1, margin, 105, { align: "justify", maxWidth: textWidth });

    // --- Párrafo de Estado ---
    const parrafo2 = "A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 17 del Decreto Distrital 336 de 2022.";
    const lineasP2 = doc.splitTextToSize(parrafo2, textWidth);
    doc.text(lineasP2, margin, 142, { align: "justify", maxWidth: textWidth });

    // --- Fecha ---
    doc.setFontSize(10.5);
    const hoy = new Date();
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const fechaTexto = `La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;
    doc.text(doc.splitTextToSize(fechaTexto, textWidth), margin, 165);

    // --- Firma ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", margin, 205);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Director de Asuntos Locales y Participación", margin, 211);
    doc.text("Secretaría de Cultura, Recreación y Deporte", margin, 216);

    // Guardar
    doc.save(`Certificado_${cedula}.pdf`);
}
