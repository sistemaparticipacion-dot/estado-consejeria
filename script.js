let datosConsejero = null;

async function consultar() {
    const input = document.getElementById("documento").value.trim();
    const resBox = document.getElementById("resBox");
    const btnPdf = document.getElementById("btnCertificado");

    // Limpiar siempre al inicio
    resBox.style.display = "none";
    btnPdf.style.display = "none";

    if (!input) return;

    try {
        const resp = await fetch("consejeros.json");
        const data = await resp.json();

        // Buscar el consejero
        const encontrado = data.find(c => String(c["No. Documento"]) === input);

        if (encontrado) {
            datosConsejero = encontrado;
            resBox.className = "resultado activo";
            resBox.innerHTML = `✅ <strong>${encontrado["Nombre completo"] || encontrado["Nombre"]}</strong><br>Estado: ACTIVO`;
            resBox.style.display = "block";
            btnPdf.style.display = "block";
            reproducirSonido("activo");
        } else {
            resBox.className = "resultado error";
            resBox.innerHTML = "❌ No se encontró el documento en la base de datos.";
            resBox.style.display = "block";
            reproducirSonido("error");
        }
    } catch (e) {
        console.error(e);
        alert("Error cargando la base de datos. Verifica que consejeros.json esté en la carpeta.");
    }
}

function reproducirSonido(tipo) {
    const audio = new Audio(`sonido_${tipo}.mp3`);
    audio.play().catch(() => {});
}

function generarCertificado() {
    if (!datosConsejero) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("CERTIFICADO OFICIAL", 105, 40, { align: "center" });
    doc.setFontSize(14);
    doc.text(`Nombre: ${datosConsejero["Nombre completo"] || datosConsejero["Nombre"]}`, 20, 60);
    doc.text(`Documento: ${datosConsejero["No. Documento"]}`, 20, 75);
    doc.text(`Consejo: ${datosConsejero["Consejo"]}`, 20, 90);
    
    doc.save(`Certificado_${datosConsejero["No. Documento"]}.pdf`);
}
