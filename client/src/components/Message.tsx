import React, { useEffect, useState, useRef, type JSX } from "react";
import { FiCheckCircle, FiInfo, FiAlertCircle, FiX } from "react-icons/fi";

interface MessageProps {
  text: string;
  type: "success" | "error" | "info";
  duration?: number;
  onHide: () => void;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "center";
}

const Message: React.FC<MessageProps> = ({
  text,
  type,
  duration = 4000,
  onHide,
  position = "top-right",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = (timeRemaining = duration) => {
    clearTimers();
    const progressDecreasePerStep = 100 / (duration / 50);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const nextProgress = prev - progressDecreasePerStep;
        if (nextProgress <= 0) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return nextProgress;
      });
    }, 50);

    timerRef.current = setTimeout(hideMessage, timeRemaining);
  };

  const pauseTimer = () => {
    clearTimers();
  };

  const clearTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const hideMessage = () => {
    setIsVisible(false);
    clearTimers();
    setTimeout(() => onHide(), 400);
  };

  useEffect(() => {
    setIsVisible(true);
    if (!isHovered) {
      startTimer();
    }
    return () => {
      clearTimers();
    };
  }, [duration, onHide]);

  useEffect(() => {
    if (isVisible) {
      if (isHovered) {
        pauseTimer();
      } else {
        const timeRemaining = (duration * progress) / 100;
        startTimer(timeRemaining);
      }
    }
  }, [isHovered, isVisible]);

  const colors: Record<string, { bg: string; gradient: string; border: string; iconBg: string }> = {
    success: {
      bg: "#28a745",
      gradient: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
      border: "rgba(40, 167, 69, 0.3)",
      iconBg: "rgba(255, 255, 255, 0.25)",
    },
    error: {
      bg: "#dc3545",
      gradient: "linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)",
      border: "rgba(220, 53, 69, 0.3)",
      iconBg: "rgba(255, 255, 255, 0.25)",
    },
    info: {
      bg: "#007bff",
      gradient: "linear-gradient(135deg, #007bff 0%, #00b4d8 100%)",
      border: "rgba(0, 123, 255, 0.3)",
      iconBg: "rgba(255, 255, 255, 0.25)",
    },
  };

  const icons: Record<string, JSX.Element> = {
    success: <FiCheckCircle size={20} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }} />,
    error: <FiAlertCircle size={20} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }} />,
    info: <FiInfo size={20} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }} />,
  };

  const getContainerStyle = (pos: MessageProps["position"]): React.CSSProperties => {
    const style: React.CSSProperties = {
      position: "fixed",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      zIndex: 10000,
    };
    switch (pos) {
      case "top-left":
        return { ...style, top: "20px", left: "20px" };
      case "bottom-right":
        return { ...style, bottom: "20px", right: "20px" };
      case "bottom-left":
        return { ...style, bottom: "20px", left: "20px" };
      case "center":
        return {
          ...style,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          alignItems: "center",
        };
      case "top-right":
      default:
        return { ...style, top: "20px", right: "20px" };
    }
  };

  const toastStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "14px",
    padding: "18px 22px",
    borderRadius: "16px",
    color: "white",
    background: colors[type].gradient,
    boxShadow: `
      0 6px 20px rgba(0, 0, 0, 0.25),
      inset 0 1px 1px rgba(255, 255, 255, 0.3),
      inset 0 -1px 1px rgba(0, 0, 0, 0.1)
    `,
    border: `2px solid ${colors[type].border}`,
    minWidth: "320px",
    maxWidth: "420px",
    fontSize: "15px",
    fontWeight: 600,
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translateX(0) scale(1)" : "translateX(100%) scale(0.95)",
    transition: "all 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55)",
    position: "relative",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
  };

  const progressBarStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: "4px",
    width: `${progress}%`,
    background: "linear-gradient(90deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)",
    borderRadius: "0 2px 2px 0",
    transition: isHovered ? "none" : "width 50ms linear",
    boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
  };

  const closeBtnStyle: React.CSSProperties = {
    cursor: "pointer",
    color: "#fff",
    opacity: 1,
    padding: "6px",
    borderRadius: "8px",
    background: "rgba(0, 0, 0, 0.25)",
    flexShrink: 0,
    border: "1px solid rgba(255, 255, 255, 0.3)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
  };

  const iconContainerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "12px",
    background: colors[type].iconBg,
    flexShrink: 0,
    border: "2px solid rgba(255, 255, 255, 0.3)",
    boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.2)",
  };

  const textStyle: React.CSSProperties = {
    lineHeight: "1.5",
    flex: 1,
    textAlign: "left",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
    fontWeight: 500,
  };

  return (
    <div
      style={getContainerStyle(position)}
      role={type === "info" ? "status" : "alert"}
      aria-live={type === "error" ? "assertive" : "polite"}
    >
      <div
        style={toastStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={iconContainerStyle}>{icons[type]}</div>
        <span style={textStyle}>{text}</span>

        {/* Close button */}
        <FiX
          style={closeBtnStyle}
          size={20}
          onClick={hideMessage}
        />

        <div style={progressBarStyle}></div>
      </div>
    </div>
  );
};

export default Message;