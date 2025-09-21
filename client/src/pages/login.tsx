import React, { useState, useRef, useEffect } from "react";
import Message from "../components/Message.tsx";
import { type LoginData } from "../services/authService";
import axiosInstance from "../services/axiosInstance";

// Images
import sathyabamaLogo from "../assets/recruitment-at-sathyabama-institute-of-science-and-technology.png";
import secureLogo from "../assets/securelogo.png";
import sathyabamaIcon from "../assets/images-removebg-preview.png";

type UserType = "student" | "staff" | "";

const Login: React.FC = () => {
  const [userType, setUserType] = useState<UserType>("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [showPassword, setShowPassword] = useState(false);

  const countdownRef = useRef<number | null>(null);

  // --- Helper functions ---
  const displayMessage = (text: string, type: "success" | "error") => {
    setMessage(text);
    setMessageType(type);
    setShowMessage(true);
  };

  const handleMessageHide = () => setShowMessage(false);

  const clearInputs = () => {
    setRegisterNumber("");
    setEmail("");
    setPassword("");
  };

  const handleUserTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setUserType(e.target.value as UserType);
    clearInputs();
  };

  // --- Submit handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userType) {
      displayMessage("Please select a user type!", "error");
      return;
    }

    const identifier = userType === "student" ? registerNumber.trim() : email.trim();
    if (!identifier) {
      displayMessage(`Please enter your ${userType === "student" ? "register number" : "email"}!`, "error");
      return;
    }

    if (!password.trim()) {
      displayMessage("Please enter your password!", "error");
      return;
    }

    setIsLoading(true);

    const loginData: LoginData = { identifier, password, userType };

    try {
      const response = await axiosInstance.post("/auth/login", loginData);

      // Save JWT token to localStorage
      localStorage.setItem("token", response.data.token);

      setIsLoading(false);

      if (userType === "student") {
        setShowSuccessModal(true);
        setCountdown(15);

        countdownRef.current = window.setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              window.location.href = `../html/compiler.html?registerNumber=${identifier}`;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        displayMessage(response.data.message || "Login successful!", "success");
        setTimeout(() => {
          // window.location.href = "../html/dashboard.html";
        }, 2000);
      }
    } catch (error: any) {
      clearInputs();
      setIsLoading(false);
      displayMessage(error.response?.data?.message || "Invalid credentials", "error");
    }
  };

  const handleStartExam = () => {
    const identifier = userType === "student" ? registerNumber.trim() : email.trim();
    if (!identifier) {
      displayMessage("Please login first!", "error");
      return;
    }
    if (countdownRef.current) clearInterval(countdownRef.current);
    window.location.href = `../html/compiler.html?registerNumber=${identifier}`;
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // --- Styles ---
  const styles = {
    header: { width: "100%", backgroundColor: "#831238", color: "white", padding: "2rem", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" },
    logo: { display: "flex", alignItems: "center", padding: "0px 6rem" },
    logoImg: { width: "19rem", height: "5.5rem" },
    rightImage: { marginRight: "40px" },
    rightImageImg: { width: "25rem", height: "auto", maxWidth: "100%", objectFit: "contain" as "contain" },
    loginContainer: { background: "white", marginTop: "150px", borderRadius: "20px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)", padding: "2rem", maxWidth: "500px", textAlign: "center" as "center" },
    input: { width: "70%", padding: "0.75rem", margin: "0.5rem 0", border: "1px solid #ccc", borderRadius: "10px", fontSize: "1rem", backgroundColor: "white" },
    select: { width: "60%", padding: "0.75rem", margin: "1.5rem", border: "1px solid #ccc", borderRadius: "20px", fontSize: "1rem", backgroundColor: "white" },
    button: { backgroundColor: "#831238", color: "white", padding: "0.75rem", border: "none", borderRadius: "10px", marginTop: "30px", width: "45%", cursor: "pointer", fontWeight: "bold" },
    customModal: { display: showSuccessModal ? "block" : "none", position: "fixed" as "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "white", borderRadius: "15px", zIndex: 1000, boxShadow: "0 4px 15px rgba(0,0,0,0.2)", padding: "20px", width: "90%", maxWidth: "600px", overflow: "hidden" as "hidden" },
    customModalContent: { backgroundColor: "#f9f9f9", color: "#333", padding: "20px", borderRadius: "10px", textAlign: "center" as "center", border: "2px solid #ddd", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" as "column", alignItems: "center" },
    spinnerContainer: { display: isLoading ? "flex" : "none", justifyContent: "center", alignItems: "center", flexDirection: "column" as "column", backgroundColor: "rgba(0,0,0,0.5)", position: "fixed" as "fixed", width: "100%", height: "100%", zIndex: 9999, top: 0, left: 0 },
    loader: { width: "50px", aspectRatio: "1", display: "grid", border: "4px solid #0000", borderRadius: "50%", borderRightColor: "rgba(51,51,238,0.8)", animation: "l15 1s infinite linear" },
    footer: { position: "relative" as "relative", width: "100%", backgroundColor: "#831238", padding: "5px 0", overflow: "hidden" as "hidden", marginTop: "auto", textAlign: "center" as "center" },
    newsText: { whiteSpace: "nowrap" as "nowrap", fontSize: "14px", backgroundColor: "#F4F4F4", color: "black", padding: "5px", overflow: "hidden", display: "flex", alignItems: "center", width: "99%", margin: "0 auto", justifyContent: "center" },
    scrollingText: { display: "flex", whiteSpace: "nowrap" as "nowrap", position: "relative" as "relative", animation: "scrollText 40s linear infinite" },
    cssbuttonsIoButton: { background: "#831238", color: "white", fontFamily: "inherit", padding: "0.35em 1.2em", fontSize: "17px", fontWeight: 500, borderRadius: "0.9em", border: "none", display: "flex", alignItems: "center", boxShadow: "inset 0 0 1.6em -0.6em #714da6", overflow: "hidden", position: "relative" as "relative", height: "2.8em", cursor: "pointer", marginTop: "15px" },
  };

  return (
    <div className="d-flex flex-column min-vh-100" style={{ background: "linear-gradient(135deg,#f5f5f5,#d3d3d3)", fontFamily: '"Roboto",sans-serif', overflow: "hidden" }}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}><img src={sathyabamaLogo} alt="Sathyabama" style={styles.logoImg} /></div>
        <div style={styles.rightImage}><img src={secureLogo} alt="SecureExam Logo" style={styles.rightImageImg} /></div>
      </header>

      {/* Login form */}
      <div className="d-flex justify-content-center">
        <div style={styles.loginContainer}>
          <img src={sathyabamaIcon} alt="Sathyabama logo" style={{ width: "30%" }} />

          <select value={userType} onChange={handleUserTypeChange} style={styles.select} required>
            <option value="" disabled>Select User Type</option>
            <option value="student">Student</option>
            <option value="staff">Staff</option>
          </select>

          <form onSubmit={handleSubmit}>
            {userType === "student" && (
              <input type="text" placeholder="Register Number" value={registerNumber} onChange={e => setRegisterNumber(e.target.value)} style={styles.input} required autoComplete="off" />
            )}
            {userType === "staff" && (
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required autoComplete="off" />
            )}
            <div style={{ position: "relative", width: "70%", margin: "0 auto" }}>
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ ...styles.input, width: "100%", paddingRight: "40px" }} />
              <i className={`fa ${showPassword ? "fa-eye-slash" : "fa-eye"}`} onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#831238", fontSize: "20px" }} />
            </div>
            <button type="submit" style={styles.button}>Login</button>
          </form>
        </div>
      </div>

      {/* Student modal */}
      <div style={styles.customModal}>
        <div style={styles.customModalContent}>
          <h2>Welcome to the Exam!</h2>
          <ul style={{ textAlign: "left" }}>
            <li>Exam will start when timer ends.</li>
            <li>Finish button ends exam automatically.</li>
            <li>No multiple logins allowed.</li>
            <li>Severe action for malpractice.</li>
          </ul>
          {countdown > 0 && <p>Exam is Starting in {countdown} seconds!</p>}
          <button style={styles.cssbuttonsIoButton} onClick={handleStartExam}>Get Started</button>
        </div>
      </div>

      {/* Spinner */}
      <div style={styles.spinnerContainer}><div style={styles.loader}></div></div>

      {/* Message */}
      {showMessage && <Message text={message} type={messageType} onHide={handleMessageHide} />}

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.newsText}><div style={styles.scrollingText}>© Developed by AIML students | SCAS - Sathyabama Institute Of Science and Technology</div></div>
      </footer>

      <style>{`
        @keyframes l15 {100% { transform: rotate(1turn); }}
        @keyframes scrollText {from {transform: translateX(200%);} to {transform: translateX(-200%);}}
      `}</style>
    </div>
  );
};

export default Login;
