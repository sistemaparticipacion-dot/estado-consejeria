const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datosConsejeros = [];
let consejeroEncontrado = null;
let plantillaBase64 = null;

// 1. Cargar la base de datos y la imagen de la plantilla al inicio
async function inicializar() {
    await cargarDatos();
    try {
        plantillaBase64 = await getBase64ImageFromUrl('plantilla.png');
        console.log("Plantilla cargada correctamente");
    } catch (e) {
        console.error("No se pudo cargar la imagen plantilla.png. Revisa que el nombre sea exacto.");
    }
}

async function cargarDatos() {
    try {
        const respuesta = await fetch(SHEET_CSV_URL + '&t=' + Date.now());
        const textoOriginal = await respuesta.text();
        const filas = textoOriginal.split(/\r?\n/).filter(f => f.trim() !== "");
        const cabeceras = filas[0].split(',').map(h => h.replace(/"/g, '').trim());

        datosConsejeros = filas.slice(1).map(fila => {
            const valores = fila.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            let obj = {};
            cabeceras.forEach((header, i) => {
                obj[header] = valores[i] ? valores[i].replace(/"/g, '').trim() : "";
            });
            return obj;
        });
    } catch (error) { console.error("Error cargando datos:", error); }
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

// 2. Función de consulta (Buscador)
async function consultar() {
    const inputDoc = document.getElementById("documento").value.trim();
    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    resBox.style.display = "none";
    btnPdf.style.display = "none";

    if (!inputDoc) return;

    consejeroEncontrado = datosConsejeros.find(c => {
        return Object.values(c).some(valor => String(valor).trim() === inputDoc);
    });

    if (consejeroEncontrado) {
        resBox.style.display = "block";
        const nombre = (consejeroEncontrado["Nombre completo"] || "CONSEJERO/A").toUpperCase();
        const estado = (consejeroEncontrado["Estado"] || "").toLowerCase();

        if (estado.includes("activo")) {
            resBox.className = "resultado activo";
            resBox.innerHTML = `✅ <strong>${nombre}</strong><br>Estado: ACTIVO`;
            btnPdf.style.display = "block";
        } else {
            resBox.className = "resultado error";
            resBox.innerHTML = `⚠️ <strong>${nombre}</strong><br>Estado: INACTIVO`;
        }
    } else {
        resBox.className = "resultado error";
        resBox.innerHTML = "❌ Documento no encontrado.";
        resBox.style.display = "block";
    }
}

// 3. Generar PDF usando la PLANTILLA
function generarCertificado() {
    if (!consejeroEncontrado) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Dibujar la plantilla como fondo (ocupa toda la página)
    if (plantillaBase64) {
        doc.addImage(plantillaBase64, 'PNG', 0, 0, pageWidth, 297);
    }

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    // Texto de EL SUSCRITO DIRECTOR...
    const cargo = "EL SUSCRITO DIRECTOR DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE";
    doc.text(doc.splitTextToSize(cargo, 160), 25, 65);

    doc.setFontSize(11);
    doc.text("HACE CONSTAR QUE:", pageWidth / 2, 85, { align: "center" });

    // Cuerpo del mensaje
    doc.setFont("helvetica", "normal");
    const nombre = (consejeroEncontrado["Nombre completo"] || "CONSEJERO/A").toUpperCase();
    const cedula = consejeroEncontrado["No. Documento"];
    const consejo = consejeroEncontrado["Consejo"] || "N/A";
    const sector = consejeroEncontrado["Sector"] || "N/A";
    const resolucion = consejeroEncontrado["Acto de Reconocimiento"] || "Resolución No. 551 de 2023";

    const parrafo1 = `${nombre}, identificado(a) con cédula de ciudadanía número ${cedula}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según ${resolucion}.`;
    
    doc.text(doc.splitTextToSize(parrafo1, 160), 25, 100, { align: "justify" });

    const parrafo2 = "A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 17 del Decreto Distrital 336 de 2022.";
    doc.text(doc.splitTextToSize(parrafo2, 160), 25, 135, { align: "justify" });

    // Fecha
    const hoy = new Date();
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const fechaTexto = `La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;
    doc.text(doc.splitTextToSize(fechaTexto, 160), 25, 155);

    // Firma
    doc.setFont("helvetica", "bold");
    doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", 25, 185);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Director de Asuntos Locales y Participación", 25, 191);
    doc.text("Secretaría de Cultura, Recreación y Deporte", 25, 196);

    doc.save(`Certificado_${cedula}.pdf`);
}
