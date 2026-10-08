(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  async function initParticles() {
    if (!window.tsParticles || typeof window.loadSlim !== "function") return;

    const isMobile = window.matchMedia("(max-width: 640px)").matches;

    await window.loadSlim(window.tsParticles);
    await window.tsParticles.load({
      id: "tsparticles",
      options: {
        autoPlay: !prefersReducedMotion,
        background: {
          color: { value: "transparent" },
        },
        detectRetina: true,
        fpsLimit: 60,
        fullScreen: {
          enable: true,
          zIndex: 0,
        },
        interactivity: {
          detectsOn: "window",
          events: {
            onHover: {
              enable: !prefersReducedMotion && !isMobile,
              mode: "grab",
            },
            resize: { enable: true },
          },
          modes: {
            grab: {
              distance: 150,
              links: { opacity: 0.45 },
            },
          },
        },
        particles: {
          color: {
            value: ["#ff8a3d", "#1687ff", "#22c9b6", "#7c5cff"],
          },
          links: {
            enable: true,
            color: "#7aa7d9",
            distance: isMobile ? 105 : 135,
            opacity: 0.32,
            width: 1,
          },
          move: {
            enable: !prefersReducedMotion,
            direction: "none",
            outModes: { default: "out" },
            random: true,
            speed: isMobile ? 0.38 : 0.55,
            straight: false,
          },
          number: {
            density: { enable: true, width: 900, height: 900 },
            value: isMobile ? 42 : 78,
          },
          opacity: {
            value: { min: 0.25, max: 0.78 },
            animation: {
              enable: !prefersReducedMotion,
              speed: 0.55,
              sync: false,
            },
          },
          shape: { type: "circle" },
          size: {
            value: { min: 1, max: 3 },
            animation: {
              enable: !prefersReducedMotion,
              speed: 1.4,
              sync: false,
            },
          },
        },
        pauseOnBlur: true,
        pauseOnOutsideViewport: true,
      },
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    initParticles().catch((error) => {
      console.warn("Không tải được nền hạt động, vẫn giữ nền kính tĩnh.", error);
    });
  });
})();
