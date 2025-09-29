import React from "react";

// Images
import sathyabamaLogo from "../assets/recruitment-at-sathyabama-institute-of-science-and-technology.png";
import secureLogo from "../assets/securelogo.png";

const Header: React.FC = () => {
  const styles = {
    header: {
      width: "100%",
      backgroundColor: "#831238",
      color: "white",
      padding: "2rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
    },
    logo: {
      display: "flex",
      alignItems: "center",
      padding: "0px 6rem"
    },
    logoImg: { width: "19rem", height: "5.5rem" },
    rightImage: { marginRight: "40px" },
    rightImageImg: { width: "25rem", height: "auto", maxWidth: "100%", objectFit: "contain" as "contain" },
  };

  return (
    <header style={styles.header}>
      <div style={styles.logo}>
        <img src={sathyabamaLogo} alt="Sathyabama" style={styles.logoImg} />
      </div>
      <div style={styles.rightImage}>
        <img src={secureLogo} alt="SecureExam Logo" style={styles.rightImageImg} />
      </div>
    </header>
  );
};

export default Header;
