let consejeroEncontrado = null; // Guardará los datos del consejero si existe

async function consultar() {
  const documento = document.getElementById("documento").value;
  const resultado = document.getElementById("resultado");
  const btnCertificado = document.getElementById("btnCertificado");

  // Limpiar resultados anteriores
  resultado.innerHTML = "";
  btnCertificado.style.display = "none"; // Ocultar botón por defecto
  consejeroEncontrado = null;

  try {
    const response = await fetch("consejeros.json");
    const data = await response.json();

    // Buscar consejero
    const consejero = data.find(persona => persona["No. Documento"] == documento);

    const tarjeta = document.createElement("div");
    tarjeta.classList.add("tarjeta");

    if (consejero) {
      consejeroEncontrado = consejero; // Guardamos datos para el PDF
      if (consejero.Estado.toLowerCase() === "activo") {
        tarjeta.innerHTML = `<span class="icono">✅</span>${consejero.Nombre} presenta consejería activa en el Sistema Distrital de Arte, Cultura y Patrimonio y podrá acceder a incentivos dirigidos a consejeras y consejeros del Sistema.`;
        reproducirSonido("activo");
      } else {
        tarjeta.innerHTML = `<span class="icono">⚠️</span>${consejero.Nombre} presenta consejería inactiva en el Sistema Distrital de Arte, Cultura y Patrimonio por trámite en curso de alguna de las causales del Artículo 62 del Decreto 480 de 2018. Por lo tanto, no podrá acceder a ningún incentivo dirigido a consejeras y consejeros del Sistema.`;
        reproducirSonido("inactivo");
      }
      btnCertificado.style.display = "inline-block"; // Mostrar botón solo si se encontró
    } else {
      tarjeta.innerHTML = `<span class="icono">❌</span>Su documento no hace parte de la base de datos de consejeros del Sistema Distrital de Arte, Cultura y Patrimonio.`;
      reproducirSonido("no-encontrado");
    }

    resultado.appendChild(tarjeta);

  } catch (error) {
    console.error("Error al cargar el archivo JSON:", error);
    resultado.textContent = "Ocurrió un error al cargar la base de datos.";
  }
}

function reproducirSonido(tipo) {
  let audio;
  if (tipo === "activo") {
    audio = new Audio("sonido_activo.mp3");
  } else if (tipo === "inactivo") {
    audio = new Audio("sonido_inactivo.mp3");
  } else {
    audio = new Audio("sonido_error.mp3");
  }
  audio.play();
}

// Función para generar PDF con el formato oficial e imágenes externas
function generarCertificado() {
  if (!consejeroEncontrado) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // ==== Rutas de las imágenes ====
  const encabezadoImg = "encabezado.png";
  const pieIzqImg = "piedepagina1.png";
  const pieDerImg = "piedepagina2.png";

  // ==== Encabezado ====
  const encabezadoAncho = (130 * 2) / 3; // reducido a 2/3
  const encabezadoAlto = encabezadoAncho * 0.234; 
  doc.addImage(encabezadoImg, "PNG", (210 - encabezadoAncho) / 2, 5, encabezadoAncho, encabezadoAlto);

  // ===== TÍTULO PRINCIPAL =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);

  // 10 espacios hacia abajo
  let yTitulo = encabezadoAlto + (10 * 5); // cada "enter" ~5 mm

  doc.text(
    "LA SUSCRITA DIRECTORA DE ASUNTOS LOCALES Y PARTICIPACIÓN DE LA SECRETARÍA DE",
    105,
    yTitulo,
    { align: "center" }
  );
  doc.text(
    "CULTURA, RECREACIÓN Y DEPORTE",
    105,
    yTitulo + 6,
    { align: "center" }
  );

  let y = yTitulo + 21;

  // ===== SUBTÍTULO =====
  doc.text("HACE CONSTAR QUE:", 105, y, { align: "center" });
  y += 15;

  // ===== PÁRRAFO 1 =====
  doc.setFont("helvetica", "normal");
  const parrafo1 =
    `${consejeroEncontrado.Nombre}, identificado(a) con cédula de ciudadanía número ${consejeroEncontrado["No. Documento"]}, ` +
    `surtió el proceso de elección popular establecido por el Sistema Distrital de Arte, Cultura y Patrimonio y fue elegido(a) como consejero(a) ` +
    `representante por el sector de ${consejeroEncontrado.Sector} ante el ${consejeroEncontrado.Consejo} ` +
    `por el periodo 2023-2027, según ${consejeroEncontrado.Resolución}.`;
  doc.text(parrafo1, 20, y, { maxWidth: 170, align: "justify" });
  y += 30;

  // ===== PÁRRAFO 2 =====
  const estadoTexto = consejeroEncontrado.Estado.toLowerCase() === "activo" ? "ACTIVA" : "INACTIVA";
  const parrafo2 =
    `A la fecha de expedición de la presente certificación, cuenta con Consejería ${estadoTexto}, ` +
    `en los términos de lo señalado en el artículo 17 del Decreto Distrital 336 de 2022.`;
  doc.text(parrafo2, 20, y, { maxWidth: 170, align: "justify" });
  y += 20;

  // ===== PÁRRAFO 3 =====
  const fechaHoy = new Date();
  const dia = fechaHoy.getDate();
  const mes = fechaHoy.toLocaleString("es-ES", { month: "long" });
  const año = fechaHoy.getFullYear();
  const parrafo3 =
    `La anterior certificación se expide a los ${dia} días del mes de ${mes} de ${año} por solicitud del interesado(a).`;
  doc.text(parrafo3, 20, y, { maxWidth: 170, align: "justify" });
  y += 40;

  // ===== FIRMAS =====
  doc.setFont("helvetica", "bold");
  doc.text("JULIÁN FELIPE DUARTE ÁLVAREZ", 105, y, { align: "center" });
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text("Director de Asuntos Locales y Participación", 105, y, { align: "center" });
  y += 4;
  doc.text("Secretaría de Cultura, Recreación y Deporte", 105, y, { align: "center" });
  y += 50;
   
  // ===== NOTA =====
  doc.setFont("helvetica", "bold");
  doc.text("Nota:", 20, y); // negrilla

  doc.setFont("helvetica", "normal");
  doc.text(
    "Este certificado ha sido generado automáticamente desde el portal web Radar Cultural.",
    31, // margen izquierdo
    y,  // posición vertical
    { maxWidth: 170, align: "justify" } // ancho y justificación
  );

  y += 5; // salto de línea

  doc.text(
    "Puede verificar la autenticidad del mismo a través del correo sistemaparticipacion@scrd.gov.co",
    20,
    y,
    { maxWidth: 170, align: "justify" }
  );

  // ==== Pies de página ====
  const pieIzqAncho = (80 * 2) / 3;
  const pieIzqAlto = pieIzqAncho * 0.362;
  doc.addImage(pieIzqImg, "PNG", 15, 297 - pieIzqAlto - 5, pieIzqAncho, pieIzqAlto);

  const pieDerAncho = 40 / 2;
  const pieDerAlto = pieDerAncho * 1.204;
  doc.addImage(pieDerImg, "PNG", 210 - pieDerAncho - 15, 297 - pieDerAlto - 5, pieDerAncho, pieDerAlto);

  // Guardar PDF
  doc.save(`Certificado_Consejero_${consejeroEncontrado["No. Documento"]}.pdf`);
}
