import React, { useState, useRef, useEffect } from "react";
import Message from "../components/Message.tsx";
import { login, type LoginData } from "../services/authService";
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
  const [registerNumber, setRegisterNumber] = useState("43611024");
  const [email, setEmail] = useState("staff@gmail.com");
  const [password, setPassword] = useState("Test@123");
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

  const countdownRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const validationRules: ValidationRules = {
    registerNumber: {
      pattern: /^\d{8}$/,
      message: "Please enter a valid Register number"
    },
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Please enter a valid email address"
    },
    password: {
      minLength: 6,
      maxLength: 50,
      message: "Password must be above 6 characters"
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
    setRegisterNumber("43611024");
    setEmail("staff@gmail.com");
    setPassword("Test@123");
    setValidationErrors({});
    setTouchedFields(new Set());
  };

  const markFieldAsTouched = (fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
  };

  const validateField = (fieldName: string, value: string): string => {
    switch (fieldName) {
      case "userType":
        return !value ? "Please select a user" : "";

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
        if (value.length < validationRules.password.minLength ||
          value.length > validationRules.password.maxLength) {
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

      console.log("Full error object:", error);
      console.log("Error response:", error.response);
      console.log("Error data:", error.response?.data);

      // Extract error message from various possible locations
      let errorMessage = "Login failed. Please try again.";

      if (error.response) {
        const responseData = error.response.data;

        // Try different possible locations for the error message
        if (typeof responseData === 'string') {
          errorMessage = responseData;
        } else if (responseData?.message) {
          errorMessage = responseData.message;
        } else if (responseData?.error) {
          errorMessage = responseData.error;
        } else if (responseData?.data?.message) {
          errorMessage = responseData.data.message;
        } else if (responseData?.statusText) {
          errorMessage = responseData.statusText;
        }

        const status = error.response.status;

        switch (status) {
          case 400:
            if (errorMessage.toLowerCase().includes("numeric") || errorMessage.toLowerCase().includes("register number")) {
              errorMessage = "Register number must contain only numbers (8 digits required).";
            } else if (errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("format")) {
              errorMessage = "Please enter a valid email address.";
            } else if (errorMessage.toLowerCase().includes("required") || errorMessage.toLowerCase().includes("fields")) {
              errorMessage = "All fields are required. Please fill in all information.";
            } else if (errorMessage.toLowerCase().includes("user type")) {
              errorMessage = "Please select whether you are a student or staff.";
            } else if (errorMessage.toLowerCase().includes("password") || errorMessage.toLowerCase().includes("6 characters")) {
              errorMessage = "Password must be at least 6 characters long.";
            }
            break;

          case 401:
            if (errorMessage.toLowerCase().includes("not found") || errorMessage.toLowerCase().includes("student not found") || errorMessage.toLowerCase().includes("staff not found")) {
              errorMessage = "Account not found. Please check your register number or email.";
            } else if (errorMessage.toLowerCase().includes("invalid credentials") || errorMessage.toLowerCase().includes("wrong password")) {
              errorMessage = "Invalid password. Please check your password and try again.";
            } else {
              errorMessage = "Invalid login credentials. Please check your details.";
            }
            break;

          case 403:
            errorMessage = "Access denied. Your account may be suspended or inactive.";
            break;

          case 404:
            if (errorMessage.toLowerCase().includes("exam") || errorMessage.toLowerCase().includes("no exam")) {
              errorMessage = "No exams available for your department/section at this time.";
            } else if (errorMessage.toLowerCase().includes("question") || errorMessage.toLowerCase().includes("no question")) {
              errorMessage = "No questions available for your exam. Please contact administrator.";
            } else if (errorMessage.toLowerCase().includes("profile") || errorMessage.toLowerCase().includes("incomplete")) {
              errorMessage = "Your student profile is incomplete. Please contact administration.";
            } else {
              errorMessage = "Requested resource not found. Please try again later.";
            }
            break;

          case 429:
            errorMessage = "Too many login attempts. Please wait a few minutes and try again.";
            break;

          case 500:
            errorMessage = "Server error. Please try again in a few moments.";
            break;

          default:
            // Keep the extracted errorMessage
            break;
        }
      } else if (error.request) {
        // Network error - no response received
        errorMessage = "Unable to connect to server. Please check your internet connection and try again.";
      } else {
        // Other errors (axios config errors, etc.)
        errorMessage = error.message || "An unexpected error occurred. Please try again.";
      }

      displayMessage(errorMessage, "error");

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
    loginContainer: { background: "white", marginTop: "150px", borderRadius: "20px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)", padding: "2rem", maxWidth: "500px", textAlign: "center" as "center" },
    input: { width: "70%", padding: "0.75rem", margin: "0.5rem 0", border: "1px solid #ccc", borderRadius: "10px", fontSize: "1rem", backgroundColor: "white", outline: "none", boxShadow: "none", transition: "none" },
    inputError: { border: "1px solid #d32f2f", backgroundColor: "#fff5f5", outline: "none", boxShadow: "none", transition: "none" },
    select: { width: "60%", padding: "0.75rem", margin: "1.5rem", border: "1px solid #ccc", borderRadius: "20px", fontSize: "1rem", backgroundColor: "white", appearance: "none" as any, WebkitAppearance: "none" as any, MozAppearance: "none" as any, backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='7'><path fill='black' d='M0 0l5 7 5-7z'/></svg>\")", backgroundRepeat: "no-repeat", backgroundPosition: "calc(100% - 15px) center", backgroundSize: "12px", outline: "none", boxShadow: "none", transition: "none" },
    selectError: { border: "1px solid #d32f2f", backgroundColor: "#fff5f5", outline: "none", boxShadow: "none", transition: "none" },
    button: { backgroundColor: hovered ? "#9e1c3f" : "#831238", color: "white", padding: "0.75rem", border: "none", borderRadius: "10px", marginTop: "30px", width: "45%", cursor: "pointer", fontWeight: "bold" },
    buttonDisabled: { backgroundColor: "#cccccc", cursor: "not-allowed" },
    errorText: { color: "#d32f2f", fontSize: "0.875rem", marginTop: "0.25rem", textAlign: "left" as "left", width: "70%", margin: "0 auto" },
    customModal: { display: showSuccessModal ? "block" : "none", position: "fixed" as "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "white", borderRadius: "15px", zIndex: 1000, boxShadow: "0 4px 15px rgba(0,0,0,0.2)", padding: "20px", width: "90%", maxWidth: "600px", overflow: "hidden" as "hidden" },
    customModalContent: { backgroundColor: "#f9f9f9", color: "#333", padding: "20px", borderRadius: "10px", textAlign: "center" as "center", border: "2px solid #ddd", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" as "column", alignItems: "center" },
    cssbuttonsIoButton: { background: "#831238", color: "white", fontFamily: "inherit", padding: "0.35em 1.2em", fontSize: "17px", fontWeight: 500, borderRadius: "0.9em", border: "none", display: "flex", alignItems: "center", boxShadow: "inset 0 0 1.6em -0.6em #714da6", overflow: "hidden", position: "relative" as "relative", height: "2.8em", cursor: "pointer", marginTop: "15px" },
  };

  return (
    <div className="d-flex flex-column min-vh-100" style={{ background: "linear-gradient(135deg,#f5f5f5,#d3d3d3)", fontFamily: '"Roboto",sans-serif', overflow: "hidden" }}>
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

      {/* Message */}
      {showMessage && <Message text={message} type={messageType} onHide={handleMessageHide} />}

      {/* Footer */}
      <Footer />
    </div>
  );
};



export default Login;