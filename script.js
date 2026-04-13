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

        let y = 60;

        // Fondo
        if (plantilla) {
            doc.addImage(plantilla, "PNG", 0, 0, width, 279);
        }

        // Datos
        const nombre = seleccionado["Nombre completo"].toUpperCase();
        const cedula = seleccionado["No. Documento"];
        const sector = seleccionado["Sector"];
        const consejo = seleccionado["Consejo"];
        const resolucion = seleccionado["Acto de reconocimiento (numero Resolución)"] 
            || "Resolución No. 551 del 28 de julio de 2023";

        const hoy = new Date();
        const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

        // =========================
        // FUNCIÓN JUSTIFICADO CORREGIDA
        // =========================
        function justificarTexto(texto, x, y, maxWidth, lineHeight) {

            const palabras = texto.split(' ');
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

                // 🔥 SOLUCIÓN: evitar espacios raros
                if (last || lp.length < 4) {
                    doc.text(lp.join(' '), x, y);
                } else {
                    const espacio = (maxWidth - doc.getTextWidth(lp.join(' '))) / (lp.length - 1);
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

        // =========================
        // ENCABEZADO
        // =========================
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);

        const encabezado = "EL SUSCRITO DIRECTOR DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE CULTURA, RECREACIÓN Y DEPORTE";

        const encLines = doc.splitTextToSize(encabezado, maxWidth);
        doc.text(encLines, width / 2, y, { align: "center" });

        y += encLines.length * 5 + 10;

        // =========================
        // TÍTULO
        // =========================
        doc.setFontSize(11);
        doc.text("HACE CONSTAR QUE:", width / 2, y, { align: "center" });

        y += 15;

        // =========================
        // CUERPO (JUSTIFICADO BIEN)
        // =========================
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);

        const textoCompleto = `${nombre}, identificado(a) con cédula de ciudadanía número ${cedula}, surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) representante por el sector de ${sector} ante el ${consejo} por el periodo 2023-2027, según ${resolucion}.
        
A la fecha de expedición de la presente certificación, cuenta con Consejería ACTIVA, en los términos de lo señalado en el artículo 155 del Decreto Distrital 649 de 2025.

La anterior certificación se expide a los ${hoy.getDate()} días del mes de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} por solicitud del interesado(a).`;

        y = justificarTexto(textoCompleto, margin, y, maxWidth, 6);

        // =========================
        // FIRMA
        // =========================
        y += 20;

        doc.setFont("helvetica", "bold");
        doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", width / 2, y, { align: "center" });

        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);

        doc.text("Director de Asuntos Locales y Participación", width / 2, y, { align: "center" });
        y += 5;
        doc.text("Secretaría de Cultura, Recreación y Deporte", width / 2, y, { align: "center" });

        // =========================
        // NOTA
        // =========================
        doc.setFontSize(6);
        doc.setTextColor(100);

        const nota = "Nota: Este certificado ha sido generado automáticamente desde el portal web Radar Cultural. Puede verificar la autenticidad del mismo a través del correo sistemaparticipacion@scrd.gov.co";

        doc.text(doc.splitTextToSize(nota, maxWidth), margin, 230);

        // =========================
        // DESCARGAR Y LIMPIAR
        // =========================
        doc.save(`Certificado_${cedula}.pdf`);
        limpiarFormulario();

    } catch (error) {
        console.error("❌ Error generando PDF:", error);
        alert("Error generando el certificado.");
    }
}
