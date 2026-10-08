(() => {
  let vantaEffect = null;

  function initVantaBackground() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;
    if (!window.VANTA || typeof window.VANTA.NET !== "function") return;

    const isMobile = window.matchMedia("(max-width: 640px)").matches;

    vantaEffect = window.VANTA.NET({
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
      color: 0x1687ff,
      points: isMobile ? 7.0 : 10.0,
      maxDistance: isMobile ? 18.0 : 22.0,
      spacing: isMobile ? 22.0 : 18.0,
      showDots: true,
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    try {
      initVantaBackground();
    } catch (error) {
      console.warn("Không tải được nền Vanta, vẫn giữ nền kính tĩnh.", error);
    }
  });

  window.addEventListener("beforeunload", () => {
    if (vantaEffect && typeof vantaEffect.destroy === "function") {
      vantaEffect.destroy();
    }
  });
})();
