import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { Container, Row, Col, Card, Button, Form, Alert, Modal, Badge } from 'react-bootstrap';
import { getToken, removeToken } from '../utils/tokenHelper';
import Header from '../components/Header';
import Loader from '../components/Loader';
import Message from '../components/Message';

// Custom Theme Colors
const THEME_PRIMARY = '#9e1c3f'; // Accent Red / Primary Action
const THEME_SECONDARY = '#831238'; // Darker Red / Header / Terminal Accent
const THEME_BG = '#f4f7f9'; // Light overall background
const CODE_BG_DARK = '#1e1e1e'; // Monaco Editor / Terminal Background

// Custom Styles for Theme and Unique Elements
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
    // Timer Style
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
    // Dropdown Style
    dropdown: {
        borderColor: THEME_PRIMARY,
        color: THEME_SECONDARY,
        fontWeight: 'bold',
        padding: '0.5rem 1rem',
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23${THEME_PRIMARY.substring(1)}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `right 1rem center`,
        backgroundSize: `1.25rem 1.25rem`,
    },
    // Consolidated Alert Style for Left Panel Content
    contentAlertStyle: {
        borderLeft: `5px solid ${THEME_PRIMARY}`,
        backgroundColor: '#fcfcfc', // Very light background for content boxes
    }
};

// Inside your component file, at the top
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
    fontWeight: 1000,
    transition: 'all 0.3s ease-in-out',
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

// Submit Button base style (like #quitButton)
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

// Hover style
const submitButtonHover: React.CSSProperties = {
    boxShadow: `0px 0.1em 0.2em rgb(45 35 66 / 40%),
              0px 0.4em 0.7em -0.1em rgb(45 35 66 / 30%), inset 0px -0.1em 0px #831238`,
    transform: 'translateY(-0.2em)',
};

// Active style
const submitButtonActive: React.CSSProperties = {
    boxShadow: 'inset 0px 0.1em 0.6em #831238',
    transform: 'translateY(0em)',
};

// Disabled style
const submitButtonDisabled: React.CSSProperties = {
    cursor: 'not-allowed',
    opacity: 0.6,
};


// Interface definitions (kept for completeness)
interface ExamData {
    id: string;
    name: string;
    time: number;
    department: string;
    section: string;
    year: string;
}

interface StudentData {
    registerNumber: string;
    userName: string;
    department: string;
    section: string;
    year: string;
}

interface CodeExecutionResult {
    output?: string;
    error?: string;
}

interface MessageState {
    id: string;
    text: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
}

const CodeCompiler: React.FC = () => {
    // State management
    const [code, setCode] = useState<string>('// Write your code here');
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

    // Hover states for custom buttons
    const [isRunHovered, setIsRunHovered] = useState(false);
    const [isSubmitHovered, setIsSubmitHovered] = useState(false);


    const editorRef = useRef<any>(null);
    const terminalRef = useRef<HTMLDivElement>(null);

    // Initialization and timer effects
    useEffect(() => {
        const token = getToken();

        if (!token) {
            setError('Please login first. Redirecting to login page...');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return;
        }

        fetchExamData(token);
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

            if (countdown === 0) {
                handleWindowClose();
            }
            return () => clearTimeout(timer);
        }
    }, [showCountdown, countdown]);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [terminalContent]);


    // --- Handlers (Kept logic the same) ---
    const showMessage = (text: string, type: 'success' | 'error' | 'info', duration?: number) => {
        const id = Date.now().toString();
        setMessages(prev => [...prev, { id, text, type, duration }]);
    };

    const removeMessage = (id: string) => {
        setMessages(prev => prev.filter(msg => msg.id !== id));
    };

    const handleWindowClose = () => {
        try {
            removeToken();
            window.close();
        } catch (e) {
            console.error('Error closing the window:', e);
        }
    };

    const fetchExamData = async (token: string) => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/api/code/getdata', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    removeToken();
                    setError('Session expired. Please login again.');
                    setTimeout(() => { window.location.href = '/login'; }, 2000);
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                setExamData(data.data.exam);
                setStudentData(data.data.student);
                setAssignedQuestion(data.data.assignedQuestion);

                const examDurationMinutes = data.data.exam.time;
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

                showMessage('Exam data loaded successfully!', 'success');
            } else {
                setError(data.message || 'Failed to fetch exam data');
                showMessage(data.message || 'Failed to fetch exam data', 'error');
            }
        } catch (error) {
            console.error('Error fetching exam details:', error);
            setError('Failed to fetch exam details. Please try again.');
            showMessage('Failed to fetch exam details. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const initializeTerminal = () => {
        const welcomeMessage = `SecureExam Terminal\n\n`;
        setTerminalContent(welcomeMessage);
    };

    const handleRunCode = async () => {
        setIsProcessing(true);
        appendToTerminal(`Running ${language} code...\n`, 'output');

        try {
            const token = getToken();
            if (!token) {
                appendToTerminal('Error: No authentication token found. Please login again.\n', 'error');
                showMessage('Authentication token not found', 'error');
                return;
            }

            const response = await fetch('https://securexam.in/api/run-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ language, code }),
            });

            const result: CodeExecutionResult = await response.json();

            if (result.output) {
                appendToTerminal(result.output.trim() + '\n', 'output');
                showMessage('Code executed successfully!', 'success');
            } else if (result.error) {
                appendToTerminal(result.error.trim() + '\n', 'error');
                showMessage('Code execution failed', 'error');
            } else {
                appendToTerminal('Execution finished with no output.\n', 'output');
                showMessage('Execution completed with no output', 'info');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
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
            java: '// Write your Java code here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
            c: '// Write your C code here\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
            cpp: '// Write your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
            javascript: '// Write your JavaScript code here\nconsole.log("Hello, World!");'
        }[newLanguage] || '// Write your code here';

        setCode(defaultCode);
        showMessage(`Language changed to ${newLanguage}`, 'info', 2000);
    };

    const handleSubmitCode = async () => {
        try {
            const token = getToken();
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch('https://securexam.in/api/code/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    language,
                    code,
                    assignedQuestion,
                }),
            });

            const result = await response.json();

            if (result.message === 'Code saved successfully') {
                setShowConfirmation(false);
                setShowCountdown(true);
                setCountdown(10);

                setTimeout(() => {
                    removeToken();
                }, 10000);
            } else {
                showMessage('Failed to save code. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error submitting code:', error);
            showMessage('An error occurred while saving your code.', 'error');
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

    // --- Loading and Error Screens ---
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
                        <Button style={{ backgroundColor: THEME_PRIMARY, borderColor: THEME_PRIMARY }} onClick={() => window.location.href = '/login'}>
                            Back to Login
                        </Button>
                    </Alert>
                </div>
            </>
        );
    }

    // --- Main Render ---
    return (
        <div className="secure-exam-compiler" style={{ backgroundColor: THEME_BG, minHeight: '100vh' }}>
            {/* Custom Header (Static) */}
            <Header />

            {/* Messages */}
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

            {/* Main Content Area */}
            <Container fluid className="py-3 h-100">
                <Row className="g-3">
                    {/* Left Column: Problem Statement (Full Column Scroll) */}
                    <div
                        style={{
                            ...customStyles.problemArea,
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                            overflowY: "auto",
                            backgroundColor: "#f9f9f9", // subtle light background for comfort
                            borderRadius: "8px",
                            boxShadow: "inset 0 0 4px rgba(0,0,0,0.05)",
                            padding: "1rem 1.25rem",
                        }}
                    >
                        {/* --- Student Info Header --- */}
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

                        {/* --- Exam Title and Timer --- */}
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

                        {/* --- Question Section --- */}
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

                        {/* --- Input Format --- */}
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

                        {/* --- Output Format --- */}
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

                        {/* --- Note Section --- */}
                        <Alert
                            variant="light"
                            className="mt-4 shadow-sm" // removed 'border'
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

                    {/* Right Column: Code Editor, Control Bar & Terminal */}
                    <Col md={7} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Control Bar */}
                        <Card className="shadow-lg border-0 mb-3">
                            <Card.Body className="p-3">
                                <div className="d-flex align-items-center justify-content-between flex-wrap">
                                    {/* Language Dropdown */}
                                    <div className="me-3 d-flex flex-column">
                                        <Form.Label className="fw-bold mb-1 small" style={{ color: THEME_SECONDARY }}>
                                            Coding Language:
                                        </Form.Label>
                                        <Form.Select
                                            value={language}
                                            onChange={handleLanguageChange}
                                            style={{ minWidth: '150px', maxWidth: '180px' }}
                                        >
                                            <option value="javascript">JavaScript</option>
                                            <option value="python">Python</option>
                                            <option value="java">Java</option>
                                            <option value="c">C</option>
                                            <option value="cpp">C++</option>
                                        </Form.Select>
                                    </div>

                                    {/* Buttons */}
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
                                                ...(!isSubmitEnabled ? submitButtonDisabled : {}),
                                            }}
                                            onMouseEnter={() => setIsSubmitHovered(true)}
                                            onMouseLeave={() => setIsSubmitHovered(false)}
                                            onMouseDown={() => setIsSubmitActive(true)}
                                            onMouseUp={() => setIsSubmitActive(false)}
                                            disabled={!isSubmitEnabled}
                                            onClick={() => setShowConfirmation(true)}
                                        >
                                            SUBMIT EXAM
                                        </Button>

                                    </div>
                                </div>
                            </Card.Body>
                        </Card>


                        {/* Code Editor */}
                        <Card className="shadow-lg mb-4 border-0 rounded-3">
                            {/* Editor Header */}
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

                            {/* Editor Body */}
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

                        {/* Terminal */}
                        <Card className="shadow-lg border-0 rounded">
                            {/* Terminal Header */}
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
                                        backgroundColor: '#1e1e2f', // darker modern terminal background
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

            {/* Modals (Styled for the theme) */}
            <Modal show={showConfirmation} onHide={() => setShowConfirmation(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title style={{ color: THEME_SECONDARY }}>Confirm Submission</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to finish and close the exam?</p>
                    <p className="text-muted small">
                        Once submitted, you cannot make any changes to your code.
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConfirmation(false)}>
                        Cancel
                    </Button>
                    <Button style={{ backgroundColor: THEME_PRIMARY, borderColor: THEME_PRIMARY }} onClick={handleSubmitCode}>
                        Yes, Submit Exam
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showCountdown} centered backdrop="static" keyboard={false}>
                <Modal.Body className="text-center">
                    <div className="mb-3">
                        <i className="fas fa-check-circle text-success" style={{ fontSize: '3rem' }}></i>
                    </div>
                    <h5 className="text-success">Exam Submitted Successfully!</h5>
                    <p>You can close the app in <strong>{countdown}</strong> seconds.</p>
                    <div className="progress">
                        <div
                            className="progress-bar bg-success"
                            style={{ width: `${(countdown / 10) * 100}%` }}
                        ></div>
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default CodeCompiler;