const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datosConsejeros = [];
let consejeroEncontrado = null;
let plantillaBase64 = null;

async function inicializar() {
    try {
        const respuesta = await fetch(SHEET_CSV_URL + '&t=' + Date.now());
        const textoOriginal = await respuesta.text();
        const filas = textoOriginal.split(/\r?\n/).filter(f => f.trim() !== "");
        const cabeceras = filas[0].split(',').map(h => h.trim());

        datosConsejeros = filas.slice(1).map(fila => {
            const valores = fila.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || fila.split(',');
            let obj = {};
            cabeceras.forEach((header, i) => {
                obj[header] = valores[i] ? valores[i].replace(/"/g, '').trim() : "";
            });
            return obj;
        });

        plantillaBase64 = await getBase64ImageFromUrl('plantilla.png');
        console.log("Sistema listo - Tamaño Carta");
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

    consejeroEncontrado = datosConsejeros.find(c => String(c["No. Documento"]).trim() === inputDoc);

    if (consejeroEncontrado) {
        resBox.style.display = "block";
        resBox.className = "resultado activo";
        resBox.innerHTML = `✅ <strong>${(consejeroEncontrado["Nombre completo"]).toUpperCase()}</strong><br>Estado: ACTIVO`;
        btnPdf.style.display = "block";
    } else {
        resBox.style.display = "block";
        resBox.className = "resultado error";
        resBox.innerHTML = "❌ Documento no encontrado.";
        btnPdf.style.display = "none";
    }
}

function generarCertificado() {
    if (!consejeroEncontrado || !plantillaBase64) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Margen amplio de 32mm para evitar que el texto se vea apretado a los lados
    const margin = 32; 
    const textWidth = pageWidth - (margin * 2);

    // 1. Fondo
    doc.addImage(plantillaBase64, 'PNG', 0, 0, pageWidth, 279.4);

    // 2. Cargo Superior
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const cargo = "EL SUSCRITO DIRECTOR DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE";
    doc.text(doc.splitTextToSize(cargo, textWidth), margin, 55);

    // 3. Hace Constar
    doc.setFontSize(11);
    doc.text("HACE CONSTAR QUE:", pageWidth / 2, 80, { align: "center" });

    // 4. Párrafo Principal (Mejor interlineado)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5); // Un poco más pequeña para evitar que el justificado rompa palabras
    
    const nombre = (consejeroEncontrado["Nombre completo"]).toUpperCase();
    const cedula = consejeroEncontrado["No. Documento"];
    const sector = consejeroEncontrado["Sector"];
    const consejo = consejeroEncontrado["Consejo"];
    const resolucion = consejeroEncontrado["Acto de Reconocimiento"] || "Resolución No. 551 del 28 de julio de 2023";

    const parrafo1 = `${nombre}, identificado(a) con cédula de ciudadanía número ${cedula}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según ${resolucion}.`;
    
    const lineasP1 = doc.splitTextToSize(parrafo1, textWidth);
    // Imprimimos con un interlineado de 6mm entre líneas
    doc.text(lineasP1, margin, 95, { align: "justify", lineHeightFactor: 1.5 });

    // 5. Segundo Párrafo
    const parrafo2 = "A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 17 del Decreto Distrital 336 de 2022.";
    const lineasP2 = doc.splitTextToSize(parrafo2, textWidth);
    doc.text(lineasP2, margin, 135, { align: "justify", lineHeightFactor: 1.5 });

    // 6. Fecha
    const hoy = new Date();
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const fechaTexto = `La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;
    doc.text(doc.splitTextToSize(fechaTexto, textWidth), margin, 160);

    // 7. Firma Centrada
    const yFirma = 195;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", pageWidth / 2, yFirma, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text("Director de Asuntos Locales y Participación", pageWidth / 2, yFirma + 6, { align: "center" });
    doc.text("Secretaría de Cultura, Recreación y Deporte", pageWidth / 2, yFirma + 11, { align: "center" });

    // 8. Nota al pie (Más abajo para que no choque)
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const nota = "Nota: Este certificado ha sido generado automáticamente desde el portal web Radar Cultural. Puede verificar la autenticidad del mismo a través del correo sistemaparticipacion@scrd.gov.co";
    const lineasNota = doc.splitTextToSize(nota, textWidth);
    doc.text(lineasNota, margin, 240, { align: "justify" });

    doc.save(`Certificado_${cedula}.pdf`);
}
