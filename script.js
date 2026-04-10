const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datosConsejeros = [];
let consejeroEncontrado = null;
let plantillaBase64 = null;

// Cargar datos y plantilla
async function inicializar() {
    try {
        const respuesta = await fetch(SHEET_CSV_URL + '&t=' + Date.now());
        const textoOriginal = await respuesta.text();
        
        // Separar por filas y luego por comas de forma simple
        const filas = textoOriginal.split(/\r?\n/).filter(f => f.trim() !== "");
        const cabeceras = filas[0].split(',').map(h => h.trim());

        datosConsejeros = filas.slice(1).map(fila => {
            const valores = fila.split(',');
            let obj = {};
            cabeceras.forEach((header, i) => {
                obj[header] = valores[i] ? valores[i].trim() : "";
            });
            return obj;
        });

        plantillaBase64 = await getBase64ImageFromUrl('plantilla.png');
        console.log("Sistema listo.");
    } catch (error) {
        console.error("Error iniciando:", error);
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

inicializar();

async function consultar() {
    const inputDoc = document.getElementById("documento").value.trim();
    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    if (!inputDoc) return;

    // Buscar coincidencia exacta en el documento 
    consejeroEncontrado = datosConsejeros.find(c => String(c["No. Documento"]) === inputDoc);

    if (consejeroEncontrado) {
        resBox.style.display = "block";
        resBox.className = "resultado activo";
        const nombre = (consejeroEncontrado["Nombre completo"] || "CONSEJERO/A").toUpperCase();
        resBox.innerHTML = `✅ <strong>${nombre}</strong><br>Estado: ACTIVO`;
        btnPdf.style.display = "block";
    } else {
        resBox.style.display = "block";
        resBox.className = "resultado error";
        resBox.innerHTML = "❌ Documento no encontrado.";
        btnPdf.style.display = "none";
    }
}

// Variable para almacenar la plantilla en Base64
let plantillaBase64 = null;

// Modificar la función inicializar para cargar también la plantilla
async function inicializar() {
    await cargarDatos();
    try {
        // Asegúrate de que el nombre del archivo coincida: plantilla.png
        plantillaBase64 = await getBase64ImageFromUrl('plantilla.png');
        console.log("Plantilla institucional cargada.");
    } catch (error) {
        console.error("Error cargando la plantilla.png:", error);
        //alert("No se pudo cargar la plantilla del certificado. Por favor, verifica que 'plantilla.png' exista.");
    }
}

// Asegúrate de llamar a inicializar() en lugar de solo cargarDatos() al inicio
inicializar();

function generarCertificado() {
    // Verificar que se haya encontrado un consejero y que la plantilla esté cargada
    if (!consejeroEncontrado) {
        alert("Primero debes consultar un documento válido.");
        return;
    }
    if (!plantillaBase64) {
        alert("La plantilla del certificado aún no se ha cargado. Por favor, espera un momento o recarga la página.");
        return;
    }

    const { jsPDF } = window.jspdf;
    // Crear documento A4 en orientación vertical (portrait)
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Obtener dimensiones de la página
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- 1. AGREGAR PLANTILLA DE FONDO ---
    // Usamos las dimensiones de la página para que cubra todo el fondo
    doc.addImage(plantillaBase64, 'PNG', 0, 0, pageWidth, pageHeight);

    // --- 2. CONFIGURAR ESTILOS DE TEXTO ---
    doc.setTextColor(0, 0, 0); // Texto negro
    const margin = 25; // Margen izquierdo y derecho para el texto
    const textWidth = pageWidth - (margin * 2);

    // --- 3. AGREGAR TEXTO DINÁMICO ---
    // (Las coordenadas Y son aproximadas y pueden requerir ajustes según tu plantilla.png)

    // Título del Director
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const cargo = "EL SUSCRITO DIRECTOR DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE";
    const lineasCargo = doc.splitTextToSize(cargo, textWidth);
    doc.text(lineasCargo, margin, 60); // Y=60

    // Hace constar
    doc.setFontSize(11);
    doc.text("HACE CONSTAR QUE:", pageWidth / 2, 85, { align: "center" }); // Y=85

    // Párrafo principal (dinámico)
    doc.setFont("helvetica", "normal");
    
    // Obtener datos del consejero con nombres de columna correctos de tu Sheets
    const nombre = (consejeroEncontrado["Nombre completo"] || "CONSEJERO/A").toUpperCase();
    const cedula = consejeroEncontrado["No. Documento"] || document.getElementById("documento").value;
    const consejo = consejeroEncontrado["Consejo"] || "N/A";
    const sector = consejeroEncontrado["Sector"] || "N/A";
    const resolucion = consejeroEncontrado["Acto de Reconocimiento"] || "Resolución No. 551 del 28 de julio de 2023";

    // Construir el párrafo
    const parrafo1 = `${nombre}, identificado(a) con cédula de ciudadanía número ${cedula}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según ${resolucion}.`;
    
    // Dividir texto para que se ajuste al ancho
    const lineasP1 = doc.splitTextToSize(parrafo1, textWidth);
    // Dibujar texto justificado
    doc.text(lineasP1, margin, 100, { align: "justify" }); // Y=100

    // Párrafo de estado activo
    const parrafo2 = "A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 17 del Decreto Distrital 336 de 2022.";
    const lineasP2 = doc.splitTextToSize(parrafo2, textWidth);
    doc.text(lineasP2, margin, 135, { align: "justify" }); // Y=135

    // Fecha de expedición
    const hoy = new Date();
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const fechaTexto = `La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;
    const lineasFecha = doc.splitTextToSize(fechaTexto, textWidth);
    doc.text(lineasFecha, margin, 160); // Y=160

    // Bloque de Firma
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", margin, 195); // Y=195
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Director de Asuntos Locales y Participación", margin, 201); // Y=201
    doc.text("Secretaría de Cultura, Recreación y Deporte", margin, 206); // Y=206

    // Nota al pie (opcional, si no está en la plantilla)
    doc.setFontSize(7);
    doc.setTextColor(120); // Gris
    const nota = "Nota: Este certificado ha sido generado automáticamente desde el portal web Radar Cultural. Puede verificar la autenticidad del mismo a través del correo sistemaparticipacion@scrd.gov.co";
    const lineasNota = doc.splitTextToSize(nota, textWidth);
    doc.text(lineasNota, margin, 230); // Y=230

    // --- 4. GUARDAR / DESCARGAR PDF ---
    // Usar el número de documento en el nombre del archivo
    doc.save(`Certificado_Consejero_${cedula}.pdf`);
}
