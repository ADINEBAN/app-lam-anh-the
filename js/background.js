(() => {
  let vantaEffect = null;

  function initVantaBackground() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;
    if (!window.VANTA || typeof window.VANTA.BIRDS !== "function") return;

    const isMobile = window.matchMedia("(max-width: 640px)").matches;

    vantaEffect = window.VANTA.BIRDS({
      el: "#vanta-bg",
      mouseControls: !isMobile,
      touchControls: false,
      gyroControls: false,
      minHeight: 200.0,
      minWidth: 200.0,
      scale: 1.0,
      scaleMobile: 1.0,
      backgroundColor: 0xf4f8fc,
      backgroundAlpha: 0,
      color1: 0x1687ff,
      color2: 0xff8a3d,
      colorMode: "varianceGradient",
      birdSize: isMobile ? 0.85 : 1.05,
      wingSpan: isMobile ? 22.0 : 28.0,
      speedLimit: isMobile ? 3.0 : 4.0,
      separation: 34.0,
      alignment: 42.0,
      cohesion: 28.0,
      quantity: isMobile ? 2.2 : 3.4,
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    try {
      initVantaBackground();
    } catch (error) {
      console.warn("Không tải được nền Vanta BIRDS, vẫn giữ nền kính tĩnh.", error);
    }
  });

  window.addEventListener("beforeunload", () => {
    if (vantaEffect && typeof vantaEffect.destroy === "function") {
      vantaEffect.destroy();
    }
  });
})();
