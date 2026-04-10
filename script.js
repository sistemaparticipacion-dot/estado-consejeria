const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datosConsejeros = [];
let consejeroEncontrado = null;
let plantillaBase64 = null;

// 1. CARGA INICIAL (Datos + Plantilla)
async function inicializar() {
    try {
        console.log("Iniciando carga de datos...");
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

        // Cargamos la imagen de fondo
        plantillaBase64 = await getBase64ImageFromUrl('plantilla.png');
        console.log("Base de datos cargada: " + datosConsejeros.length + " registros.");
        console.log("Plantilla lista para Tamaño Carta.");
    } catch (error) {
        console.error("Error crítico en inicialización:", error);
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
        img.onerror = (e) => reject("No se pudo cargar la imagen: " + imageUrl);
    });
}

// Ejecutar al cargar la página
inicializar();

// 2. FUNCIÓN DE CONSULTA (Corregida para que no falle al hacer clic)
async function consultar() {
    // Obtenemos el input y los elementos de la interfaz
    const inputElement = document.getElementById("documento");
    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    if (!inputElement) {
        console.error("No se encontró el campo de texto con ID 'documento'");
        return;
    }

    const valorBusqueda = inputElement.value.trim();

    if (valorBusqueda === "") {
        alert("Por favor, ingresa un número de documento.");
        return;
    }

    // Buscamos en el array global (convertimos ambos a String para evitar errores)
    consejeroEncontrado = datosConsejeros.find(c => 
        String(c["No. Documento"]).trim() === String(valorBusqueda)
    );

    if (consejeroEncontrado) {
        resBox.style.display = "block";
        resBox.className = "resultado activo";
        const nombre = (consejeroEncontrado["Nombre completo"] || "CONSEJERO/A").toUpperCase();
        resBox.innerHTML = `✅ <strong>${nombre}</strong><br>Estado: ACTIVO`;
        btnPdf.style.display = "block";
    } else {
        resBox.style.display = "block";
        resBox.className = "resultado error";
        resBox.innerHTML = "❌ Documento no encontrado. Verifique el número.";
        btnPdf.style.display = "none";
    }
}

// 3. GENERACIÓN DE PDF (Tamaño Carta - Letter)
function generarCertificado() {
    if (!consejeroEncontrado) {
        alert("Debes encontrar un consejero primero.");
        return;
    }
    if (!plantillaBase64) {
        alert("La plantilla aún se está cargando, intenta en 2 segundos.");
        return;
    }

    const { jsPDF } = window.jspdf;
    
    // Configuración Letter (215.9 x 279.4 mm)
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const margin = 32; 
    const textWidth = pageWidth - (margin * 2);

    // Fondo
    doc.addImage(plantillaBase64, 'PNG', 0, 0, pageWidth, pageHeight);
    doc.setTextColor(0, 0, 0);
    
    // Cargo Director (Y=55)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const cargo = "EL SUSCRITO DIRECTOR DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE";
    doc.text(doc.splitTextToSize(cargo, textWidth), margin, 55);

    // Hace Constar (Y=75)
    doc.setFontSize(11);
    doc.text("HACE CONSTAR QUE:", pageWidth / 2, 75, { align: "center" });

    // Cuerpo (Y=90)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const nombre = (consejeroEncontrado["Nombre completo"]).toUpperCase();
    const cedula = consejeroEncontrado["No. Documento"];
    const sector = consejeroEncontrado["Sector"];
    const consejo = consejeroEncontrado["Consejo"];
    const resolucion = consejeroEncontrado["Acto de Reconocimiento"] || "Resolución No. 551 del 28 de julio de 2023";

    const parrafo1 = `${nombre}, identificado(a) con cédula de ciudadanía número ${cedula}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según ${resolucion}.`;
    
    doc.text(doc.splitTextToSize(parrafo1, textWidth), margin, 90, { align: "justify" });

    // Párrafo 2 (Y=128)
    const parrafo2 = "A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 17 del Decreto Distrital 336 de 2022.";
    doc.text(doc.splitTextToSize(parrafo2, textWidth), margin, 128, { align: "justify" });

    // Fecha (Y=150)
    const hoy = new Date();
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const fechaTexto = `La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;
    doc.text(doc.splitTextToSize(fechaTexto, textWidth), margin, 150);

    // Firma (Y=185)
    const yFirma = 185;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", pageWidth / 2, yFirma, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text("Director de Asuntos Locales y Participación", pageWidth / 2, yFirma + 6, { align: "center" });
    doc.text("Secretaría de Cultura, Recreación y Deporte", pageWidth / 2, yFirma + 11, { align: "center" });

    // Nota (Y=225)
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const nota = "Nota: Este certificado ha sido generado automáticamente desde el portal web Radar Cultural. Puede verificar la autenticidad del mismo a través del correo sistemaparticipacion@scrd.gov.co";
    doc.text(doc.splitTextToSize(nota, textWidth), margin, 225, { align: "justify" });

    doc.save(`Certificado_${cedula}.pdf`);
}
