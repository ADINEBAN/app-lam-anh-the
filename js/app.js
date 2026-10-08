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

const REMOVAL_MODES = {
  fast: {
    label: "Nhanh",
    model: "isnet_quint8",
    maxDimension: 1024,
  },
  quality: {
    label: "Chất lượng",
    model: "isnet_fp16",
    maxDimension: 1600,
  },
};

let backgroundRemovalModulePromise = null;
let progressValue = 0;
let progressTimer = null;

const elements = {
  fileInput: document.querySelector("#fileInput"),
  removeBgBtn: document.querySelector("#removeBgBtn"),
  removalMode: document.querySelector("#removalMode"),
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
  canvasWrap: document.querySelector("#canvasWrap"),
  processingOverlay: document.querySelector("#processingOverlay"),
  processingPercent: document.querySelector("#processingPercent"),
  progressWrap: document.querySelector("#progressWrap"),
  progressTrack: document.querySelector("#progressTrack"),
  progressBar: document.querySelector("#progressBar"),
  progressPercent: document.querySelector("#progressPercent"),
  progressLabel: document.querySelector("#progressLabel"),
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

function setProgress(value, label = "Đang xoá phông") {
  progressValue = Math.max(0, Math.min(100, Math.round(value)));
  elements.progressWrap.hidden = false;
  elements.progressLabel.textContent = label;
  elements.progressPercent.textContent = `${progressValue}%`;
  elements.processingPercent.textContent = `${progressValue}%`;
  elements.progressBar.style.width = `${progressValue}%`;
  elements.progressTrack.setAttribute("aria-valuenow", String(progressValue));
}

function startProgress(label) {
  stopProgress(false);
  setProgress(0, label);
  elements.canvasWrap.classList.add("is-processing");
  elements.processingOverlay.setAttribute("aria-hidden", "false");

  // The library reports download progress, but inference may not emit steady
  // events. Creep slowly towards 90% so the bar still feels alive.
  progressTimer = setInterval(() => {
    if (progressValue < 90) {
      setProgress(progressValue + Math.max(1, Math.round((90 - progressValue) * 0.035)), label);
    }
  }, 350);
}

function updateReportedProgress(current, total, label) {
  if (!total) return;
  const reported = (current / total) * 100;
  if (reported > progressValue) setProgress(Math.min(92, reported), label);
}

function stopProgress(reset = true) {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
  elements.canvasWrap.classList.remove("is-processing");
  elements.processingOverlay.setAttribute("aria-hidden", "true");
  if (reset) {
    progressValue = 0;
    elements.progressWrap.hidden = true;
    elements.progressBar.style.width = "0%";
    elements.progressPercent.textContent = "0%";
    elements.processingPercent.textContent = "0%";
    elements.progressTrack.setAttribute("aria-valuenow", "0");
  }
}

function finishProgress(label = "Đã xoá phông") {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
  setProgress(100, label);
  elements.canvasWrap.classList.remove("is-processing");
  elements.processingOverlay.setAttribute("aria-hidden", "true");
  setTimeout(() => stopProgress(true), 900);
}

function updateControls() {
  const hasImage = Boolean(currentImage());
  elements.removeBgBtn.disabled = !state.originalImage;
  elements.removeBgBtn.textContent = state.backgroundRemoved
    ? "Xoá phông lại theo chế độ đã chọn"
    : "Xoá phông tự động";
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
    stopProgress(true);
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

function loadBackgroundRemovalModule() {
  if (!backgroundRemovalModulePromise) {
    backgroundRemovalModulePromise = import(
      "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm"
    );
  }
  return backgroundRemovalModulePromise;
}

async function createWorkingBlob(file, maxDimension) {
  const image = state.originalImage;
  if (!image) return file;

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const maxSide = Math.max(width, height);
  if (maxSide <= maxDimension) return file;

  const scale = maxDimension / maxSide;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.92));
  return blob || file;
}

async function handleRemoveBackground() {
  const file = elements.fileInput.files?.[0];
  if (!file) return;

  const mode = REMOVAL_MODES[elements.removalMode.value] || REMOVAL_MODES.fast;
  elements.removeBgBtn.disabled = true;
  elements.removalMode.disabled = true;
  startProgress(`Đang xoá phông (${mode.label})`);
  setProgress(2, `Đang xoá phông (${mode.label})`);
  setStatus(`Đang chuẩn bị chế độ ${mode.label.toLowerCase()}...`);

  try {
    const module = await loadBackgroundRemovalModule();
    const removeBackground = module.removeBackground || module.default;
    if (typeof removeBackground !== "function") {
      throw new Error("Background removal function is unavailable");
    }

    const workingBlob = await createWorkingBlob(file, mode.maxDimension);
    const supportsGpu = Boolean(navigator.gpu);
    const makeConfig = (device) => ({
      model: mode.model,
      device,
      output: { format: "image/png", quality: 1, type: "foreground" },
      progress: (key, current, total) => {
        updateReportedProgress(current, total, `Đang xoá phông (${mode.label})`);
        if (total) {
          const percent = Math.min(99, Math.round((current / total) * 100));
          setStatus(`Đang xoá phông (${mode.label}): ${percent}%`);
        }
      },
    });

    let blob;
    try {
      blob = await removeBackground(workingBlob, makeConfig(supportsGpu ? "gpu" : "cpu"));
    } catch (gpuError) {
      if (!supportsGpu) throw gpuError;
      console.warn("GPU background removal failed, retrying with CPU", gpuError);
      setProgress(Math.max(progressValue, 45), "Đang chuyển sang CPU");
      setStatus("GPU chưa dùng được, đang chuyển sang CPU...");
      blob = await removeBackground(workingBlob, makeConfig("cpu"));
    }

    state.processedImage = await loadImageFromBlob(blob);
    state.backgroundRemoved = true;
    if (state.background === "original") state.background = "white";
    syncBackgroundButtons();
    finishProgress("Đã xoá phông");
    setStatus(`Đã xoá phông xong bằng chế độ ${mode.label}. Giờ bạn chọn phông trắng hoặc phông xanh ở phía trên.`);
    render();
  } catch (error) {
    console.error(error);
    stopProgress(true);
    setStatus("Chưa xoá phông được. Kiểm tra mạng ở lần tải model đầu tiên, hoặc thử lại với ảnh rõ mặt hơn.");
    updateControls();
  } finally {
    elements.removeBgBtn.disabled = !state.originalImage;
    elements.removalMode.disabled = false;
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
elements.removalMode.addEventListener("change", () => {
  if (!state.originalImage) return;
  const mode = REMOVAL_MODES[elements.removalMode.value] || REMOVAL_MODES.fast;
  setStatus(state.backgroundRemoved
    ? `Đã chọn chế độ ${mode.label}. Bấm “Xoá phông lại” để áp dụng.`
    : `Đã chọn chế độ ${mode.label}. Bấm “Xoá phông tự động” để bắt đầu.`);
});
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
