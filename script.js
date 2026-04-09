let datosConsejero = null;

async function consultar() {
    const input = document.getElementById("documento").value.trim();
    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    // 1. Limpieza inicial
    resBox.style.display = "none";
    btnPdf.style.display = "none";
    resBox.innerHTML = "Cargando..."; // Mensaje temporal para saber que el clic funcionó

    if (!input) {
        resBox.className = "resultado error";
        resBox.innerHTML = "⚠️ Por favor, ingresa un número de documento.";
        resBox.style.display = "block";
        return;
    }

    try {
        // 2. Intentar cargar el JSON
        // Agregamos un parámetro aleatorio (?v=...) para evitar que el navegador use una versión vieja guardada en memoria
        const resp = await fetch("consejeros.json?v=" + Math.random());
        
        if (!resp.ok) {
            throw new Error("No se pudo cargar el archivo consejeros.json. Verifica el nombre.");
        }

        const data = await resp.json();

        // 3. Buscar el documento (lo tratamos como texto para evitar errores de formato)
        const encontrado = data.find(c => String(c["No. Documento"]) === String(input));

        if (encontrado) {
            datosConsejero = encontrado;
            resBox.className = "resultado activo";
            resBox.innerHTML = `✅ <strong>${encontrado["Nombre completo"] || encontrado["Nombre"]}</strong><br>Estado: <strong>${encontrado["Estado"] || "ACTIVO"}</strong><br><small>${encontrado["Consejo"] || ""}</small>`;
            resBox.style.display = "block";
            btnPdf.style.display = "block";
            reproducirSonido("activo");
        } else {
            resBox.className = "resultado error";
            resBox.innerHTML = "❌ El número de documento no se encuentra en nuestra base de datos oficial.";
            resBox.style.display = "block";
            reproducirSonido("error");
        }
    } catch (e) {
        console.error("Error detallado:", e);
        resBox.className = "resultado error";
        resBox.innerHTML = "<b>Error técnico:</b> No se pudo leer la base de datos. <br>Asegúrate de que el archivo <u>consejeros.json</u> esté en la misma carpeta que el index.html.";
        resBox.style.display = "block";
    }
}

function reproducirSonido(tipo) {
    const audio = new Audio(`sonido_${tipo}.mp3`);
    audio.play().catch(err => console.log("Sonido bloqueado por el navegador hasta que interactúes."));
}

function generarCertificado() {
    if (!datosConsejero) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("CERTIFICADO DE CONSEJERÍA", 105, 40, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("El Sistema Distrital de Arte, Cultura y Patrimonio certifica que:", 20, 60);
    
    doc.setFont("helvetica", "bold");
    doc.text(`${datosConsejero["Nombre completo"] || datosConsejero["Nombre"]}`, 20, 75);
    doc.setFont("helvetica", "normal");
    doc.text(`Identificado con No. Documento: ${datosConsejero["No. Documento"]}`, 20, 85);
    doc.text(`Consejo: ${datosConsejero["Consejo"] || "N/A"}`, 20, 95);
    doc.text(`Sector: ${datosConsejero["Sector"] || "N/A"}`, 20, 105);
    
    const fecha = new Date().toLocaleDateString();
    doc.text(`Fecha de expedición: ${fecha}`, 20, 140);
    
    doc.save(`Certificado_${datosConsejero["No. Documento"]}.pdf`);
}
