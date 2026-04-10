// Enlace a tu Google Sheets en formato CSV
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datosConsejeros = [];
let consejeroEncontrado = null;

// Objeto para guardar las imágenes institucionales procesadas
let institutionalImages = {
    header: null,
    footer1: null,
    footer2: null
};

// Función para cargar y limpiar los datos de Google Sheets
async function cargarDatos() {
    try {
        const respuesta = await fetch(SHEET_CSV_URL + '&t=' + Date.now());
        const textoOriginal = await respuesta.text();
        
        // Dividir por filas
        const filas = textoOriginal.split(/\r?\n/).filter(f => f.trim() !== "");
        if (filas.length < 2) return;

        // Limpiar encabezados
        const cabeceras = filas[0].split(',').map(h => h.replace(/"/g, '').trim());

        // Procesar cada fila de forma segura respetando comas dentro de comillas
        datosConsejeros = filas.slice(1).map(fila => {
            const valores = fila.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            let obj = {};
            cabeceras.forEach((header, i) => {
                let val = valores[i] ? valores[i].replace(/"/g, '').trim() : "";
                obj[header] = val;
            });
            return obj;
        });
        console.log("Base de datos sincronizada con Google Sheets.");
    } catch (error) {
        console.error("Error crítico de carga:", error);
    }
}

// Función auxiliar para cargar una imagen y convertirla a Base64
function getBase64ImageFromUrl(imageUrl) {
    return new Promise((resolve, reject) => {
        let img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imageUrl;
        img.onload = function () {
            let canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            let ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            let dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        };
        img.onerror = function (err) {
            reject(err);
        };
    });
}

// Cargar imágenes institucionales al iniciar
async function loadInstitutionalImages() {
    try {
        institutionalImages.header = await getBase64ImageFromUrl('encabezado.png');
        institutionalImages.footer1 = await getBase64ImageFromUrl('piedepagina1.png');
        institutionalImages.footer2 = await getBase64ImageFromUrl('piedepagina2.png');
        console.log("Imágenes institucionales cargadas para el PDF.");
    } catch (error) {
        console.error("Error cargando imágenes institucionales:", error);
        //alert("Error cargando logos. El PDF podría generarse sin imágenes.");
    }
}

// Cargar datos y logos al abrir la web
async function inicializar() {
    await cargarDatos();
    await loadInstitutionalImages();
}
inicializar();

async function consultar() {
    const inputDoc = document.getElementById("documento").value.trim();
    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    // Limpieza visual
    resBox.style.display = "none";
    btnPdf.style.display = "none";

    if (!inputDoc) {
        alert("Escribe un número de documento.");
        return;
    }

    // BÚSQUEDA ROBUSTA (Independiente del nombre de columna)
    consejeroEncontrado = datosConsejeros.find(c => {
        return Object.values(c).some(valor => String(valor).trim() === inputDoc);
    });

    if (consejeroEncontrado) {
        resBox.style.display = "block";
        
        // Buscar el nombre de forma flexible
        const nombre = (consejeroEncontrado["Nombre completo"] || consejeroEncontrado["Nombre"] || "Consejero/a").toUpperCase();
        const consejo = consejeroEncontrado["Consejo"] || "N/A";
        const estado = (consejeroEncontrado["Estado"] || "").toLowerCase();

        if (estado.includes("activo")) {
            resBox.className = "resultado activo";
            resBox.innerHTML = `✅ <strong>${nombre}</strong><br>Estado: <strong>ACTIVO</strong><br><small>${consejo}</small>`;
            btnPdf.style.display = "block";
            reproducirSonido("activo");
        } else {
            resBox.className = "resultado error";
            resBox.innerHTML = `⚠️ <strong>${nombre}</strong><br>Estado: <strong>INACTIVO</strong><br><small>Trámite en curso según Decreto 480.</small>`;
            reproducirSonido("inactivo");
        }
    } else {
        resBox.className = "resultado error";
        resBox.innerHTML = "❌ El documento no se encuentra en la base de datos.<br><small>Verifica el número o contacta a la Secretaría.</small>";
        resBox.style.display = "block";
        reproducirSonido("error");
    }
}

function reproducirSonido(tipo) {
    const audio = new Audio(`sonido_${tipo}.mp3`);
    audio.play().catch(() => {});
}

function generarCertificado() {
    if (!consejeroEncontrado) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 25;
    
    // --- INSERTAR IMÁGENES ---
    
    // 1. ENCABEZADO (Logo SCRD y Bogotá)
    if (institutionalImages.header) {
        // (Imagen, x, y, width, height)
        doc.addImage(institutionalImages.header, 'PNG', 25, 15, 160, 25);
    }
    
    // --- TEXTO OFICIAL (Réplica del ejemplo) ---
    
    // 2. TÍTULO CARGO
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    const cargoSuperior = "EL SUSCRITO DIRECTOR DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE";
    const lineasCargo = doc.splitTextToSize(cargoSuperior, pageWidth - 50);
    doc.text(lineasCargo, 25, 55);

    // 3. HACE CONSTAR QUE
    doc.setFontSize(11);
    doc.text("HACE CONSTAR QUE:", pageWidth / 2, 75, { align: "center" });

    // 4. CUERPO DEL TEXTO (Dinámico)
    doc.setFont("helvetica", "normal");
    const nombre = (consejeroEncontrado["Nombre completo"] || "Consejero").toUpperCase();
    const cedula = consejeroEncontrado["No. Documento"];
    const consejo = consejeroEncontrado["Consejo"] || "N/A";
    const sector = consejeroEncontrado["Sector"] || "N/A";
    const resolucion = consejeroEncontrado["Acto de Reconocimiento"] || "Resolución No. 551 del 28 de julio de 2023";

    const parrafo1 = `${nombre}, identificado(a) con cédula de ciudadanía número ${cedula}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según ${resolucion}.`;
    
    const lineasP1 = doc.splitTextToSize(parrafo1, pageWidth - 50);
    doc.text(lineasP1, 25, 90, { align: "justify" });

    const parrafo2 = "A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 17 del Decreto Distrital 336 de 2022.";
    const lineasP2 = doc.splitTextToSize(parrafo2, pageWidth - 50);
    doc.text(lineasP2, 25, 120, { align: "justify" });

    // 5. FECHA EXPEDICIÓN
    const hoy = new Date();
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const fechaTexto = `La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;
    doc.text(doc.splitTextToSize(fechaTexto, pageWidth - 50), 25, 140);

    // 6. FIRMA
    doc.setFont("helvetica", "bold");
    doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", 25, 170);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Director de Asuntos Locales y Participación", 25, 176);
    doc.text("Secretaría de Cultura, Recreación y Deporte", 25, 181);

    // --- INSERTAR PIES DE PÁGINA ---
    
    const footerY = 240; // Posición vertical de los logos de pie
    
    // 7. PIE DE PÁGINA 1 (Logo Radar Cultural / Participación)
    if (institutionalImages.footer1) {
        doc.addImage(institutionalImages.footer1, 'PNG', 25, footerY, 70, 20);
    }
    
    // 8. PIE DE PÁGINA 2 (Logo Alcaldía Mayor de Bogotá)
    if (institutionalImages.footer2) {
        doc.addImage(institutionalImages.footer2, 'PNG', 120, footerY, 60, 20);
    }

    // Guardar el archivo
    doc.save(`Certificado_Consejero_${cedula}.pdf`);
}
