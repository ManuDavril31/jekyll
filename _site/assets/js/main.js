pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

const container = document.getElementById("pdf-container");
const btnNextPage = document.querySelector("#btnNextPage");
let campos = [];
let originalPdfBytes = null;
let currentCanvas = null;
let currentPage = 1;
let numPagesPDF = 0;
let pdfDoc = null;

// Cargar PDF por defecto al iniciar (solo una vez)
async function cargarPDFPorDefecto(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  originalPdfBytes = arrayBuffer.slice(0);

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  pdfDoc = await loadingTask.promise;
  numPagesPDF = pdfDoc.numPages;

  mostrarTodasLasPaginas();
}

async function mostrarTodasLasPaginas() {
  const contenedor = document.getElementById("pdf-container");
  contenedor.innerHTML = "";

  for (let pageNum = 1; pageNum <= numPagesPDF; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    contenedor.appendChild(canvas);
  }
}

document.getElementById("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file || file.type !== "application/pdf") {
    alert("Selecciona un archivo PDF válido.");
    return;
  }

  const arrayBuffer = await file.arrayBuffer();
  originalPdfBytes = arrayBuffer.slice(0);

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const scale = 1.5;
  container.innerHTML = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext);

    container.appendChild(canvas);
  }
});

function crearCampo() {
  const inputWrapper = document.createElement("div");
  inputWrapper.style.position = "absolute";
  inputWrapper.style.display = "flex";
  inputWrapper.style.flexDirection = "column";
  inputWrapper.style.alignItems = "flex-start";
  inputWrapper.style.top = `${window.scrollY + window.innerHeight / 6}px`;
  inputWrapper.style.left = `${window.scrollX + window.innerWidth / 3}px`;
  inputWrapper.style.transform = "translate(-50%, -50%)";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "dynamic-input";
  input.placeholder = "Texto";
  input.style.fontWeight = "600";

  const span = document.createElement("span");
  span.className = "hidden-span";
  document.body.appendChild(span);

  input.addEventListener("input", () => {
    span.textContent = input.value || "";
    span.style.font = window.getComputedStyle(input).font;
    input.style.width = span.offsetWidth + 10 + "px";
  });

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  inputWrapper.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
    inputWrapper.style.zIndex = 1000;

    inputWrapper.addEventListener("keydown", (event) => {
      const step = 1;
      const currentTop = parseInt(inputWrapper.style.top) || 0;
      const currentLeft = parseInt(inputWrapper.style.left) || 0;
      switch (event.key) {
        case "ArrowUp":
          inputWrapper.style.top = currentTop - step + "px";
          break;
        case "ArrowDown":
          inputWrapper.style.top = currentTop + step + "px";
          break;
        case "ArrowLeft":
          inputWrapper.style.left = currentLeft - step + "px";
          break;
        case "ArrowRight":
          inputWrapper.style.left = currentLeft + step + "px";
          break;
      }
    });
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      inputWrapper.style.left = e.pageX - container.offsetLeft - offsetX + "px";
      inputWrapper.style.top = e.pageY - container.offsetTop - offsetY + "px";
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  const trash = document.createElement("p");
  trash.textContent = "🗑️";
  trash.style.opacity = 0.3;
  trash.style.cursor = "pointer";
  trash.style.margin = "2px 0 0";
  trash.style.position = "absolute";
  trash.style.left = "-28px";

  trash.addEventListener("click", () => {
    inputWrapper.remove();
  });

  trash.addEventListener("mouseenter", () => {
    trash.style.opacity = 1;
  });

  trash.addEventListener("mouseleave", () => {
    trash.style.opacity = 0.3;
  });

  inputWrapper.appendChild(input);
  inputWrapper.appendChild(trash);

  container.appendChild(inputWrapper);
  campos.push(inputWrapper);
  input.focus();
}

// Descargar PDF
async function descargarPDF() {
  if (!originalPdfBytes) {
    alert("Primero carga un PDF.");
    return;
  }

  const pdfDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();

  const canvas = container.querySelector("canvas");
  const canvasRect = canvas.getBoundingClientRect();

  for (let campo of campos) {
    const input = campo.querySelector("input");

    if (
      !input ||
      typeof input.value !== "string" ||
      input.value.trim() === ""
    ) {
      continue;
    }

    const inputRect = campo.getBoundingClientRect();
    const pageHeightPx = canvas.height;
    const pageIndex = Math.floor(
      (campo.offsetTop + campo.offsetHeight / 2) / pageHeightPx
    );
    const page = pages[pageIndex];
    if (!page) continue;

    const { width, height } = page.getSize();
    const relX = inputRect.left - canvasRect.left;
    const relY = inputRect.top - canvasRect.top - pageIndex * canvas.height;
    const scaleX = width / canvas.width;
    const scaleY = height / canvas.height;
    const pdfX = relX * scaleX;
    const pdfY = height - relY * scaleY - 12;
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    page.drawText(input.value, {
      x: pdfX,
      y: pdfY,
      size: 12,
      font: font,
      color: PDFLib.rgb(0, 0, 0),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "modificado.pdf";
  link.click();
}

window.addEventListener("DOMContentLoaded", () => {
  cargarPDFPorDefecto("/assets/pdf/documento.pdf");
});
