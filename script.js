const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JA8VgkELRklNZYma5R7Mt2JD7qWkOdPPdBS60K5dtggYeJZTjaG7LD7KzWx_9xxGDtgk7Spbixmj/pub?output=csv';

let datosConsejeros = [];
let consejeroEncontrado = null;

async function cargarDatos() {
    try {
        // Añadimos un timestamp para evitar que el navegador guarde una versión vieja
        const respuesta = await fetch(SHEET_CSV_URL + '&t=' + Date.now());
        const textoOriginal = await respuesta.text();
        
        // Dividir por filas y limpiar espacios raros
        const filas = textoOriginal.split(/\r?\n/).filter(f => f.trim() !== "");
        if (filas.length < 2) return;

        const cabeceras = filas[0].split(',').map(h => h.replace(/"/g, '').trim());

        datosConsejeros = filas.slice(1).map(fila => {
            // Regex para separar por comas pero ignorar comas dentro de comillas
            const valores = fila.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            let obj = {};
            cabeceras.forEach((header, i) => {
                let val = valores[i] ? valores[i].replace(/"/g, '').trim() : "";
                obj[header] = val;
            });
            return obj;
        });
        console.log("Base de datos cargada. Registros:", datosConsejeros.length);
    } catch (error) {
        console.error("Error al cargar datos:", error);
    }
}

cargarDatos();

async function consultar() {
    const inputDoc = document.getElementById("documento").value.trim();
    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    resBox.style.display = "none";
    btnPdf.style.display = "none";

    if (!inputDoc) {
        alert("Escribe un número de documento.");
        return;
    }

    // BÚSQUEDA TODOTERRENO: 
    // Buscamos el documento comparando contra TODAS las propiedades de la fila
    // por si Google Sheets cambió el nombre de la columna "No. Documento"
    consejeroEncontrado = datosConsejeros.find(c => {
        return Object.values(c).some(valor => String(valor).trim() === inputDoc);
    });

    if (consejeroEncontrado) {
        resBox.style.display = "block";
        
        // Buscamos el nombre y estado de forma flexible
        const nombre = consejeroEncontrado["Nombre completo"] || consejeroEncontrado["Nombre"] || "Consejero/a";
        const consejo = consejeroEncontrado["Consejo"] || "Consejo Distrital";
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
        resBox.innerHTML = "❌ Documento no encontrado en la base de datos oficial.";
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
    
    // Configuración de márgenes y estilo
    const margin = 25;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // 1. ENCABEZADO (Simulando el logo y texto superior)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("BOGOTÁ", 20, 20);
    doc.setFontSize(10);
    doc.text("SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE", 20, 26);
    
    // 2. TÍTULO CARGO
    doc.setFontSize(11);
    const cargoSuperior = doc.splitTextToSize("EL SUSCRITO DIRECTOR DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE", pageWidth - 50);
    doc.text(cargoSuperior, 25, 50, { align: 'left' });

    // 3. HACE CONSTAR QUE:
    doc.setFontSize(12);
    doc.text("HACE CONSTAR QUE:", pageWidth / 2, 75, { align: "center" });

    // 4. CUERPO DEL TEXTO (Dinámico)
    doc.setFont("helvetica", "normal");
    const nombre = consejeroEncontrado["Nombre completo"] || consejeroEncontrado["Nombre"];
    const cedula = consejeroEncontrado["No. Documento"];
    const consejo = consejeroEncontrado["Consejo"] || "N/A";
    const sector = consejeroEncontrado["Sector"] || "N/A";
    const resolucion = consejeroEncontrado["Acto de Reconocimiento"] || "Resolución No. 551 del 28 de julio de 2023";

    const parrafo1 = `${nombre}, identificado(a) con cédula de ciudadanía número ${cedula}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según ${resolucion}.`;
    
    const lineasParrafo1 = doc.splitTextToSize(parrafo1, pageWidth - 50);
    doc.text(lineasParrafo1, 25, 90);

    const parrafo2 = "A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 17 del Decreto Distrital 336 de 2022.";
    const lineasParrafo2 = doc.splitTextToSize(parrafo2, pageWidth - 50);
    doc.text(lineasParrafo2, 25, 125);

    // 5. FECHA DE EXPEDICIÓN
    const hoy = new Date();
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const fechaTexto = `La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;
    doc.text(doc.splitTextToSize(fechaTexto, pageWidth - 50), 25, 145);

    // 6. FIRMA
    doc.setFont("helvetica", "bold");
    doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", 25, 175);
    doc.setFont("helvetica", "normal");
    doc.text("Director de Asuntos Locales y Participación", 25, 181);
    doc.text("Secretaría de Cultura, Recreación y Deporte", 25, 187);

    // 7. PIE DE PÁGINA
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    const nota = "Nota: Este certificado ha sido generado automáticamente desde el portal web Radar Cultural. Puede verificar la autenticidad del mismo a través del correo sistemaparticipacion@scrd.gov.co";
    doc.text(doc.splitTextToSize(nota, pageWidth - 50), 25, 210);

    doc.setFont("helvetica", "normal");
    doc.text("Carrera 8ª No. 9-83 Centro", 25, 230);
    doc.text("Tel. 3274850", 25, 235);
    doc.text("Código Postal: 111711", 25, 240);
    doc.text("www.culturarecreacionydeporte.gov.co", 25, 245);

    // Descargar el archivo
    doc.save(`Certificado_Consejero_${cedula}.pdf`);
}
