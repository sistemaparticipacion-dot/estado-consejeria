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

function generarCertificado() {
    if (!consejeroEncontrado || !plantillaBase64) {
        alert("Espera un segundo a que cargue la plantilla...");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // 1. Fondo de la plantilla oficial
    doc.addImage(plantillaBase64, 'PNG', 0, 0, 210, 297);

    // 2. Configuración de texto
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    // Cargo superior
    const cargo = "EL SUSCRITO DIRECTOR DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE";
    doc.text(doc.splitTextToSize(cargo, 160), 25, 65);

    doc.setFontSize(11);
    doc.text("HACE CONSTAR QUE:", 105, 88, { align: "center" });

    // 3. Datos Dinámicos 
    doc.setFont("helvetica", "normal");
    const nombre = (consejeroEncontrado["Nombre completo"]).toUpperCase();
    const cedula = consejeroEncontrado["No. Documento"];
    const sector = consejeroEncontrado["Sector"];
    const consejo = consejeroEncontrado["Consejo"];

    const parrafo1 = `${nombre}, identificado(a) con cédula de ciudadanía número ${cedula}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según Resolución No. 551 del 28 de julio de 2023.`;
    
    doc.text(doc.splitTextToSize(parrafo1, 165), 25, 105, { align: "justify" });

    const parrafo2 = "A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 17 del Decreto Distrital 336 de 2022.";
    doc.text(doc.splitTextToSize(parrafo2, 165), 25, 140, { align: "justify" });

    // 4. Fecha y Firma
    const hoy = new Date();
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const fechaTexto = `La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;
    doc.text(doc.splitTextToSize(fechaTexto, 165), 25, 165);

    doc.setFont("helvetica", "bold");
    doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", 25, 205);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Director de Asuntos Locales y Participación", 25, 211);
    doc.text("Secretaría de Cultura, Recreación y Deporte", 25, 216);

    doc.save(`Certificado_${cedula}.pdf`);
}
