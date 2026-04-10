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
        console.log("Sistema listo y plantilla cargada.");
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

    consejeroEncontrado = datosConsejeros.find(c => String(c["No. Documento"]) === inputDoc);

    if (consejeroEncontrado) {
        resBox.style.display = "block";
        resBox.className = "resultado activo";
        const nombre = (consejeroEncontrado["Nombre completo"] || "").toUpperCase();
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
    if (!consejeroEncontrado || !plantillaBase64) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Márgenes idénticos a la referencia
    const margin = 28; 
    const textWidth = pageWidth - (margin * 2);

    // 1. Fondo
    doc.addImage(plantillaBase64, 'PNG', 0, 0, 210, 297);

    // 2. Cargo Superior (Negrita y ajustado)
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    const cargo = "EL SUSCRITO DIRECTOR DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE";
    doc.text(doc.splitTextToSize(cargo, textWidth), margin, 60);

    // 3. Hace Constar
    doc.setFontSize(11);
    doc.text("HACE CONSTAR QUE:", pageWidth / 2, 82, { align: "center" });

    // 4. Párrafo Principal (Justificado)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const nombre = (consejeroEncontrado["Nombre completo"]).toUpperCase();
    const cedula = consejeroEncontrado["No. Documento"];
    const sector = consejeroEncontrado["Sector"];
    const consejo = consejeroEncontrado["Consejo"];
    const resolucion = consejeroEncontrado["Acto de Reconocimiento"] || "Resolución No. 551 del 28 de julio de 2023";

    const parrafo1 = `${nombre}, identificado(a) con cédula de ciudadanía número ${cedula}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según ${resolucion}.`;
    
    const lineasP1 = doc.splitTextToSize(parrafo1, textWidth);
    doc.text(lineasP1, margin, 95, { align: "justify" });

    // 5. Segundo Párrafo
    const parrafo2 = "A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 17 del Decreto Distrital 336 de 2022.";
    const lineasP2 = doc.splitTextToSize(parrafo2, textWidth);
    doc.text(lineasP2, margin, 132, { align: "justify" });

    // 6. Fecha
    const hoy = new Date();
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const fechaTexto = `La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;
    doc.text(doc.splitTextToSize(fechaTexto, textWidth), margin, 158);

    // 7. Firma CENTRADA
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", pageWidth / 2, 190, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Director de Asuntos Locales y Participación", pageWidth / 2, 196, { align: "center" });
    doc.text("Secretaría de Cultura, Recreación y Deporte", pageWidth / 2, 201, { align: "center" });

    // 8. NOTA AL PIE (Gris y pequeña)
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const nota = "Nota: Este certificado ha sido generado automáticamente desde el portal web Radar Cultural. Puede verificar la autenticidad del mismo a través del correo sistemaparticipacion@scrd.gov.co";
    const lineasNota = doc.splitTextToSize(nota, textWidth);
    doc.text(lineasNota, margin, 225, { align: "start" });

    doc.save(`Certificado_${cedula}.pdf`);
}
