const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datos = [];
let seleccionado = null;
let plantilla = null;
let cargado = false;

// 🔹 Normalizar documento
const limpiarDoc = v => String(v || "").replace(/\D/g, "");

// 🚀 INIT
async function init() {
    await cargarDatos();
    cargarPlantilla();
    conectarEventos();
}

// 📥 Cargar CSV
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

    } catch (e) {
        console.error("❌ Error cargando datos", e);
    }
}

// 🖼 Plantilla
async function cargarPlantilla() {
    try {
        const img = new Image();
        img.src = "plantilla.png";
        img.crossOrigin = "Anonymous";

        await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);

        plantilla = canvas.toDataURL("image/png");

    } catch {
        console.warn("⚠️ Sin plantilla, pero sistema funcional");
    }
}

// 🔘 Eventos
function conectarEventos() {
    document.getElementById("btnConsultar").addEventListener("click", consultar);
    document.getElementById("btnCertificado").addEventListener("click", generarPDF);
}

// 🔍 CONSULTAR
function consultar() {

    if (!cargado) {
        alert("Cargando base de datos...");
        return;
    }

    const input = limpiarDoc(document.getElementById("documento").value);
    const box = document.getElementById("resBox");
    const btn = document.getElementById("btnCertificado");

    if (!input) return;

    seleccionado = datos.find(d => d._doc === input);

    if (!seleccionado) {
        box.className = "resultado error";
        box.innerHTML = "❌ Documento no encontrado";
        box.style.display = "block";
        btn.style.display = "none";
        return;
    }

    box.className = "resultado activo";
    box.innerHTML = `
        <strong>${seleccionado["Nombre completo"].toUpperCase()}</strong><br>
        Consejería ACTIVA
    `;
    box.style.display = "block";

    btn.style.display = "block";
}

// 📄 PDF
function generarPDF() {

    if (!seleccionado) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "letter");

    const width = doc.internal.pageSize.getWidth();
    const margin = 25;
    const maxWidth = width - (margin * 2);

    let y = 40;

    // 🖼 Fondo
    if (plantilla) {
        doc.addImage(plantilla, "PNG", 0, 0, width, 279);
    }

    // 🧠 DATOS
    const nombre = seleccionado["Nombre completo"].toUpperCase();
    const cedula = seleccionado["No. Documento"];
    const sector = seleccionado["Sector"];
    const consejo = seleccionado["Consejo"];
    const resolucion = seleccionado["Acto de reconocimiento (numero Resolución)"] 
        || "Resolución No. 551 del 28 de julio de 2023";

    const hoy = new Date();
    const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

    // ===============================
    // 🔥 FUNCIÓN JUSTIFICADO
    // ===============================
    function justificar(texto, x, y) {
        const lineas = doc.splitTextToSize(texto, maxWidth);
        doc.text(lineas, x, y);
        return y + (lineas.length * 6);
    }

    // ===============================
    // 🏛 ENCABEZADO
    // ===============================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    const encabezado = "LA SUSCRITA DIRECTORA DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE";

    const encLines = doc.splitTextToSize(encabezado, maxWidth);
    doc.text(encLines, width / 2, y, { align: "center" });

    y += encLines.length * 5 + 10;

    // ===============================
    // 🧾 TÍTULO
    // ===============================
    doc.setFontSize(11);
    doc.text("HACE CONSTAR QUE:", width / 2, y, { align: "center" });

    y += 15;

    // ===============================
    // 📄 PÁRRAFO 1
    // ===============================
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);

    const p1 = `${nombre}, identificado(a) con cédula de ciudadanía número ${cedula}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según ${resolucion}.`;

    y = justificar(p1, margin, y);

    y += 5;

    // ===============================
    // 📄 PÁRRAFO 2
    // ===============================
    const p2 = "A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 17 del Decreto Distrital 336 de 2022.";

    y = justificar(p2, margin, y);

    y += 10;

    // ===============================
    // 📅 FECHA
    // ===============================
    const fecha = `La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;

    y = justificar(fecha, margin, y);

    y += 25;

    // ===============================
    // ✍️ FIRMA
    // ===============================
    doc.setFont("helvetica", "bold");
    doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", width / 2, y, { align: "center" });

    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);

    doc.text("Director de Asuntos Locales y Participación", width / 2, y, { align: "center" });
    y += 5;
    doc.text("Secretaría de Cultura, Recreación y Deporte", width / 2, y, { align: "center" });

    // ===============================
    // 📌 NOTA
    // ===============================
    doc.setFontSize(7);
    doc.setTextColor(100);

    const nota = "Nota: Este certificado ha sido generado automáticamente desde el portal web Radar Cultural. Puede verificar la autenticidad del mismo a través del correo sistemaparticipacion@scrd.gov.co";

    const notaLines = doc.splitTextToSize(nota, maxWidth);
    doc.text(notaLines, margin, 260);

    // ===============================
    // 📄 EXPORTAR
    // ===============================
    doc.save(`Certificado_${cedula}.pdf`);
}
