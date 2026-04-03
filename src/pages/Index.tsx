import { useEffect, useRef } from "react";

declare global {
  interface Window {
    Holistic: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
    FACEMESH_TESSELATION: any;
    FACEMESH_RIGHT_EYE: any;
    FACEMESH_LEFT_EYE: any;
    FACEMESH_RIGHT_EYEBROW: any;
    FACEMESH_LEFT_EYEBROW: any;
    FACEMESH_FACE_OVAL: any;
    FACEMESH_LIPS: any;
    FACEMESH_RIGHT_IRIS: any;
    FACEMESH_LEFT_IRIS: any;
  }
}

const Index = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const narutoRef = useRef<HTMLVideoElement>(null);
  const sasukeRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const vElement = videoRef.current!;
    const cElement = canvasRef.current!;
    const ctx = cElement.getContext("2d")!;
    const n = narutoRef.current!;
    const s = sasukeRef.current!;

    let pwr = [0, 0];
    let wasOpen = [false, false];

    function checkOpen(pts: any[]) {
      let count = 0;
      const wrist = pts[0];
      const tips = [8, 12, 16, 20];
      const pips = [6, 10, 14, 18];
      for (let i = 0; i < tips.length; i++) {
        const tip = pts[tips[i]];
        const pip = pts[pips[i]];
        if (
          Math.hypot(tip.x - wrist.x, tip.y - wrist.y) >
          Math.hypot(pip.x - wrist.x, pip.y - wrist.y)
        )
          count++;
      }
      return count >= 3;
    }

    function drawFace(landmarks: any[]) {
      ctx.save();
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#00fbff";

      window.drawConnectors(ctx, landmarks, window.FACEMESH_TESSELATION, {
        color: "#00d4ff10",
        lineWidth: 0.5,
      });
      window.drawConnectors(ctx, landmarks, window.FACEMESH_FACE_OVAL, {
        color: "#00d4ff",
        lineWidth: 1.5,
      });
      window.drawConnectors(ctx, landmarks, window.FACEMESH_RIGHT_EYE, {
        color: "#ff4444",
        lineWidth: 1.5,
      });
      window.drawConnectors(ctx, landmarks, window.FACEMESH_LEFT_EYE, {
        color: "#ff4444",
        lineWidth: 1.5,
      });
      window.drawConnectors(ctx, landmarks, window.FACEMESH_RIGHT_EYEBROW, {
        color: "#00fbff",
        lineWidth: 1,
      });
      window.drawConnectors(ctx, landmarks, window.FACEMESH_LEFT_EYEBROW, {
        color: "#00fbff",
        lineWidth: 1,
      });
      window.drawConnectors(ctx, landmarks, window.FACEMESH_LIPS, {
        color: "#ff6600",
        lineWidth: 1.5,
      });
      if (window.FACEMESH_RIGHT_IRIS) {
        window.drawConnectors(ctx, landmarks, window.FACEMESH_RIGHT_IRIS, {
          color: "#ff0000",
          lineWidth: 1,
        });
      }
      if (window.FACEMESH_LEFT_IRIS) {
        window.drawConnectors(ctx, landmarks, window.FACEMESH_LEFT_IRIS, {
          color: "#ff0000",
          lineWidth: 1,
        });
      }
      ctx.restore();
    }

    function processHand(
      pts: any[],
      isR: boolean,
      idx: number
    ) {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00fbff";
      window.drawConnectors(ctx, pts, window.HAND_CONNECTIONS, {
        color: "#00d4ff",
        lineWidth: 3,
      });
      window.drawLandmarks(ctx, pts, {
        color: "#ffffff",
        lineWidth: 1,
        radius: 2,
      });
      ctx.restore();

      const open = checkOpen(pts);
      pwr[idx] += open ? 0.05 : -0.15;
      pwr[idx] = Math.max(0, Math.min(1, pwr[idx]));

      if (open && !wasOpen[idx]) {
        const vid = isR ? s : n;
        vid.currentTime = 0;
        vid.play();
      }
      wasOpen[idx] = open;

      const wrist = pts[0];
      const knk = pts[9];

      if (pwr[idx] > 0.01) {
        if (isR) {
          const tx = (wrist.x + knk.x) / 2;
          const ty = (wrist.y + knk.y) / 2;
          s.style.left = `${(1 - tx) * window.innerWidth}px`;
          s.style.top = `${ty * window.innerHeight}px`;
          s.style.display = "block";
          s.style.opacity = String(pwr[idx]);
          return "R";
        } else {
          const dx = knk.x - wrist.x;
          const dy = knk.y - wrist.y;
          const tx = knk.x + dx * 0.8;
          const ty = knk.y + dy * 0.8;
          n.style.left = `${(1 - tx) * window.innerWidth}px`;
          n.style.top = `${ty * window.innerHeight - 120}px`;
          n.style.display = "block";
          n.style.opacity = String(pwr[idx]);
          return "L";
        }
      }
      return null;
    }

    function onResults(res: any) {
      cElement.width = vElement.videoWidth;
      cElement.height = vElement.videoHeight;
      ctx.save();
      ctx.clearRect(0, 0, cElement.width, cElement.height);

      // Draw face
      if (res.faceLandmarks) {
        drawFace(res.faceLandmarks);
      }

      let fL = false;
      let fR = false;
      n.style.display = "none";
      s.style.display = "none";

      // Holistic gives leftHandLandmarks and rightHandLandmarks
      // Note: holistic labels are from the person's perspective
      if (res.rightHandLandmarks) {
        const side = processHand(res.rightHandLandmarks, false, 0);
        if (side === "L") fL = true;
      }
      if (res.leftHandLandmarks) {
        const side = processHand(res.leftHandLandmarks, true, 1);
        if (side === "R") fR = true;
      }

      if (!fL) {
        pwr[0] = Math.max(0, pwr[0] - 0.15);
        if (pwr[0] > 0.01) {
          n.style.display = "block";
          n.style.opacity = String(pwr[0]);
        }
        wasOpen[0] = false;
      }
      if (!fR) {
        pwr[1] = Math.max(0, pwr[1] - 0.15);
        if (pwr[1] > 0.01) {
          s.style.display = "block";
          s.style.opacity = String(pwr[1]);
        }
        wasOpen[1] = false;
      }
      ctx.restore();
    }

    const holistic = new window.Holistic({
      locateFile: (f: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${f}`,
    });

    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      refineFaceLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    holistic.onResults(onResults);

    const cam = new window.Camera(vElement, {
      onFrame: async () => {
        await holistic.send({ image: vElement });
      },
      width: 1280,
      height: 720,
    });
    cam.start();

    return () => {
      cam.stop?.();
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
        style={{ transform: "scaleX(-1)", zIndex: 2 }}
      />
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{
          background: "rgba(10, 5, 0, 0.3)",
          mixBlendMode: "multiply",
          zIndex: 5,
        }}
      />
      <video
        ref={narutoRef}
        src="/assets/naruto.mp4"
        muted
        autoPlay
        loop
        playsInline
        className="absolute pointer-events-none"
        style={{
          width: "1600px",
          height: "auto",
          top: 0,
          left: 0,
          transform: "translate(-50%, -50%)",
          display: "none",
          mixBlendMode: "screen",
          zIndex: 20,
        }}
      />
      <video
        ref={sasukeRef}
        src="/assets/sasuke.mp4"
        muted
        autoPlay
        loop
        playsInline
        className="absolute pointer-events-none"
        style={{
          width: "2400px",
          height: "auto",
          top: 0,
          left: 0,
          transform: "translate(-50%, -50%)",
          display: "none",
          mixBlendMode: "screen",
          zIndex: 20,
        }}
      />
    </div>
  );
};

export default Index;
