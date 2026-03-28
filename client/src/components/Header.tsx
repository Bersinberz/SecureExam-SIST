import React from "react";
import windowService from "../services/windowService";

import sathyabamaLogo from "../assets/recruitment-at-sathyabama-institute-of-science-and-technology.png";
import secureLogo from "../assets/securelogo.png";

const Header: React.FC = () => {
  const isElectron = windowService.isElectron();

  const handleClose = async () => {
    if (isElectron) {
      await windowService.requestClose();
    }
  };

  const styles = {
    header: {
      width: "100%",
      backgroundColor: "#831238",
      color: "white",
      padding: "2rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      // Make header draggable in frameless Electron window
      WebkitAppRegion: isElectron ? ("drag" as any) : undefined,
    },
    logo: {
      display: "flex",
      alignItems: "center",
      padding: "0px 6rem"
    },
    logoImg: { width: "24rem", height: "5.5rem" },
    rightSection: {
      display: "flex",
      alignItems: "center",
      gap: "1.5rem",
      marginRight: "40px",
    },
    rightImageImg: { width: "25rem", height: "auto", maxWidth: "100%", objectFit: "contain" as "contain" },
    closeButton: {
      WebkitAppRegion: "no-drag" as any,
      background: "rgba(255, 255, 255, 0.15)",
      border: "2px solid rgba(255, 255, 255, 0.4)",
      color: "white",
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      fontSize: "1.2rem",
      fontWeight: "bold" as "bold",
      transition: "all 0.2s ease",
      flexShrink: 0,
    },
  };

  return (
    <header style={styles.header}>
      <div style={styles.logo}>
        <img src={sathyabamaLogo} alt="Sathyabama" style={styles.logoImg} />
      </div>
      <div style={styles.rightSection}>
        <img src={secureLogo} alt="SecureExam Logo" style={styles.rightImageImg} />
        {isElectron && (
          <button
            style={styles.closeButton}
            onClick={handleClose}
            title="Close Application"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(220, 53, 69, 0.9)";
              e.currentTarget.style.borderColor = "rgba(220, 53, 69, 1)";
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            ✕
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
