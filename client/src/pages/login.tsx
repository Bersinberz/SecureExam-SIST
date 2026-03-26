import React, { useState, useRef, useEffect } from "react";
import Message from "../components/Message.tsx";
import { login, type LoginData, handleLoginError, isLoginError } from "../services/authService";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader.tsx";

// Images
import sathyabamaIcon from "../assets/images-removebg-preview.png";
import Footer from "../components/Footer.tsx";
import Header from "../components/Header.tsx";

type UserType = "student" | "staff" | "";

// Validation interfaces
interface ValidationErrors {
  userType?: string;
  registerNumber?: string;
  email?: string;
  password?: string;
}

interface ValidationRules {
  registerNumber: {
    pattern: RegExp;
    message: string;
  };
  email: {
    pattern: RegExp;
    message: string;
  };
  password: {
    minLength: number;
    maxLength: number;
    message: string;
  };
}

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
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const countdownRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const validationRules: ValidationRules = {
    registerNumber: {
      pattern: /^\d{8}$/,
      message: "Please enter a valid 8-digit Register number"
    },
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Please enter a valid email address"
    },
    password: {
      minLength: 6,
      maxLength: 50,
      message: "Password must be at least 6 characters"
    }
  };

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
    setValidationErrors({});
    setTouchedFields(new Set());
  };

  const markFieldAsTouched = (fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
  };

  const validateField = (fieldName: string, value: string): string => {
    switch (fieldName) {
      case "userType":
        return !value ? "Please select a user type" : "";

      case "registerNumber":
        if (!value.trim()) return "Register number is required";
        if (!validationRules.registerNumber.pattern.test(value)) {
          return validationRules.registerNumber.message;
        }
        return "";

      case "email":
        if (!value.trim()) return "Email is required";
        if (!validationRules.email.pattern.test(value)) {
          return validationRules.email.message;
        }
        return "";

      case "password":
        if (!value.trim()) return "Password is required";
        if (value.length < validationRules.password.minLength) {
          return validationRules.password.message;
        }
        return "";

      default:
        return "";
    }
  };

  const validateTouchedFields = React.useCallback(() => {
    if (touchedFields.size === 0) return;

    const errors: ValidationErrors = {};

    touchedFields.forEach(fieldName => {
      let value = "";
      switch (fieldName) {
        case "userType": value = userType; break;
        case "registerNumber": value = registerNumber; break;
        case "email": value = email; break;
        case "password": value = password; break;
      }

      const error = validateField(fieldName, value);
      if (error) {
        errors[fieldName as keyof ValidationErrors] = error;
      }
    });

    setValidationErrors(prev => {
      const prevErrorsString = JSON.stringify(prev);
      const newErrorsString = JSON.stringify(errors);
      return prevErrorsString === newErrorsString ? prev : errors;
    });
  }, [touchedFields, userType, registerNumber, email, password]);

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    const userTypeError = validateField("userType", userType);
    if (userTypeError) errors.userType = userTypeError;

    if (userType === "student") {
      const registerNumberError = validateField("registerNumber", registerNumber);
      if (registerNumberError) errors.registerNumber = registerNumberError;
    } else if (userType === "staff") {
      const emailError = validateField("email", email);
      if (emailError) errors.email = emailError;
    }

    const passwordError = validateField("password", password);
    if (passwordError) errors.password = passwordError;

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    validateTouchedFields();
  }, [validateTouchedFields]);

  // Handle modal animation
  useEffect(() => {
    if (showSuccessModal) {
      setTimeout(() => {
        setModalVisible(true);
      }, 10);
    } else {
      setModalVisible(false);
    }
  }, [showSuccessModal]);

  const handleUserTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUserType = e.target.value as UserType;
    setUserType(newUserType);
    setValidationErrors({});
    setTouchedFields(new Set());
    clearInputs();
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === "registerNumber") {
      const digitsOnly = value.replace(/\D/g, '');
      const limitedDigits = digitsOnly.slice(0, 8);
      setRegisterNumber(limitedDigits);
    } else if (field === "email") {
      setEmail(value.toLowerCase());
    } else if (field === "password") {
      setPassword(value);
    }

    if (!touchedFields.has(field)) {
      markFieldAsTouched(field);
    }
  };

  const handleBlur = (field: string) => {
    markFieldAsTouched(field);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allFields = ["userType", userType === "student" ? "registerNumber" : "email", "password"];
    allFields.forEach(field => markFieldAsTouched(field));

    if (!validateForm()) {
      displayMessage("Please fix the validation errors before submitting.", "error");
      return;
    }

    setIsLoading(true);

    const identifier = userType === "student" ? registerNumber.trim() : email.trim();
    const loginData: LoginData = {
      identifier,
      password,
      userType: userType as "student" | "staff"
    };

    try {
      const response = await login(loginData);

      setIsLoading(false);

      if (userType === "student") {
        setShowSuccessModal(true);
        setCountdown(15);

        countdownRef.current = window.setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              redirectToExam(identifier);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        displayMessage(response.message || "Login successful!", "success");
        setTimeout(() => {
          navigate("/exam-schedule");
        }, 2000);
      }
    } catch (error: any) {
      setIsLoading(false);

      // Use the enhanced error handling from authService
      const errorInfo = handleLoginError(error);
      
      // Log detailed error for debugging
      if (isLoginError(error)) {
        console.error('Login error details:', {
          statusCode: error.statusCode,
          userMessage: error.userMessage,
          originalError: error.originalError
        });
      } else {
        console.error('Login error:', {
          name: error.name,
          message: error.message,
          response: error.response?.data
        });
      }

      // Display user-friendly error message
      displayMessage(errorInfo.message, "error");

      // Clear password field for security
      if (userType === "student") {
        setPassword("");
      }
    }
  };

  const redirectToExam = (identifier: string) => {
    if (!identifier || (userType === "student" && !validationRules.registerNumber.pattern.test(identifier))) {
      displayMessage("Invalid user identifier for exam redirect", "error");
      return;
    }
    navigate(`/code-compiler`);
  };

  const handleStartExam = () => {
    const identifier = userType === "student" ? registerNumber.trim() : email.trim();

    if (!identifier) {
      displayMessage("Please login first!", "error");
      return;
    }

    if (userType === "student" && !validationRules.registerNumber.pattern.test(identifier)) {
      displayMessage("Invalid register number format", "error");
      return;
    }

    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowSuccessModal(false);
    setModalVisible(false);
    redirectToExam(identifier);
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const getErrorMessage = (field: keyof ValidationErrors): string => {
    return validationErrors[field] || "";
  };

  const shouldShowError = (field: keyof ValidationErrors): boolean => {
    return touchedFields.has(field) && !!validationErrors[field];
  };

  const isFormValid = Object.keys(validationErrors).length === 0 &&
    userType !== "" &&
    ((userType === "student" && registerNumber.trim() !== "") ||
      (userType === "staff" && email.trim() !== "")) &&
    password.trim() !== "";

  // --- Styles ---
  const styles = {
    loginContainer: { 
      background: "white", 
      marginTop: "150px", 
      borderRadius: "20px", 
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)", 
      padding: "2rem", 
      maxWidth: "500px", 
      textAlign: "center" as "center",
      transition: "filter 0.3s ease, transform 0.3s ease",
      filter: showSuccessModal ? "blur(5px)" : "none",
      transform: showSuccessModal ? "scale(0.98)" : "scale(1)"
    },
    input: { 
      width: "70%", 
      padding: "0.75rem", 
      margin: "0.5rem 0", 
      border: "1px solid #ccc", 
      borderRadius: "10px", 
      fontSize: "1rem", 
      backgroundColor: "white", 
      outline: "none", 
      boxShadow: "none", 
      transition: "border-color 0.3s ease" 
    },
    inputError: { 
      border: "2px solid #d32f2f", 
      backgroundColor: "#fff5f5", 
      outline: "none", 
      boxShadow: "none" 
    },
    inputFocus: {
      border: "2px solid #831238",
      boxShadow: "0 0 0 3px rgba(131, 18, 56, 0.1)"
    },
    select: { 
      width: "60%", 
      padding: "0.75rem", 
      margin: "1.5rem", 
      border: "1px solid #ccc", 
      borderRadius: "20px", 
      fontSize: "1rem", 
      backgroundColor: "white", 
      appearance: "none" as any, 
      WebkitAppearance: "none" as any, 
      MozAppearance: "none" as any, 
      backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='7'><path fill='black' d='M0 0l5 7 5-7z'/></svg>\")", 
      backgroundRepeat: "no-repeat", 
      backgroundPosition: "calc(100% - 15px) center", 
      backgroundSize: "12px", 
      outline: "none", 
      boxShadow: "none", 
      transition: "border-color 0.3s ease" 
    },
    selectError: { 
      border: "2px solid #d32f2f", 
      backgroundColor: "#fff5f5", 
      outline: "none", 
      boxShadow: "none" 
    },
    selectFocus: {
      border: "2px solid #831238",
      boxShadow: "0 0 0 3px rgba(131, 18, 56, 0.1)"
    },
    button: { 
      background: "linear-gradient(45deg, #831238, #9e1c3f)", 
      color: "white", 
      padding: "0.75rem 2rem", 
      border: "none", 
      borderRadius: "10px", 
      marginTop: "30px", 
      width: "45%", 
      cursor: "pointer", 
      fontWeight: "bold",
      fontSize: "1rem",
      transition: "all 0.3s ease",
      boxShadow: "0 4px 15px rgba(131, 18, 56, 0.3)"
    },
    buttonHover: {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 20px rgba(131, 18, 56, 0.4)"
    },
    buttonDisabled: { 
      background: "#cccccc", 
      cursor: "not-allowed",
      transform: "none",
      boxShadow: "none"
    },
    errorText: { 
      color: "#d32f2f", 
      fontSize: "0.875rem", 
      marginTop: "0.25rem", 
      textAlign: "left" as "left", 
      width: "70%", 
      margin: "0 auto",
      fontWeight: "500"
    },
    customModalOverlay: {
      display: showSuccessModal ? "flex" : "none",
      position: "fixed" as "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      zIndex: 999,
      alignItems: "center",
      justifyContent: "center",
      opacity: modalVisible ? 1 : 0,
      transition: "opacity 0.3s ease"
    },
    customModal: {
      backgroundColor: "white",
      borderRadius: "16px",
      boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
      padding: "2rem",
      width: "90%",
      maxWidth: "500px",
      textAlign: "center" as "center",
      transform: modalVisible ? "scale(1) translateY(0)" : "scale(0.9) translateY(-20px)",
      opacity: modalVisible ? 1 : 0,
      transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease",
      border: "1px solid rgba(0,0,0,0.05)",
    },
    modalIcon: {
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        backgroundColor: "rgba(131, 18, 56, 0.1)",
        color: "#831238",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "2rem",
        margin: "0 auto 1.5rem auto",
    },
    modalHeader: {
      color: "#333",
      fontSize: "1.5rem",
      fontWeight: "700",
      marginBottom: "0.75rem",
    },
    modalList: {
      textAlign: "left" as "left",
      fontSize: "0.95rem",
      lineHeight: "1.8",
      paddingLeft: "0",
      listStyle: "none",
      margin: "1.5rem 0",
      color: "#555"
    },
    modalListItem: {
        display: "flex",
        alignItems: "center",
        marginBottom: "0.5rem",
    },
    listItemIcon: {
        color: "#831238",
        marginRight: "0.75rem",
        fontSize: "1rem",
    },
    countdownText: {
      fontSize: "1rem",
      fontWeight: "500",
      color: "#6c757d",
      margin: "1rem 0",
    },
    startButton: {
      background: "linear-gradient(45deg, #831238, #9e1c3f)",
      color: "white",
      fontFamily: "inherit",
      padding: "0.8rem 2rem",
      fontSize: "1rem",
      fontWeight: 600,
      borderRadius: "12px",
      border: "none",
      cursor: "pointer",
      marginTop: "1rem",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      boxShadow: "0 4px 15px rgba(131, 18, 56, 0.2)",
    },
    startButtonHover: {
      transform: "translateY(-2px)",
      boxShadow: "0 7px 20px rgba(131, 18, 56, 0.3)"
    }
  };

  return (
    <div 
      className="d-flex flex-column min-vh-100" 
      style={{ 
        background: "linear-gradient(135deg,#f5f5f5,#d3d3d3)", 
        fontFamily: '"Roboto",sans-serif', 
        overflow: "hidden",
        position: "relative"
      }}
    >
      {/* Header */}
      <Header />

      {/* Loader Component */}
      {isLoading && <Loader size={50} color="#831238" overlay={true} />}

      {/* Login form */}
      <div className="d-flex justify-content-center">
        <div style={styles.loginContainer}>
          <img src={sathyabamaIcon} alt="Sathyabama logo" style={{ width: "30%" }} />

          <select
            value={userType}
            onChange={handleUserTypeChange}
            style={{
              ...styles.select,
              ...(shouldShowError("userType") ? styles.selectError : {})
            }}
            required
          >
            <option value="" disabled>Select User Type</option>
            <option value="student">Student</option>
            <option value="staff">Staff</option>
          </select>
          {shouldShowError("userType") && (
            <div style={styles.errorText}>{getErrorMessage("userType")}</div>
          )}

          <form onSubmit={handleSubmit}>
            {userType === "student" && (
              <>
                <input
                  type="text"
                  placeholder="Register Number"
                  value={registerNumber}
                  onChange={e => handleInputChange("registerNumber", e.target.value)}
                  onBlur={() => handleBlur("registerNumber")}
                  style={{
                    ...styles.input,
                    ...(shouldShowError("registerNumber") ? styles.inputError : {})
                  }}
                  required
                  autoComplete="off"
                  maxLength={8}
                  inputMode="numeric"
                  pattern="[0-9]{8}"
                  title="Please enter exactly 8 digits"
                />
                {shouldShowError("registerNumber") && (
                  <div style={styles.errorText}>{getErrorMessage("registerNumber")}</div>
                )}
              </>
            )}
            {userType === "staff" && (
              <>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => handleInputChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  style={{
                    ...styles.input,
                    ...(shouldShowError("email") ? styles.inputError : {})
                  }}
                  required
                  autoComplete="off"
                />
                {shouldShowError("email") && (
                  <div style={styles.errorText}>{getErrorMessage("email")}</div>
                )}
              </>
            )}
            <div style={{ position: "relative", width: "70%", margin: "0 auto" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={e => handleInputChange("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                style={{
                  ...styles.input,
                  width: "100%",
                  paddingRight: "40px",
                  ...(shouldShowError("password") ? styles.inputError : {})
                }}
                minLength={6}
                maxLength={50}
              />
              <i
                className={`fa ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                  color: "#831238",
                  fontSize: "20px"
                }}
              />
            </div>
            {shouldShowError("password") && (
              <div style={styles.errorText}>{getErrorMessage("password")}</div>
            )}
            <button
              type="submit"
              style={{
                ...styles.button,
                ...(hovered ? styles.buttonHover : {}),
                ...(!isFormValid || isLoading ? styles.buttonDisabled : {}),
              }}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>

      <div 
        style={styles.customModalOverlay}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSuccessModal(false);
            setModalVisible(false);
          }
        }}
      >
        <div 
          ref={modalRef}
          style={styles.customModal}
        >
          <div style={styles.modalIcon}>
            <i className="fas fa-book-open"></i>
          </div>
          <h2 style={styles.modalHeader}>Exam Instructions</h2>
          <ul style={styles.modalList}>
            <li style={styles.modalListItem}><i className="fas fa-check" style={styles.listItemIcon}></i>Exam starts automatically when the timer ends.</li>
            <li style={styles.modalListItem}><i className="fas fa-check" style={styles.listItemIcon}></i>The exam will end upon clicking the 'Finish' button.</li>
            <li style={styles.modalListItem}><i className="fas fa-check" style={styles.listItemIcon}></i>Multiple logins are not permitted.</li>
            <li style={styles.modalListItem}><i className="fas fa-check" style={styles.listItemIcon}></i>Strict action will be taken for any malpractice.</li>
          </ul>
          {countdown > 0 && (
            <p style={styles.countdownText}>
              The exam will begin automatically in <strong>{countdown}</strong> second{countdown !== 1 ? 's' : ''}.
            </p>
          )}
          <button 
            style={{
              ...styles.startButton,
              ...(hovered ? styles.startButtonHover : {})
            }} 
            onClick={handleStartExam}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            Start Exam Now
          </button>
        </div>
      </div>

      {/* Message */}
      {showMessage && <Message text={message} type={messageType} onHide={handleMessageHide} />}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Login;