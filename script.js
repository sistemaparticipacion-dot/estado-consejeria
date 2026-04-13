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

    if (plantilla) {
        doc.addImage(plantilla, "PNG", 0, 0, width, 279);
    }

    doc.setFontSize(11);

    doc.text(seleccionado["Nombre completo"].toUpperCase(), 105, 120, { align: "center" });

    doc.text(`CC ${seleccionado["No. Documento"]}`, 105, 130, { align: "center" });

    doc.save(`Certificado_${seleccionado["No. Documento"]}.pdf`);
}

// 🚀 INICIAR
init();
