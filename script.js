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
    
    // --- 1. IMÁGENES (ENCABEZADO Y PIES) ---
    if (institutionalImages.header) {
        // x: 0, y: 0 para que cubra el tope si es necesario, o 15 para margen
        doc.addImage(institutionalImages.header, 'PNG', 0, 0, pageWidth, 45); 
    }
    
    if (institutionalImages.footer1) {
        doc.addImage(institutionalImages.footer1, 'PNG', 20, 260, 60, 20);
    }
    
    if (institutionalImages.footer2) {
        doc.addImage(institutionalImages.footer2, 'PNG', 130, 260, 60, 20);
    }

    // --- 2. CUERPO DEL TEXTO ---
    doc.setTextColor(0, 0, 0); // Texto negro puro

    // Título del Director
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const cargo = "EL SUSCRITO DIRECTOR DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE";
    const lineasCargo = doc.splitTextToSize(cargo, 160);
    doc.text(lineasCargo, 25, 60);

    // Hace constar
    doc.setFontSize(11);
    doc.text("HACE CONSTAR QUE:", pageWidth / 2, 85, { align: "center" });

    // Párrafo principal
    doc.setFont("helvetica", "normal");
    const nombre = (consejeroEncontrado["Nombre completo"] || "CONSEJERO").toUpperCase();
    const cedula = consejeroEncontrado["No. Documento"];
    const consejo = consejeroEncontrado["Consejo"] || "N/A";
    const sector = consejeroEncontrado["Sector"] || "N/A";
    const resolucion = consejeroEncontrado["Acto de Reconocimiento"] || "Resolución No. 551 del 28 de julio de 2023";

    const parrafo1 = `${nombre}, identificado(a) con cédula de ciudadanía número ${cedula}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según ${resolucion}.`;
    
    const lineasP1 = doc.splitTextToSize(parrafo1, 160);
    doc.text(lineasP1, 25, 100, { align: "justify" });

    // Párrafo de estado activo
    const parrafo2 = "A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 17 del Decreto Distrital 336 de 2022.";
    const lineasP2 = doc.splitTextToSize(parrafo2, 160);
    doc.text(lineasP2, 25, 135, { align: "justify" });

    // Fecha
    const hoy = new Date();
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const fechaTexto = `La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;
    doc.text(doc.splitTextToSize(fechaTexto, 160), 25, 160);

    // Firma
    doc.setFont("helvetica", "bold");
    doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", 25, 195);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Director de Asuntos Locales y Participación", 25, 201);
    doc.text("Secretaría de Cultura, Recreación y Deporte", 25, 206);

    // Nota al pie
    doc.setFontSize(7);
    doc.setTextColor(120);
    const nota = "Nota: Este certificado ha sido generado automáticamente desde el portal web Radar Cultural. Puede verificar la autenticidad del mismo a través del correo sistemaparticipacion@scrd.gov.co";
    doc.text(doc.splitTextToSize(nota, 160), 25, 230);

    doc.save(`Certificado_Consejero_${cedula}.pdf`);
}
