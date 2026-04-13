const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datosConsejeros = [];
let consejeroEncontrado = null;
let plantillaBase64 = null;
let cargado = false;

// 🧼 Normalizar documento (clave)
function limpiarDoc(valor) {
    return String(valor || "").replace(/\D/g, "").trim();
}

// 🚀 Inicialización
async function inicializar() {
    try {
        const respuesta = await fetch(SHEET_CSV_URL + '&t=' + Date.now());
        const texto = await respuesta.text();

        const filas = texto.split(/\r?\n/).filter(f => f.trim() !== "");
        const cabeceras = filas[0].split(',').map(h => h.trim());

        datosConsejeros = filas.slice(1).map(fila => {
            const valores = fila.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || fila.split(',');

            let obj = {};
            cabeceras.forEach((header, i) => {
                obj[header] = valores[i] ? valores[i].replace(/"/g, '').trim() : "";
            });

            // 🔥 Normalizar documento desde el inicio
            obj["_doc"] = limpiarDoc(obj["No. Documento"]);

            return obj;
        });

        plantillaBase64 = await getBase64ImageFromUrl('plantilla.png');

        cargado = true;
        console.log("✅ Sistema listo. Registros:", datosConsejeros.length);

    } catch (error) {
        console.error("❌ Error inicializando:", error);
    }
}

// 🖼 Convertir imagen a base64
function getBase64ImageFromUrl(imageUrl) {
    return new Promise((resolve, reject) => {
        let img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imageUrl;

        img.onload = () => {
            let canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };

        img.onerror = reject;
    });
}

inicializar();

// 🔍 CONSULTAR
async function consultar() {

    if (!cargado) {
        alert("La base de datos aún está cargando, intenta nuevamente en unos segundos.");
        return;
    }

    const inputDoc = limpiarDoc(document.getElementById("documento").value);

    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    if (!inputDoc) return;

    consejeroEncontrado = datosConsejeros.find(c => c["_doc"] === inputDoc);

    if (consejeroEncontrado) {
        resBox.style.display = "block";
        resBox.className = "resultado activo";

        resBox.innerHTML = `
        ✅ <strong>${consejeroEncontrado["Nombre completo"].toUpperCase()}</strong><br>
        Estado: ACTIVO
        `;

        btnPdf.style.display = "block";

    } else {
        resBox.style.display = "block";
        resBox.className = "resultado error";
        resBox.innerHTML = "❌ Documento no encontrado.";
        btnPdf.style.display = "none";
    }
}

// 🧾 GENERAR CERTIFICADO
function generarCertificado() {

    if (!consejeroEncontrado || !plantillaBase64) {
        alert("Error generando certificado. Intenta nuevamente.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'letter');

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 32;
    const textWidth = pageWidth - (margin * 2);

    let y = 55;

    // 🔥 FUNCIÓN JUSTIFICADO
    function justificarTexto(texto, x, y, maxWidth, lineHeight) {

        const palabras = texto.split(' ');
        let linea = [];
        let lineas = [];

        palabras.forEach(palabra => {
            const test = [...linea, palabra].join(' ');
            if (doc.getTextWidth(test) > maxWidth && linea.length) {
                lineas.push(linea);
                linea = [palabra];
            } else {
                linea.push(palabra);
            }
        });

        if (linea.length) lineas.push(linea);

        lineas.forEach((lp, i) => {
            const last = i === lineas.length - 1;

            if (last) {
                doc.text(lp.join(' '), x, y);
            } else {
                let espacio = (maxWidth - doc.getTextWidth(lp.join(' '))) / (lp.length - 1);
                let offset = x;

                lp.forEach((p, idx) => {
                    doc.text(p, offset, y);
                    if (idx < lp.length - 1) {
                        offset += doc.getTextWidth(p + ' ') + espacio;
                    }
                });
            }

            y += lineHeight;
        });

        return y;
    }

    // 🖼 Fondo
    doc.addImage(plantillaBase64, 'PNG', 0, 0, pageWidth, 279.4);

    // 🧠 DATOS
    const nombre = consejeroEncontrado["Nombre completo"].toUpperCase();
    const cedula = consejeroEncontrado["No. Documento"];
    const sector = consejeroEncontrado["Sector"];
    const consejo = consejeroEncontrado["Consejo"];
    const resolucion = consejeroEncontrado["Acto de reconocimiento (numero Resolución)"] 
        || "Resolución No. 551 del 28 de julio de 2023";

    const hoy = new Date();
    const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

    // 🧾 TEXTO
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);

    const p1 = `${nombre}, identificado(a) con cédula de ciudadanía número ${cedula}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según ${resolucion}.`;

    y = justificarTexto(p1, margin, y, textWidth, 6);

    y += 5;

    const p2 = "A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 155 del Decreto Distrital 649 de 2025.";

    y = justificarTexto(p2, margin, y, textWidth, 6);

    y += 10;

    const fechaTexto = `La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;

    y = justificarTexto(fechaTexto, margin, y, textWidth, 6);

    // 🖊 Firma
    y += 25;

    doc.setFont("helvetica", "bold");
    doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", pageWidth / 2, y, { align: "center" });

    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);

    doc.text("Director de Asuntos Locales y Participación", pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text("Secretaría de Cultura, Recreación y Deporte", pageWidth / 2, y, { align: "center" });

    // 📌 Nota
    doc.setFontSize(6);
    doc.setTextColor(100);

    const nota = "Nota: Este certificado ha sido generado automáticamente desde el portal web Radar Cultural. Puede verificar la autenticidad del mismo a través del correo sistemaparticipacion@scrd.gov.co";

    doc.text(doc.splitTextToSize(nota, textWidth), margin, 210);

    // 📄 Exportar
    doc.save(`Certificado_${cedula}.pdf`);
}
