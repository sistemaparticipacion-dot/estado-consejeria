const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datos = [];
let seleccionado = null;
let plantilla = null;
let cargado = false;

// =========================
// NORMALIZAR DOCUMENTO
// =========================
function limpiarDoc(valor) {
    return String(valor || "").replace(/\D/g, "").trim();
}

// =========================
// INICIALIZACIÓN
// =========================
document.addEventListener("DOMContentLoaded", () => {
    init();
});

async function init() {
    conectarEventos();
    await cargarDatos();
    await cargarPlantilla();
}

// =========================
// EVENTOS
// =========================
function conectarEventos() {

    const btnConsultar = document.getElementById("btnConsultar");
    const input = document.getElementById("documento");
    const btnPdf = document.getElementById("btnCertificado");

    btnConsultar.addEventListener("click", consultar);

    input.addEventListener("keypress", function(e) {
        if (e.key === "Enter") consultar();
    });

    btnPdf.addEventListener("click", generarPDF);

    input.addEventListener("input", () => {
        document.getElementById("resBox").style.display = "none";
        btnPdf.style.display = "none";
    });
}

// =========================
// CARGAR DATOS
// =========================
async function cargarDatos() {
    try {
        const res = await fetch(SHEET_URL + "&t=" + Date.now());
        const text = await res.text();

        const filas = text.split(/\r?\n/).filter(f => f.trim());
        const headers = filas[0].split(',').map(h => h.trim());

        datos = filas.slice(1).map(fila => {
            const cols = fila.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];

            let obj = {};
            headers.forEach((h, i) => {
                obj[h] = (cols[i] || "").replace(/"/g, "").trim();
            });

            obj._doc = limpiarDoc(obj["No. Documento"]);
            return obj;
        });

        cargado = true;
        console.log("✅ Datos cargados:", datos.length);

    } catch (error) {
        console.error("❌ Error cargando datos:", error);
    }
}

// =========================
// CARGAR PLANTILLA
// =========================
async function cargarPlantilla() {
    try {
        const img = new Image();
        img.src = "plantilla.png";
        img.crossOrigin = "Anonymous";

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        plantilla = canvas.toDataURL("image/png");

    } catch (error) {
        console.warn("⚠️ No se pudo cargar la plantilla");
    }
}

// =========================
// CONSULTAR
// =========================
function consultar() {

    if (!cargado) {
        alert("La base de datos aún está cargando.");
        return;
    }

    const input = limpiarDoc(document.getElementById("documento").value);
    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    if (!input) return;

    seleccionado = datos.find(d => d._doc === input);

    if (seleccionado) {

        resBox.style.display = "block";
        resBox.className = "resultado activo";

        resBox.innerHTML = `
            ✅ <strong>${seleccionado["Nombre completo"].toUpperCase()}</strong><br>
            Presenta consejería ACTIVA en el Sistema Distrital de Arte, Cultura y Patrimonio.
        `;

        btnPdf.style.display = "block";

    } else {

        resBox.style.display = "block";
        resBox.className = "resultado error";

        resBox.innerHTML = "❌ Su documento no hace parte de la base de datos de consejeros del Sistema.";

        btnPdf.style.display = "none";
    }
}

// =========================
// LIMPIAR FORMULARIO
// =========================
function limpiarFormulario() {

    document.getElementById("documento").value = "";

    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    resBox.style.display = "none";
    btnPdf.style.display = "none";

    seleccionado = null;

    document.getElementById("documento").focus();
}

// Generar PDF =========================
// Generar PDF =========================
function generarPDF() {

    if (!seleccionado) {
        alert("No hay datos para generar el certificado.");
        return;
    }

    try {

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("p", "mm", "letter");

        const width = doc.internal.pageSize.getWidth();
        const margin = 25;
        const maxWidth = width - (margin * 2);

        let y = 50;

        if (plantilla) {
            doc.addImage(plantilla, "PNG", 0, 0, width, 279);
        }

        const nombre = seleccionado["Nombre completo"].toUpperCase();
        const cedula = seleccionado["No. Documento"];
        const sector = seleccionado["Sector"];
        const consejo = seleccionado["Consejo"];
        const resolucion = seleccionado["Acto de reconocimiento (numero Resolución)"]
            || "Resolución No. 551 del 28 de julio de 2023";

        const hoy = new Date();
        const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

        // Código único de expedición ← ahora sí, cedula y hoy ya están definidos
        const aleatorio = Math.random().toString(36).substring(2, 6).toUpperCase();
        const codigoExp = `SCRD-${hoy.getFullYear()}-${String(cedula).slice(0, 5)}-${aleatorio}`;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Código: ${codigoExp}`, width - margin, 15, { align: "right" });
        doc.setTextColor(0);

        function justificarTexto(texto, x, y, maxWidth, lineHeight) {

            const palabras = texto.split(' ').filter(p => p.length > 0);
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
                const textoLinea = lp.join(' ');
                const anchoTexto = doc.getTextWidth(textoLinea);

                if (last || anchoTexto > maxWidth * 0.95) {
                    doc.text(textoLinea, x, y);
                } else {
                    const espacio = (maxWidth - anchoTexto) / (lp.length - 1);
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

        // Encabezado
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        const encabezado = "EL SUSCRITO DIRECTOR DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE";
        const encLines = doc.splitTextToSize(encabezado, maxWidth);
        doc.text(encLines, width / 2, y, { align: "center" });
        y += encLines.length * 5 + 10;

        // Título
        doc.setFontSize(11);
        doc.text("HACE CONSTAR QUE:", width / 2, y, { align: "center" });
        y += 10;

        // Cuerpo
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);

        const parrafo1 = `${nombre}, identificado(a) con cédula de ciudadanía número ${cedula}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según ${resolucion}.`;
        y = justificarTexto(parrafo1, margin, y, maxWidth - 2, 6);
        y += 6;

        const parrafo2 = `A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 155 del Decreto Distrital 649 de 2025.`;
        y = justificarTexto(parrafo2, margin, y, maxWidth - 2, 6);
        y += 6;

        const parrafo3 = `La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;
        y = justificarTexto(parrafo3, margin, y, maxWidth - 2, 6);

        // Firma
        y += 20;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", width / 2, y, { align: "center" });
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.text("Director de Asuntos Locales y Participación", width / 2, y, { align: "center" });
        y += 5;
        doc.text("Secretaría de Cultura, Recreación y Deporte", width / 2, y, { align: "center" });

        // Nota
        doc.setFontSize(6);
        doc.setTextColor(100);
        const nota = "Nota: Este certificado ha sido generado automáticamente desde el portal web Radar Cultural. Puede verificar la autenticidad del mismo a través del correo sistemaparticipacion@scrd.gov.co";
        doc.text(doc.splitTextToSize(nota, maxWidth), margin, 230);

        doc.save(`Certificado_${cedula}.pdf`);

        limpiarFormulario();

        // LIMPIAR DESPUÉS
        limpiarFormulario();

    } catch (error) {
        console.error("❌ Error generando PDF:", error);
        alert("Error generando el certificado.");
    }
}
