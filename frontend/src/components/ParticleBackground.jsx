import React, { useCallback } from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

export default function ParticleBackground() {
  // Initialize the engine
  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      className="absolute inset-0 z-0 pointer-events-none"
      options={{
        fullScreen: { enable: false }, // Keeps it constrained to its parent div
        background: {
          color: { value: "transparent" },
        },
        fpsLimit: 60,
        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: "grab", // Creates a magnetic effect when mouse hovers
            },
            resize: true,
          },
          modes: {
            grab: {
              distance: 150,
              links: { opacity: 0.5 },
            },
          },
        },
        particles: {
          color: {
            value: "#818cf8", // Indigo colors (Dark mode default)
          },
          links: {
            color: "#4f46e5",
            distance: 150,
            enable: true,
            opacity: 0.2,
            width: 1,
          },
          move: {
            direction: "none",
            enable: true,
            outModes: { default: "bounce" }, // Dots bounce off the edges
            random: false,
            speed: 1, // Slow, elegant movement
            straight: false,
          },
          number: {
            density: { enable: true, area: 800 },
            value: 80, // Number of dots
          },
          opacity: {
            value: 0.5,
          },
          shape: {
            type: "circle",
          },
          size: {
            value: { min: 1, max: 3 },
          },
        },
        detectRetina: true,
      }}
    />
  );
}