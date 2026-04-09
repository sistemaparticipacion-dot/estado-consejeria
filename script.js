let consejeroEncontrado = null;

async function consultar() {
    const docInput = document.getElementById("documento").value.trim();
    const resDiv = document.getElementById("resultado");
    const btnPdf = document.getElementById("btnCertificado");

    // Limpiar pantalla
    resDiv.className = "res-box";
    resDiv.innerHTML = "";
    btnPdf.style.display = "none";
    consejeroEncontrado = null;

    if (!docInput) {
        resDiv.classList.add("res-inactivo");
        resDiv.innerHTML = "Por favor, escribe un número de documento.";
        return;
    }

    try {
        const response = await fetch("consejeros.json");
        const data = await response.json();

        // Buscar por documento (No. Documento)
        const consejero = data.find(p => String(p["No. Documento"]) === docInput);

        if (consejero) {
            consejeroEncontrado = consejero;
            // Detectar nombre sin importar si es "Nombre" o "Nombre completo"
            const nombre = consejero["Nombre completo"] || consejero["Nombre"] || "Consejero/a";
            // Detectar estado
            const estado = (consejero["Estado"] || "Activo").toLowerCase();

            if (estado === "activo") {
                resDiv.classList.add("res-activo");
                resDiv.innerHTML = `✅ <strong>${nombre}</strong>: Su estado es ACTIVO. Ya puede descargar su certificado.`;
                btnPdf.style.display = "block";
                reproducirSonido("activo");
            } else {
                resDiv.classList.add("res-inactivo");
                resDiv.innerHTML = `⚠️ <strong>${nombre}</strong>: Su estado es INACTIVO actualmente.`;
                reproducirSonido("inactivo");
            }
        } else {
            resDiv.classList.add("res-error");
            resDiv.innerHTML = "❌ No se encontró ningún registro con ese número.";
            reproducirSonido("error");
        }
    } catch (e) {
        resDiv.classList.add("res-error");
        resDiv.innerHTML = "Error al conectar con la base de datos.";
        console.error(e);
    }
}

function reproducirSonido(tipo) {
    const audio = new Audio(`sonido_${tipo}.mp3`);
    audio.play().catch(() => console.log("Audio bloqueado por el navegador"));
}

async function generarCertificado() {
    if (!consejeroEncontrado) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const nombre = consejeroEncontrado["Nombre completo"] || consejeroEncontrado["Nombre"];
    const id = consejeroEncontrado["No. Documento"];
    const consejo = consejeroEncontrado["Consejo"] || "N/A";
    const sector = consejeroEncontrado["Sector"] || "N/A";

    // Estilo PDF sencillo pero elegante
    doc.setFontSize(22);
    doc.setTextColor(0, 51, 102);
    doc.text("CERTIFICADO DE CONSEJERÍA", 105, 40, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`La Secretaría de Cultura certifica que:`, 20, 60);
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(nombre.toUpperCase(), 105, 75, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Identificado(a) con No: ${id}`, 105, 85, { align: "center" });
    
    doc.text(`Forma parte activa del:`, 20, 105);
    doc.setFont("helvetica", "bold");
    doc.text(consejo, 20, 115);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Sector representado: ${sector}`, 20, 125);
    
    doc.setFontSize(10);
    const fecha = new Date().toLocaleDateString();
    doc.text(`Fecha de expedición: ${fecha}`, 20, 150);

    doc.save(`Certificado_${id}.pdf`);
}
