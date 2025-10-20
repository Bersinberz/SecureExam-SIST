import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { Container, Row, Col, Card, Button, Form, Alert, Modal, Badge } from 'react-bootstrap';
import { getToken, removeToken } from '../utils/tokenHelper';
import Header from '../components/Header';
import Loader from '../components/Loader';
import Message from '../components/Message';
import { codeCompilerService } from '../services/codeCompilerService';
import type { ExamData, StudentData, CodeExecutionResult, SubmissionResponse } from '../services/codeCompilerService';

const THEME_PRIMARY = '#9e1c3f';
const THEME_SECONDARY = '#831238';
const THEME_BG = '#f4f7f9';
const CODE_BG_DARK = '#1e1e1e';

const customStyles: { [key: string]: React.CSSProperties } = {
    problemArea: {
        overflowY: 'auto',
        backgroundColor: 'white',
        padding: '1.5rem 2rem',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
    },
    timerBadge: {
        backgroundColor: THEME_PRIMARY,
        color: 'white',
        fontSize: '1.2rem',
        padding: '0.5rem 1rem',
        borderRadius: '50px',
        minWidth: '110px',
        textAlign: 'center',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    },
    contentAlertStyle: {
        borderLeft: `5px solid ${THEME_PRIMARY}`,
        backgroundColor: '#fcfcfc',
    }
};

const runButtonStyles: React.CSSProperties = {
    fontFamily: 'inherit',
    fontSize: '16px',
    background: 'radial-gradient(100% 100% at 100% 0%, #831238 0%, #9e1c3f 100%)',
    color: 'white',
    padding: '0.8em 1em 0.8em 0.9em',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '50px',
    transition: 'all 0.3s ease-in-out',
    width: '140px'
};

const runButtonHoverStyles: React.CSSProperties = {
    background: 'radial-gradient(100% 100% at 100% 0%, #9e1c3f 0%, #831238 100%)',
};

const svgStyles: React.CSSProperties = {
    width: '20px',
    height: '20px',
    marginTop: '3px',
    display: 'flex',
    transformOrigin: 'center center',
    transition: 'transform 0.6s ease-in-out',
};

const spanStyles: React.CSSProperties = {
    display: 'flex',
    marginLeft: '0.3em',
    transition: 'all 0.3s ease-in-out',
};

const svgDynamicStyles = (hovered: boolean): React.CSSProperties => ({
    ...svgStyles,
    transform: hovered ? 'translateX(3em) scale(1.1)' : 'translateX(0) scale(1)',
});

const spanDynamicStyles = (hovered: boolean): React.CSSProperties => ({
    ...spanStyles,
    opacity: hovered ? 0 : 1,
});

const submitButtonBase: React.CSSProperties = {
    fontSize: '18px',
    display: 'inline-block',
    outline: 0,
    border: 0,
    cursor: 'pointer',
    background: 'radial-gradient(100% 100% at 100% 0%, #831238 0%, #9e1c3f 100%)',
    padding: '0 2em',
    height: '2.6em',
    color: '#ffffff',
    borderRadius: '20px',
    fontWeight: 600,
    transition: 'box-shadow 0.15s ease, transform 0.15s ease',
};

const submitButtonHover: React.CSSProperties = {
    boxShadow: `0px 0.1em 0.2em rgb(45 35 66 / 40%),
              0px 0.4em 0.7em -0.1em rgb(45 35 66 / 30%), inset 0px -0.1em 0px #831238`,
    transform: 'translateY(-0.2em)',
};

const submitButtonActive: React.CSSProperties = {
    boxShadow: 'inset 0px 0.1em 0.6em #831238',
    transform: 'translateY(0em)',
};

const submitButtonDisabled: React.CSSProperties = {
    cursor: 'not-allowed',
    opacity: 0.6,
};

const enhancedDropdownStyles = {
    container: {
        position: 'relative' as 'relative',
        minWidth: '180px',
        maxWidth: '200px',
    },
    label: {
        color: THEME_SECONDARY,
        fontWeight: '600',
        fontSize: '0.875rem',
        marginBottom: '0.5rem',
        display: 'block',
    },
    select: {
        width: '100%',
        padding: '0.75rem 1rem',
        border: `2px solid ${THEME_PRIMARY}`,
        borderRadius: '12px',
        backgroundColor: 'white',
        color: THEME_SECONDARY,
        fontWeight: '600',
        fontSize: '0.9rem',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        appearance: 'none' as 'none',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 1rem center',
        backgroundSize: '1rem 1rem',
        boxShadow: '0 2px 8px rgba(131, 18, 56, 0.1)',
    },
    selectHover: {
        borderColor: THEME_SECONDARY,
        boxShadow: '0 4px 12px rgba(131, 18, 56, 0.2)',
        transform: 'translateY(-1px)',
    },
    selectFocus: {
        borderColor: THEME_SECONDARY,
        boxShadow: '0 4px 16px rgba(131, 18, 56, 0.3)',
        outline: 'none',
    },
    icon: {
        position: 'absolute' as 'absolute',
        right: '1rem',
        top: '50%',
        transform: 'translateY(-50%)',
        color: THEME_PRIMARY,
        pointerEvents: 'none' as 'none',
        transition: 'transform 0.3s ease',
    },
    iconRotated: {
        transform: 'translateY(-50%) rotate(180deg)',
    }
};

// --- MODIFIED: Enhanced Modal Styles ---
const enhancedModalStyles = {
    overlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
    },
    modal: {
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        background: '#ffffff',
    },
    header: {
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #e9ecef',
        color: '#212529',
        padding: '1rem 1.5rem',
    },
    body: {
        padding: '2rem 1.5rem',
        textAlign: 'center' as 'center',
    },
    footer: {
        borderTop: '1px solid #e9ecef',
        padding: '1rem 1.5rem',
        justifyContent: 'flex-end' as 'flex-end',
        backgroundColor: '#f8f9fa',
    },
    iconWrapper: {
        width: '70px',
        height: '70px',
        borderRadius: '50%',
        margin: '0 auto 1.5rem auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successIconWrapper: {
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
    },
    warningIconWrapper: {
        backgroundColor: `rgba(158, 28, 63, 0.1)`,
    },
    successIcon: {
        fontSize: '2.5rem',
        color: '#28a745',
    },
    warningIcon: {
        fontSize: '2.5rem',
        color: THEME_PRIMARY,
    },
    progressBar: {
        height: '8px',
        borderRadius: '8px',
        backgroundColor: '#e9ecef',
        overflow: 'hidden' as 'hidden',
        marginTop: '1.5rem',
    },
    progressFill: {
        height: '100%',
        background: `linear-gradient(90deg, #28a745, #21c977)`,
        transition: 'width 0.5s ease-in-out',
        borderRadius: '8px',
    },
    title: {
        fontSize: '1.2rem',
        fontWeight: '600',
        margin: 0,
    },
    subtitle: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#343a40',
        marginBottom: '0.5rem',
    },
    text: {
        fontSize: '1rem',
        color: '#6c757d',
        lineHeight: '1.6',
        marginBottom: '1rem',
    },
    cancelButton: {
        padding: '0.6rem 1.5rem',
        borderRadius: '8px',
        fontWeight: '600',
        fontSize: '0.95rem',
        transition: 'all 0.2s ease',
    },
    confirmButton: {
        background: `linear-gradient(135deg, ${THEME_PRIMARY} 0%, ${THEME_SECONDARY} 100%)`,
        border: 'none',
        padding: '0.6rem 1.5rem',
        borderRadius: '8px',
        fontWeight: '600',
        fontSize: '0.95rem',
        boxShadow: `0 4px 12px rgba(158, 28, 63, 0.25)`,
        transition: 'all 0.2s ease',
        color: 'white',
    },
};
// --- END OF MODIFICATION ---

interface MessageState {
    id: string;
    text: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
}

const CodeCompiler: React.FC = () => {
    const [code, setCode] = useState<string>('// Write your JavaScript code here\nconsole.log("Hello, World!");');
    const [language, setLanguage] = useState<string>('javascript');
    const [terminalContent, setTerminalContent] = useState<string>('');
    const [isTerminalCollapsed, setIsTerminalCollapsed] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [remainingTime, setRemainingTime] = useState<number>(0);
    const [examData, setExamData] = useState<ExamData | null>(null);
    const [studentData, setStudentData] = useState<StudentData | null>(null);
    const [assignedQuestion, setAssignedQuestion] = useState<string>('');
    const [isSubmitActive, setIsSubmitActive] = useState(false);
    const [isSubmitEnabled, setIsSubmitEnabled] = useState<boolean>(false);
    const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
    const [showCountdown, setShowCountdown] = useState<boolean>(false);
    const [countdown, setCountdown] = useState<number>(10);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [messages, setMessages] = useState<MessageState[]>([]);

    const [isRunHovered, setIsRunHovered] = useState(false);
    const [isSubmitHovered, setIsSubmitHovered] = useState(false);
    const [isDropdownHovered, setIsDropdownHovered] = useState(false);
    const [isDropdownFocused, setIsDropdownFocused] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);

    const editorRef = useRef<any>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        if (showConfirmation) {
            setTimeout(() => setModalVisible(true), 10);
        } else {
            setModalVisible(false);
        }
    }, [showConfirmation]);

    useEffect(() => {
        if (showCountdown) {
            setTimeout(() => setSuccessModalVisible(true), 10);
        } else {
            setSuccessModalVisible(false);
        }
    }, [showCountdown]);

    useEffect(() => {
        const token = getToken();

        if (!token) {
            setError('Please login first.');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return;
        }

        fetchExamData();
        initializeTerminal();

        const submitTimer = setTimeout(() => {
            setIsSubmitEnabled(true);
            showMessage('Submit button is now enabled', 'info');
        }, 300000);

        return () => {
            clearTimeout(submitTimer);
        };
    }, []);

    useEffect(() => {
        if (showCountdown && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);

            return () => clearTimeout(timer);
        } else if (showCountdown && countdown === 0) {
            handleWindowClose();
        }
    }, [showCountdown, countdown]);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [terminalContent]);

    const ensureTerminalVisible = () => {
        if (isTerminalCollapsed) {
            setIsTerminalCollapsed(false);
        }

        setTimeout(() => {
            if (terminalRef.current) {
                terminalRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end'
                });
            }

            setTimeout(() => {
                window.scrollTo({
                    top: document.documentElement.scrollHeight,
                    behavior: 'smooth'
                });
            }, 200);
        }, 150);
    };

    const showMessage = (text: string, type: 'success' | 'error' | 'info', duration?: number) => {
        const id = Date.now().toString();
        setMessages(prev => [...prev, { id, text, type, duration }]);
    };

    const removeMessage = (id: string) => {
        setMessages(prev => prev.filter(msg => msg.id !== id));
    };

    const fetchExamData = async () => {
        try {
            setLoading(true);
            const response = await codeCompilerService.fetchExamData();

            if (response.success) {
                setExamData(response.data.exam);
                setStudentData(response.data.student);
                setAssignedQuestion(response.data.assignedQuestion);

                const examDurationMinutes = response.data.exam.time;
                setRemainingTime(examDurationMinutes * 60);

                const timerInterval = setInterval(() => {
                    setRemainingTime(prev => {
                        if (prev <= 0) {
                            clearInterval(timerInterval);
                            handleAutoSubmit();
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);

            } else {
                setError(response.message || 'Failed to fetch exam data');
                showMessage(response.message || 'Failed to fetch exam data', 'error');
            }
        } catch (error: any) {
            console.error('Error fetching exam details:', error);
            const errorMessage = error.message || 'Failed to fetch exam details. Please try again.';
            setError(errorMessage);
            showMessage(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const initializeTerminal = () => {
        const welcomeMessage = `SecureExam Terminal - Ready for JavaScript\n\n`;
        setTerminalContent(welcomeMessage);
    };

    const handleRunCode = async (): Promise<void> => {
        setIsProcessing(true);
        appendToTerminal(`Running ${language} code...\n`, 'output');
        ensureTerminalVisible();

        try {
            const result: CodeExecutionResult = await codeCompilerService.executeCode(language, code);

            if (result.success && result.output) {
                appendToTerminal(result.output + '\n', 'output');
                showMessage('Code executed successfully!', 'success');
            } else if (result.error) {
                appendToTerminal(result.error + '\n', 'error');
                showMessage('Code execution failed', 'error');
            } else {
                appendToTerminal('Execution finished with no output.\n', 'output');
                showMessage('Execution completed with no output', 'info');
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Unknown error occurred';
            appendToTerminal(`Error: ${errorMessage}\n`, 'error');
            showMessage('Error executing code', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const appendToTerminal = (text: string, type: 'command' | 'output' | 'error' | 'warning' = 'output') => {
        const styledText = type === 'error' ? `[ERROR] ${text}` :
            type === 'warning' ? `[WARNING] ${text}` :
                type === 'command' ? `> ${text}` : text;
        setTerminalContent(prev => prev + styledText);
    };

    const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newLanguage = event.target.value;
        setLanguage(newLanguage);

        const defaultCode = {
            python: '# Write your Python code here\nprint("Hello, World!")',
            java: '// Write your Java code here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
            c: '// Write your C code here\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
            cpp: '// Write your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
            javascript: '// Write your JavaScript code here\nconsole.log("Hello, World!");'
        }[newLanguage] || '// Write your code here';

        setCode(defaultCode);
    };

    const handleSubmitCode = async () => {
        try {
            const result: SubmissionResponse = await codeCompilerService.submitCode(language, code, assignedQuestion);

            if (result.success) {
                showMessage('Code submitted successfully!', 'success');

                setShowConfirmation(false);
                setShowCountdown(true);
                setCountdown(10);

                setTimeout(() => {
                    removeToken();
                    window.close();
                }, 10000);
            } else {
                showMessage(result.message || 'Failed to save code. Please try again.', 'error');
            }
        } catch (error: any) {
            console.error('Error submitting code:', error);
            const errorMessage = error.message || 'An error occurred while saving your code.';
            showMessage(errorMessage, 'error');
        }
    };

    const handleWindowClose = () => {
        try {
            removeToken();
            if (window.opener) {
                window.close();
            } else {
                window.open('', '_self', '');
                window.close();
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            }
        } catch (e) {
            console.error('Error closing the window:', e);
            window.location.href = '/';
        }
    };

    const handleAutoSubmit = () => {
        showMessage('Time\'s up! Auto-submitting your code...', 'info');
        handleSubmitCode();
    };

    const handleClearTerminal = () => {
        setTerminalContent('');
        initializeTerminal();
        showMessage('Terminal cleared', 'info', 2000);
    };

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${minutes}:${secs}`;
    };

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
    };

    if (loading) {
        return (
            <>
                <Header />
                <Loader overlay={true} />
            </>
        );
    }

    if (error) {
        return (
            <>
                <Header />
                <div className="d-flex justify-content-center align-items-center vh-100" style={{ backgroundColor: THEME_BG }}>
                    <Alert style={{ backgroundColor: THEME_SECONDARY, color: 'white' }} className="text-center border-0 shadow-lg">
                        <h4>Error</h4>
                        <p>{error}</p>
                        <Button style={{ backgroundColor: THEME_PRIMARY, borderColor: THEME_PRIMARY }} onClick={() => window.location.href = '/'}>
                            Back to Login
                        </Button>
                    </Alert>
                </div>
            </>
        );
    }

    return (
        <div className="secure-exam-compiler" style={{ backgroundColor: THEME_BG, minHeight: '100vh' }}>
            <Header />

            {messages.map((message) => (
                <Message
                    key={message.id}
                    text={message.text}
                    type={message.type}
                    duration={message.duration}
                    onHide={() => removeMessage(message.id)}
                    position="top-right"
                />
            ))}

            <Container fluid className="py-3 h-100">
                <Row className="g-3">
                    <div
                        style={{
                            ...customStyles.problemArea,
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                            overflowY: "auto",
                            backgroundColor: "#f9f9f9",
                            borderRadius: "8px",
                            boxShadow: "inset 0 0 4px rgba(0,0,0,0.05)",
                            padding: "1rem 1.25rem",
                        }}
                    >
                        {studentData && (
                            <div
                                style={{
                                    backgroundColor: THEME_SECONDARY,
                                    color: "white",
                                    padding: "0.6rem 0",
                                    borderRadius: "6px",
                                    marginBottom: "1rem",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                }}
                                className="text-center small fw-semibold"
                            >
                                <i className="fas fa-user-circle me-1"></i>
                                <span className="mx-2">{studentData.userName}</span> |
                                <i className="fas fa-id-card mx-2"></i>
                                Reg. No: {studentData.registerNumber} |
                                <i className="fas fa-university mx-2"></i>
                                Dept: {studentData.department} - {studentData.section}
                            </div>
                        )}

                        <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-1">
                            <h4 className="mb-0 fw-bold" style={{ color: THEME_SECONDARY }}>
                                <i className="fas fa-book-open me-2"></i>
                                Exam: {examData?.name}
                            </h4>
                            <div
                                style={{
                                    backgroundColor: THEME_PRIMARY,
                                    color: "white",
                                    padding: "0.4rem 0.8rem",
                                    borderRadius: "20px",
                                    fontWeight: 600,
                                    display: "flex",
                                    alignItems: "center",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                }}
                            >
                                <i className="fas fa-clock me-2"></i>
                                {formatTime(remainingTime)}
                            </div>
                        </div>

                        <h5 className="text-dark mt-3 mb-2 fw-bold">Question:</h5>
                        <div
                            style={{
                                background: "linear-gradient(120deg, #ffffff 0%, #f9f9f9 100%)",
                                borderRadius: "12px",
                                padding: "1.2rem 1.5rem",
                                marginBottom: "1.5rem",
                                position: "relative",
                                boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
                                borderLeft: `6px solid ${THEME_SECONDARY}`,
                                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                            }}
                        >
                            {assignedQuestion ? (
                                <p className="mb-0" style={{ fontSize: "15.5px", color: "#333", lineHeight: 1.6 }}>
                                    <strong>{assignedQuestion}</strong>
                                </p>
                            ) : (
                                <em className="text-muted">No question assigned</em>
                            )}
                        </div>

                        <h6 className="mt-4 text-dark fw-bold">Input Format:</h6>
                        <Alert
                            variant="light"
                            style={{
                                ...customStyles.contentAlertStyle,
                                backgroundColor: "#fff",
                                borderLeft: `4px solid ${THEME_SECONDARY}`,
                                borderRadius: "6px",
                            }}
                            className="p-3 small text-muted"
                        >
                            No user input is required for this problem. All necessary values should be
                            assigned directly within the code.
                            Ensure that your implementation follows this approach to avoid any
                            unexpected input-related errors.
                        </Alert>

                        <h6 className="mt-4 text-dark fw-bold">Output Format:</h6>
                        <Alert
                            variant="light"
                            style={{
                                ...customStyles.contentAlertStyle,
                                backgroundColor: "#fff",
                                borderLeft: `4px solid ${THEME_PRIMARY}`,
                                borderRadius: "6px",
                            }}
                            className="p-3 small text-muted"
                        >
                            The output should be displayed exactly as specified in the problem
                            statement. Ensure that the format is clear, follows the expected structure,
                            and includes necessary spacing or precision if applicable. Any deviation
                            from the expected output format may result in incorrect evaluation.
                        </Alert>

                        <Alert
                            variant="light"
                            className="mt-4 shadow-sm"
                            style={{
                                ...customStyles.contentAlertStyle,
                                backgroundColor: "#fefefe",
                                borderLeft: "6px solid #ffcc00",
                                borderRadius: "6px",
                                color: "#555",
                                fontSize: "0.9rem",
                                lineHeight: "1.5",
                                borderTop: "none",
                                borderRight: "none",
                                borderBottom: "none",
                            }}
                        >
                            <strong>Note:</strong> This is a secure and monitored exam platform. Once
                            the timer ends, the exam will begin automatically. Each candidate can
                            attempt the exam only once, and re-login is not allowed after finishing.
                            Any malpractice will result in strict action. <strong>All the best!</strong>
                        </Alert>
                    </div>

                    <Col md={7} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Card className="shadow-lg border-0 mb-3">
                            <Card.Body className="p-3">
                                <div className="d-flex align-items-center justify-content-between flex-wrap">
                                    <div style={enhancedDropdownStyles.container}>
                                        <Form.Label style={enhancedDropdownStyles.label}>
                                            Change Language:
                                        </Form.Label>
                                        <div style={{ position: 'relative' }}>
                                            <Form.Select
                                                ref={dropdownRef}
                                                value={language}
                                                onChange={handleLanguageChange}
                                                onMouseEnter={() => setIsDropdownHovered(true)}
                                                onMouseLeave={() => setIsDropdownHovered(false)}
                                                onFocus={() => setIsDropdownFocused(true)}
                                                onBlur={() => setIsDropdownFocused(false)}
                                                style={{
                                                    ...enhancedDropdownStyles.select,
                                                    ...(isDropdownHovered ? enhancedDropdownStyles.selectHover : {}),
                                                    ...(isDropdownFocused ? enhancedDropdownStyles.selectFocus : {}),
                                                }}
                                            >
                                                <option value="javascript">JavaScript</option>
                                                <option value="python">Python</option>
                                                <option value="java">Java</option>
                                                <option value="c">C</option>
                                                <option value="cpp">C++</option>
                                            </Form.Select>
                                        </div>
                                    </div>

                                    <div className="d-flex flex-grow-1 justify-content-center gap-3 mt-2 mt-md-0">
                                        <div id="run-button-container">
                                            <button
                                                style={{
                                                    ...runButtonStyles,
                                                    ...(isRunHovered ? runButtonHoverStyles : {}),
                                                    transform: isRunHovered ? 'scale(1.02)' : 'scale(1)',
                                                }}
                                                onMouseEnter={() => setIsRunHovered(true)}
                                                onMouseLeave={() => setIsRunHovered(false)}
                                                onClick={handleRunCode}
                                            >
                                                <i
                                                    className="fas fa-play svg-wrapper"
                                                    style={svgDynamicStyles(isRunHovered)}
                                                ></i>
                                                <span style={spanDynamicStyles(isRunHovered)}>
                                                    RUN CODE
                                                </span>
                                            </button>
                                        </div>
                                        <Button
                                            style={{
                                                ...submitButtonBase,
                                                ...(isSubmitHovered ? submitButtonHover : {}),
                                                ...(isSubmitActive ? submitButtonActive : {}),
                                                // ...(!isSubmitEnabled ? submitButtonDisabled : {}),
                                            }}
                                            onMouseEnter={() => setIsSubmitHovered(true)}
                                            onMouseLeave={() => setIsSubmitHovered(false)}
                                            onMouseDown={() => setIsSubmitActive(true)}
                                            onMouseUp={() => setIsSubmitActive(false)}
                                            onClick={() => setShowConfirmation(true)}
                                        >
                                            SUBMIT EXAM
                                        </Button>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>

                        <Card className="shadow-lg mb-4 border-0 rounded-3">
                            <Card.Header
                                style={{
                                    backgroundColor: CODE_BG_DARK,
                                    color: '#fff',
                                    borderTopLeftRadius: '12px',
                                    borderTopRightRadius: '12px',
                                    borderBottom: '1px solid #444',
                                }}
                                className="d-flex justify-content-between align-items-center py-3 px-4"
                            >
                                <h6 className="mb-0 d-flex align-items-center">
                                    <i className="fas fa-code me-2"></i> Code Editor
                                </h6>
                                <Badge
                                    style={{
                                        backgroundColor: THEME_PRIMARY,
                                        fontWeight: 500,
                                        padding: '0.35rem 0.65rem',
                                    }}
                                    className="fs-6"
                                >
                                    {language.toUpperCase()}
                                </Badge>
                            </Card.Header>

                            <Card.Body
                                className="p-0"
                                style={{
                                    height: '400px',
                                    borderBottomLeftRadius: '12px',
                                    borderBottomRightRadius: '12px',
                                    overflow: 'hidden',
                                }}
                            >
                                <Editor
                                    height="100%"
                                    defaultLanguage={language}
                                    language={language}
                                    value={code}
                                    onChange={(value) => setCode(value || '')}
                                    onMount={handleEditorDidMount}
                                    theme="vs-dark"
                                    options={{
                                        automaticLayout: true,
                                        fontSize: 15,
                                        fontFamily: 'Fira Code, Consolas, monospace',
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        roundedSelection: true,
                                        cursorSmoothCaretAnimation: "on",
                                        cursorBlinking: 'smooth',
                                        lineNumbersMinChars: 3,
                                        wordWrap: 'on',
                                    }}
                                />
                            </Card.Body>
                        </Card>

                        <Card className="shadow-lg border-0 rounded">
                            <Card.Header
                                style={{
                                    backgroundColor: THEME_SECONDARY,
                                    color: 'white',
                                    fontWeight: 600,
                                    borderTopLeftRadius: '0.5rem',
                                    borderTopRightRadius: '0.5rem',
                                }}
                                className="d-flex justify-content-between align-items-center py-2"
                            >
                                <span><i className="fas fa-terminal me-2"></i>Terminal Output</span>
                                <div>
                                    {isProcessing && (
                                        <Button
                                            variant="outline-light"
                                            size="sm"
                                            className="me-2"
                                            onClick={() => setIsProcessing(false)}
                                        >
                                            <i className="fas fa-stop me-1"></i> Stop
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline-light"
                                        size="sm"
                                        className="me-2"
                                        onClick={handleClearTerminal}
                                    >
                                        <i className="fas fa-trash me-1"></i> Clear
                                    </Button>
                                    <Button
                                        variant="outline-light"
                                        size="sm"
                                        onClick={() => setIsTerminalCollapsed(!isTerminalCollapsed)}
                                    >
                                        <i className={`fas fa-chevron-${isTerminalCollapsed ? 'down' : 'up'} me-1`}></i>
                                        {isTerminalCollapsed ? 'Expand' : 'Collapse'}
                                    </Button>
                                </div>
                            </Card.Header>

                            {!isTerminalCollapsed && (
                                <Card.Body
                                    className="p-3"
                                    style={{
                                        height: '250px',
                                        overflowY: 'auto',
                                        backgroundColor: '#1e1e2f',
                                        color: '#e0e0e0',
                                        fontFamily: 'Fira Code, Consolas, monospace',
                                        fontSize: '0.95rem',
                                        borderBottomLeftRadius: '0.5rem',
                                        borderBottomRightRadius: '0.5rem',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                    }}
                                    ref={terminalRef}
                                >
                                    <pre style={{
                                        whiteSpace: 'pre-wrap',
                                        margin: 0,
                                        lineHeight: '1.5',
                                    }}>
                                        {terminalContent || <span className="text-muted">Terminal is empty...</span>}
                                    </pre>
                                </Card.Body>
                            )}
                        </Card>
                    </Col>
                </Row>
            </Container>

            {/* --- MODIFIED: Enhanced Confirmation Modal --- */}
            <Modal
                show={showConfirmation}
                onHide={() => setShowConfirmation(false)}
                centered
                style={enhancedModalStyles.overlay}
            >
                <div
                    style={{
                        ...enhancedModalStyles.modal,
                        opacity: modalVisible ? 1 : 0,
                        transform: modalVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    <Modal.Header style={enhancedModalStyles.header} closeButton>
                        <Modal.Title style={enhancedModalStyles.title}>
                            <i className="fas fa-exclamation-triangle me-2" style={{ color: THEME_PRIMARY }}></i>
                            Confirm Submission
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={enhancedModalStyles.body}>
                        <div style={{ ...enhancedModalStyles.iconWrapper, ...enhancedModalStyles.warningIconWrapper }}>
                            <i className="fas fa-file-code" style={enhancedModalStyles.warningIcon}></i>
                        </div>
                        <h5 style={enhancedModalStyles.subtitle}>
                            Ready to Submit Your Exam?
                        </h5>
                        <p style={enhancedModalStyles.text}>
                            Please confirm that you want to finish and submit your exam. This action cannot be undone.
                        </p>
                    </Modal.Body>
                    <Modal.Footer style={enhancedModalStyles.footer}>
                        <Button
                            variant="light"
                            onClick={() => setShowConfirmation(false)}
                            style={enhancedModalStyles.cancelButton}
                        >
                            Cancel
                        </Button>
                        <Button
                            style={enhancedModalStyles.confirmButton}
                            onClick={handleSubmitCode}
                        >
                            <i className="fas fa-paper-plane me-2"></i>
                            Yes, Submit
                        </Button>
                    </Modal.Footer>
                </div>
            </Modal>

            {/* --- MODIFIED: Enhanced Success Modal --- */}
            <Modal
                show={showCountdown}
                centered
                backdrop="static"
                keyboard={false}
                style={enhancedModalStyles.overlay}
            >
                <div
                    style={{
                        ...enhancedModalStyles.modal,
                        opacity: successModalVisible ? 1 : 0,
                        transform: successModalVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    <Modal.Body style={enhancedModalStyles.body}>
                        <div style={{ ...enhancedModalStyles.iconWrapper, ...enhancedModalStyles.successIconWrapper }}>
                            <i className="fas fa-check-circle" style={enhancedModalStyles.successIcon}></i>
                        </div>
                        <h5 style={{ ...enhancedModalStyles.subtitle, color: '#28a745' }}>
                            Exam Submitted Successfully!
                        </h5>
                        <p style={enhancedModalStyles.text}>
                            Your code has been saved. This window will automatically close in
                            <strong style={{ color: THEME_SECONDARY, fontSize: '1.1rem' }}> {countdown} </strong> seconds.
                        </p>
                        <div style={enhancedModalStyles.progressBar}>
                            <div
                                style={{
                                    ...enhancedModalStyles.progressFill,
                                    width: `${((10 - countdown) / 10) * 100}%`
                                }}
                            ></div>
                        </div>
                    </Modal.Body>
                </div>
            </Modal>
        </div>
    );
};

export default CodeCompiler;