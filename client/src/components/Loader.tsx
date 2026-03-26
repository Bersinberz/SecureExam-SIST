import React from "react";

interface LoaderProps {
  size?: number;
  color?: string;
  overlay?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ size = 50, color = "#831238", overlay = true }) => {
  const loaderStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    border: `${Math.max(size * 0.08, 4)}px solid #f3f3f3`,
    borderTop: `${Math.max(size * 0.08, 4)}px solid ${color}`,
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  };

  const overlayStyle: React.CSSProperties = overlay
    ? {
        position: "fixed" as "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }
    : {};

  return (
    <>
      <div style={overlayStyle}>
        <div style={loaderStyle}></div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default Loader;
