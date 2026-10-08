const SIZES = {
  "3x4": { label: "3 x 4 cm", width: 354, height: 472 },
  "4x6": { label: "4 x 6 cm", width: 472, height: 709 },
  "2x3": { label: "2 x 3 cm", width: 236, height: 354 },
  passport: { label: "Hộ chiếu 35 x 45 mm", width: 413, height: 531 },
};

const BACKGROUNDS = {
  original: null,
  white: "#ffffff",
  blue: "#2f6db3",
  transparent: null,
};

const elements = {
  fileInput: document.querySelector("#fileInput"),
  removeBgBtn: document.querySelector("#removeBgBtn"),
  bgStatus: document.querySelector("#bgStatus"),
  sizeSelect: document.querySelector("#sizeSelect"),
  zoomRange: document.querySelector("#zoomRange"),
  zoomValue: document.querySelector("#zoomValue"),
  resetPositionBtn: document.querySelector("#resetPositionBtn"),
  brightnessRange: document.querySelector("#brightnessRange"),
  contrastRange: document.querySelector("#contrastRange"),
  saturationRange: document.querySelector("#saturationRange"),
  brightnessValue: document.querySelector("#brightnessValue"),
  contrastValue: document.querySelector("#contrastValue"),
  saturationValue: document.querySelector("#saturationValue"),
  autoEnhanceBtn: document.querySelector("#autoEnhanceBtn"),
  resetLightBtn: document.querySelector("#resetLightBtn"),
  downloadPngBtn: document.querySelector("#downloadPngBtn"),
  downloadJpgBtn: document.querySelector("#downloadJpgBtn"),
  canvas: document.querySelector("#previewCanvas"),
  emptyState: document.querySelector("#emptyState"),
  outputInfo: document.querySelector("#outputInfo"),
  bgButtons: [...document.querySelectorAll("[data-bg]")],
};

const state = {
  originalImage: null,
  processedImage: null,
  background: "white",
  backgroundRemoved: false,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  startOffsetX: 0,
  startOffsetY: 0,
};

function currentImage() {
  return state.processedImage || state.originalImage;
}

function currentSize() {
  return SIZES[elements.sizeSelect.value] || SIZES["3x4"];
}

function setStatus(message) {
  elements.bgStatus.textContent = message;
}

function updateControls() {
  const hasImage = Boolean(currentImage());
  elements.removeBgBtn.disabled = !state.originalImage || state.backgroundRemoved;
  elements.downloadPngBtn.disabled = !hasImage;
  elements.downloadJpgBtn.disabled = !hasImage;
  elements.emptyState.classList.toggle("hidden", hasImage);

  elements.zoomValue.textContent = `${elements.zoomRange.value}%`;
  elements.brightnessValue.textContent = `${elements.brightnessRange.value}%`;
  elements.contrastValue.textContent = `${elements.contrastRange.value}%`;
  elements.saturationValue.textContent = `${elements.saturationRange.value}%`;

  const size = currentSize();
  elements.outputInfo.textContent = `Kích thước xuất: ${size.width} x ${size.height} px — ${size.label}`;
}

function drawToCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const size = currentSize();
  canvas.width = size.width;
  canvas.height = size.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bgColor = BACKGROUNDS[state.background];
  const useBackground = state.backgroundRemoved && bgColor;
  if (useBackground) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const image = currentImage();
  if (!image) return;

  const brightness = Number(elements.brightnessRange.value);
  const contrast = Number(elements.contrastRange.value);
  const saturation = Number(elements.saturationRange.value);

  ctx.save();
  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const baseScale = Math.max(canvas.width / imageWidth, canvas.height / imageHeight);
  const scale = baseScale * state.zoom;
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const x = (canvas.width - drawWidth) / 2 + state.offsetX;
  const y = (canvas.height - drawHeight) / 2 + state.offsetY;

  ctx.drawImage(image, x, y, drawWidth, drawHeight);
  ctx.restore();
}

function render() {
  drawToCanvas(elements.canvas);
  updateControls();
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = reject;
    image.src = url;
  });
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function handleFileChange(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  try {
    const { image } = await loadImageFromFile(file);
    state.originalImage = image;
    state.processedImage = null;
    state.backgroundRemoved = false;
    state.zoom = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    elements.zoomRange.value = 100;
    setStatus("Đã tải ảnh. Bạn có thể xoá phông rồi chọn nền trắng/xanh, hoặc chỉnh sáng trực tiếp.");
    render();
  } catch {
    setStatus("Không đọc được file ảnh này, bạn thử ảnh khác nhé.");
  }
}

async function handleRemoveBackground() {
  const file = elements.fileInput.files?.[0];
  if (!file) return;

  elements.removeBgBtn.disabled = true;
  setStatus("Đang xoá phông... Lần đầu có thể hơi lâu vì trình duyệt cần tải model.");

  try {
    const module = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm");
    const removeBackground = module.removeBackground || module.default;
    if (typeof removeBackground !== "function") {
      throw new Error("Background removal function is unavailable");
    }

    const blob = await removeBackground(file, {
      output: { format: "image/png", quality: 1 },
    });
    state.processedImage = await loadImageFromBlob(blob);
    state.backgroundRemoved = true;
    if (state.background === "original") state.background = "white";
    syncBackgroundButtons();
    setStatus("Đã xoá phông xong. Giờ bạn chọn phông trắng hoặc phông xanh ở phía trên.");
    render();
  } catch (error) {
    console.error(error);
    setStatus("Chưa xoá phông được. Kiểm tra mạng ở lần tải model đầu tiên, hoặc thử lại với ảnh rõ mặt hơn.");
    updateControls();
  }
}

function syncBackgroundButtons() {
  elements.bgButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.bg === state.background);
  });
}

function resetPosition() {
  state.zoom = 1;
  state.offsetX = 0;
  state.offsetY = 0;
  elements.zoomRange.value = 100;
  render();
}

function resetLight() {
  elements.brightnessRange.value = 100;
  elements.contrastRange.value = 100;
  elements.saturationRange.value = 100;
  render();
}

function autoEnhance() {
  elements.brightnessRange.value = 108;
  elements.contrastRange.value = 112;
  elements.saturationRange.value = 106;
  render();
}

function download(type) {
  const exportCanvas = document.createElement("canvas");
  drawToCanvas(exportCanvas);

  const mime = type === "jpg" ? "image/jpeg" : "image/png";
  const extension = type === "jpg" ? "jpg" : "png";
  exportCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `anh-the-${elements.sizeSelect.value}.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, mime, 0.95);
}

function canvasPoint(event) {
  const rect = elements.canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (elements.canvas.width / rect.width),
    y: (event.clientY - rect.top) * (elements.canvas.height / rect.height),
  };
}

elements.fileInput.addEventListener("change", handleFileChange);
elements.removeBgBtn.addEventListener("click", handleRemoveBackground);
elements.sizeSelect.addEventListener("change", render);
elements.zoomRange.addEventListener("input", () => {
  state.zoom = Number(elements.zoomRange.value) / 100;
  render();
});
elements.resetPositionBtn.addEventListener("click", resetPosition);
[elements.brightnessRange, elements.contrastRange, elements.saturationRange].forEach((input) => {
  input.addEventListener("input", render);
});
elements.autoEnhanceBtn.addEventListener("click", autoEnhance);
elements.resetLightBtn.addEventListener("click", resetLight);
elements.downloadPngBtn.addEventListener("click", () => download("png"));
elements.downloadJpgBtn.addEventListener("click", () => download("jpg"));

elements.bgButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.background = button.dataset.bg;
    syncBackgroundButtons();
    if ((state.background === "white" || state.background === "blue") && !state.backgroundRemoved) {
      setStatus("Muốn nền trắng/xanh phủ kín phía sau người, bạn bấm “Xoá phông tự động” trước nhé.");
    }
    render();
  });
});

elements.canvas.addEventListener("pointerdown", (event) => {
  if (!currentImage()) return;
  const point = canvasPoint(event);
  state.dragging = true;
  state.dragStartX = point.x;
  state.dragStartY = point.y;
  state.startOffsetX = state.offsetX;
  state.startOffsetY = state.offsetY;
  elements.canvas.setPointerCapture(event.pointerId);
});

elements.canvas.addEventListener("pointermove", (event) => {
  if (!state.dragging) return;
  const point = canvasPoint(event);
  state.offsetX = state.startOffsetX + point.x - state.dragStartX;
  state.offsetY = state.startOffsetY + point.y - state.dragStartY;
  render();
});

elements.canvas.addEventListener("pointerup", () => { state.dragging = false; });
elements.canvas.addEventListener("pointercancel", () => { state.dragging = false; });

syncBackgroundButtons();
render();
