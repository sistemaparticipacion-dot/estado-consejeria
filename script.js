const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datosConsejeros = [];
let consejeroEncontrado = null;
let plantillaBase64 = null;

async function inicializar() {
    await cargarDatos();
    try {
        plantillaBase64 = await getBase64ImageFromUrl('plantilla.png');
    } catch (e) { console.error("Error cargando plantilla"); }
}

async function cargarDatos() {
    try {
        const respuesta = await fetch(SHEET_CSV_URL + '&t=' + Date.now());
        const textoOriginal = await respuesta.text();
        
        // Nueva lógica para separar filas respetando comas dentro de comillas
        const filas = textoOriginal.split(/\r?\n/).filter(f => f.trim() !== "");
        const cabeceras = filas[0].split(',').map(h => h.replace(/"/g, '').trim());

        datosConsejeros = filas.slice(1).map(fila => {
            // Este Regex es clave: separa por comas pero NO si la coma está dentro de comillas
            const valores = fila.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            let obj = {};
            cabeceras.forEach((header, i) => {
                let val = valores[i] ? valores[i].replace(/"/g, '').trim() : "";
                obj[header] = val;
            });
            return obj;
        });
    } catch (error) { console.error("Error:", error); }
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

    // Búsqueda flexible en todas las columnas por si acaso
    consejeroEncontrado = datosConsejeros.find(c => {
        return Object.values(c).some(v => String(v).trim() === inputDoc);
    });

    if (consejeroEncontrado) {
        resBox.style.display = "block";
        resBox.className = "resultado activo";
        const nombreDisplay = (consejeroEncontrado["Nombre completo"] || "Consejero/a").toUpperCase();
        resBox.innerHTML = `✅ <strong>${nombreDisplay}</strong><br>Estado: ACTIVO`;
        btnPdf.style.display = "block";
    } else {
        resBox.style.display = "block";
        resBox.className = "resultado error";
        resBox.innerHTML = "❌ Documento no encontrado.";
        btnPdf.style.display = "none";
    }
}

function generarCertificado() {
    if (!consejeroEncontrado) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. FONDO: Plantilla oficial
    if (plantillaBase64) {
        doc.addImage(plantillaBase64, 'PNG', 0, 0, 210, 297);
    }

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    
    // 2. TEXTO SUPERIOR (Cargo)
    doc.setFontSize(10);
    const cargo = "EL SUSCRITO DIRECTOR DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE";
    doc.text(doc.splitTextToSize(cargo, 165), 22, 65);

    doc.setFontSize(11);
    doc.text("HACE CONSTAR QUE:", pageWidth / 2, 88, { align: "center" });

    // 3. CUERPO DEL CERTIFICADO
    doc.setFont("helvetica", "normal");
    const nombreCompleto = (consejeroEncontrado["Nombre completo"] || "CONSEJERO/A").toUpperCase();
    const documento = consejeroEncontrado["No. Documento"] || "N/A";
    const sector = consejeroEncontrado["Sector"] || "N/A";
    const consejo = consejeroEncontrado["Consejo"] || "N/A";
    const resolucion = consejeroEncontrado["Acto de Reconocimiento"] || "Resolución No. 551 de 2023";

    const parrafo1 = `${nombreCompleto}, identificado(a) con cédula de ciudadanía número ${documento}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según ${resolucion}.`;
    
    doc.text(doc.splitTextToSize(parrafo1, 165), 22, 105, { align: "justify" });

    const parrafo2 = "A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 17 del Decreto Distrital 336 de 2022.";
    doc.text(doc.splitTextToSize(parrafo2, 165), 22, 142, { align: "justify" });

    // 4. FECHA
    const hoy = new Date();
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const fechaTexto = `La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;
    doc.text(doc.splitTextToSize(fechaTexto, 165), 22, 165);

    // 5. FIRMA
    doc.setFont("helvetica", "bold");
    doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", 22, 205);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Director de Asuntos Locales y Participación", 22, 211);
    doc.text("Secretaría de Cultura, Recreación y Deporte", 22, 216);

    doc.save(`Certificado_${documento}.pdf`);
}
