import React, { useState, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
import Message from "../components/Message.tsx";
import Footer from '../components/Footer';
import Header from '../components/Header.tsx';
import Loader from '../components/Loader.tsx';  
import { createExam } from '../services/examService';

interface ExamDetails {
    name: string;
    time: number;
    department: string;
    section: string;
    year: string;
    file?: File | null;
}

interface MessageState {
    id: number;
    text: string;
    type: 'success' | 'error' | 'info';
    position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "center";
}

const ExamSchedule: React.FC = () => {
    // const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [examDetails, setExamDetails] = useState<ExamDetails>({
        name: '',
        time: 0,
        department: '',
        section: '',
        year: ''
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isStartingExam, setIsStartingExam] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [messages, setMessages] = useState<MessageState[]>([]);
    const [hovered, setHovered] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const hours = Array.from({ length: 6 }, (_, i) => i);
    const minutes = [0, 15, 30, 45];

    const years = [
        { value: '1st', label: '1st Year' },
        { value: '2nd', label: '2nd Year' },
        { value: '3rd', label: '3rd Year' },
        { value: '4th', label: '4th Year' },
    ];

    const departments = [
        { value: 'AI', label: 'AI' },
        { value: 'AIML', label: 'AIML' },
        { value: 'AIDS', label: 'AIDS' },
        { value: 'AIR', label: 'AIR' },
        { value: 'CS', label: 'CS' },
        { value: 'BCT', label: 'BCT' },
        { value: 'IOT', label: 'IOT' },
        { value: 'CSE', label: 'CSE' },
    ];

    const sections = [
        { value: 'A1', label: 'A1' },
        { value: 'A2', label: 'A2' },
        { value: 'A3', label: 'A3' },
        { value: 'A4', label: 'A4' },
        { value: 'A5', label: 'A5' },
        { value: 'A6', label: 'A6' },
        { value: 'B1', label: 'B1' },
        { value: 'B2', label: 'B2' },
    ];

    const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'success', position: MessageState['position'] = 'top-right') => {
        const id = Date.now();
        setMessages(prev => [...prev, { id, text, type, position }]);
    };

    const hideMessage = (id: number) => {
        setMessages(prev => prev.filter(message => message.id !== id));
    };

    const handleInputChange = (field: keyof ExamDetails, value: string | number) => {
        setExamDetails(prev => ({ ...prev, [field]: value }));
    };

    const handleFileUpload = (files: FileList | null) => {
        if (files && files.length > 0) {
            const file = files[0];

            // Check if file is CSV
            if (!file.name.toLowerCase().endsWith('.csv')) {
                showMessage('Please upload a CSV file only', 'error');
                return;
            }

            setIsUploading(true);
            setTimeout(() => {
                setSelectedFile(file);
                setIsUploading(false);
                showMessage('File uploaded successfully!', 'success');
            }, 2000);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e.target.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFileUpload(e.dataTransfer.files);
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setShowDeleteConfirm(false);
        showMessage('File removed', 'error');
    };


const startExam = async () => {
    const { name, department, section, year, time } = examDetails;

    if (!name || !department || !section || !year || !time) {
        showMessage('Please fill all fields', 'error');
        return;
    }

    if (!selectedFile) {
        showMessage('Please upload a question file', 'error');
        return;
    }

    setIsStartingExam(true);

    try {
        // Use the service to create exam
        const result = await createExam(examDetails, selectedFile);

        setIsStartingExam(false);

        if (result.message.includes('successfully')) {
            showMessage('Exam started successfully!', 'success');
            setTimeout(() => {
                // navigate(`/data?department=${department}&section=${section}`);
            }, 2000);
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error: any) {
        setIsStartingExam(false);
        console.error('Error:', error);

        if (error.response?.status === 401) {
            showMessage('Authentication failed. Please login again.', 'error');
            // Optionally redirect to login page
            // navigate('/login');
        } else {
            showMessage(error.message || 'Failed to start exam. Please try again.', 'error');
        }
    }
};

    // Updated Styles to match Login.tsx exactly
    const examDetailsStyles = {
        sectionTitle: { color: '#831238', marginBottom: '20px', fontSize: '1.4rem', fontWeight: 'bold' as 'bold' },
        label: { display: 'block', margin: '10px 0 5px', fontWeight: 'bold' as 'bold', color: '#555' },
        input: { width: '100%', padding: '12px', margin: '0.5rem 0', border: '1px solid #ccc', borderRadius: '10px', fontSize: '1rem', backgroundColor: 'white' },
        timePicker: { display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '10px' },
        timeSelect: { width: '48%', padding: '12px', border: '1px solid #ddd', borderRadius: '10px', fontSize: '1rem', backgroundColor: 'white' },
        dropdownContainer: { display: 'flex', gap: '20px', justifyContent: 'space-between', marginTop: '10px' },
        dropdownGroup: { width: '48%' },
        dropdownSelect: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '10px', fontSize: '1rem', backgroundColor: 'white' },
        threeColumnContainer: { display: 'flex', gap: '20px', justifyContent: 'space-between', marginTop: '10px' },
        threeColumnGroup: { width: '32%' }
    };

    const questionsStyles = {
        sectionTitle: { color: '#831238', marginBottom: '20px', fontSize: '1.4rem', fontWeight: 'bold' as 'bold' },
        removeButton: { backgroundColor: '#831238', color: 'white', border: 'none', padding: '10px 20px', fontSize: '16px', borderRadius: '10px', transition: 'background-color 0.3s ease', cursor: 'pointer', marginTop: '10px' },
        dropContainer: { backgroundColor: '#fff', position: 'relative', display: 'flex', gap: '10px', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 20px', marginTop: '1.1875rem', borderRadius: '15px', border: '2px dashed #ccc', color: '#444', cursor: 'pointer', transition: 'all 0.3s ease-in-out', minHeight: '200px' },
        dropContainerHover: { background: 'rgba(131, 18, 56, 0.05)', borderColor: '#831238', boxShadow: '0 4px 12px rgba(131, 18, 56, 0.1)' },
        dropTitle: { color: '#666', fontSize: '18px', fontWeight: '600', textAlign: 'center', marginBottom: '5px' },
        dropTitleHover: { color: '#831238' },
        clickToUpload: { color: '#831238', fontWeight: 'bold' },
        successState: { borderColor: '#28a745', background: 'rgba(40, 167, 69, 0.05)' },
        successStateHover: { borderColor: '#28a745', background: 'rgba(40, 167, 69, 0.1)' },
        modalOverlay: { position: 'fixed' as 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1050 },
        modalContent: { backgroundColor: 'white', padding: '2rem', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)', maxWidth: '400px', width: '90%', textAlign: 'center' as 'center' },
        modalTitle: { color: '#831238', marginBottom: '1rem', fontSize: '1.3rem', fontWeight: 'bold' },
        modalText: { marginBottom: '1.5rem', color: '#555', fontSize: '1rem' },
        modalButtonGroup: { display: 'flex', gap: '1rem', justifyContent: 'center' },
        modalButton: { padding: '10px 25px', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s ease' },
        modalCancelButton: { backgroundColor: '#6c757d', color: 'white' },
        modalDeleteButton: { backgroundColor: '#dc3545', color: 'white' },
        cssStyles: `.form-control:focus, .form-select:focus { border-color: hsl(340, 76%, 29%); outline: none; box-shadow: 0 0 0 rgba(133, 18, 56, 0); } button:hover:not(:disabled) { background-color: #9e1c3f !important; color: white; } button:disabled { background-color: #d3d3d3 !important; cursor: not-allowed; } .drop-container { background-color: #fff; position: relative; display: flex; gap: 10px; flex-direction: column; justify-content: center; align-items: center; padding: 40px 20px; margin-top: 1.1875rem; border-radius: 15px; border: 2px dashed #ccc; color: #444; cursor: pointer; transition: all 0.3s ease-in-out; min-height: 200px; } .drop-container:hover, .drop-container.drag-over { background: rgba(131, 18, 56, 0.05); border-color: #831238; box-shadow: 0 4px 12px rgba(131, 18, 56, 0.1); } .drop-container:hover .drop-title, .drop-container.drag-over .drop-title { color: #831238; } .drop-title { color: #666; font-size: 18px; font-weight: 600; text-align: center; margin-bottom: 5px; } .drop-container p { color: #888; font-size: 14px; margin: 0; text-align: center; } .drop-container .text-success { color: #28a745 !important; } .drop-container .text-muted { color: #6c757d !important; } .drop-container .btn-outline-danger { border-color: #831238; color: #831238; } .drop-container .btn-outline-danger:hover { background-color: #831238; color: white; } #file-input { width: 100%; max-width: 100%; color: #444; padding: 8px; background: #fff; border-radius: 8px; border: 1px solid #ddd; font-size: 14px; } #file-input::file-selector-button { margin-right: 15px; border: none; background: #831238; padding: 8px 16px; border-radius: 8px; color: #fff; cursor: pointer; transition: all 0.3s ease; font-weight: 500; } #file-input::file-selector-button:hover { background: #9e1c3f; transform: translateY(-1px); } .drop-container.success { border-color: #28a745; background: rgba(40, 167, 69, 0.05); } .drop-container.success:hover { border-color: #28a745; background: rgba(40, 167, 69, 0.1); } .drop-container.error { border-color: #dc3545; background: rgba(220, 53, 69, 0.05); } @media (max-width: 768px) { .drop-container { padding: 30px 15px; min-height: 180px; } .drop-title { font-size: 16px; } .drop-container p { font-size: 13px; } }`
    };

    const commonStyles = {
        mainContainer: { background: "white", marginTop: "100px", borderRadius: "20px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)", padding: "2rem", maxWidth: "1600px", marginLeft: "auto", marginRight: "auto" },
        pageTitle: { color: '#831238', marginBottom: '20px', textAlign: 'center' as 'center', fontSize: '1.8rem', fontWeight: 'bold' },
        startButton: { backgroundColor: hovered ? "#9e1c3f" : "#831238", color: 'white', padding: '15px 40px', border: 'none', borderRadius: '10px', fontSize: '1.2em', fontWeight: 'bold', transition: 'all 0.3s', cursor: 'pointer', marginTop: '30px', width: '200px' },
        buttonDisabled: { backgroundColor: '#cccccc', cursor: 'not-allowed' }
    };


    const isFormValid = examDetails.name && examDetails.department &&
        examDetails.section && examDetails.year && examDetails.time > 0 && selectedFile;

    return (
        <div className="d-flex flex-column min-vh-100" style={{ background: "linear-gradient(135deg,#f5f5f5,#d3d3d3)", fontFamily: '"Roboto",sans-serif', overflow: "hidden" }}>
            {/* Header */}
            <Header />

            {/* Loader Component */}
            {(isUploading || isStartingExam) && <Loader size={50} color="#831238" overlay={true} />}

            {/* Message Components */}
            {messages.map((message) => (
                <Message
                    key={message.id}
                    text={message.text}
                    type={message.type}
                    position={message.position}
                    onHide={() => hideMessage(message.id)}
                />
            ))}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div style={questionsStyles.modalOverlay}>
                    <div style={questionsStyles.modalContent}>
                        <h4 style={questionsStyles.modalTitle}>Confirm Delete</h4>
                        <p style={questionsStyles.modalText}>
                            Are you sure you want to remove the file "{selectedFile?.name}"?
                        </p>
                        <div style={questionsStyles.modalButtonGroup}>
                            <button
                                style={{
                                    ...questionsStyles.modalButton,
                                    ...questionsStyles.modalCancelButton
                                }}
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                style={{
                                    ...questionsStyles.modalButton,
                                    ...questionsStyles.modalDeleteButton
                                }}
                                onClick={handleRemoveFile}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="container-fluid py-4">
                <div style={commonStyles.mainContainer}>
                    <h2 style={commonStyles.pageTitle}>Schedule New Exam</h2>

                    <div className="row g-4">
                        {/* Exam Details Section */}
                        <div className="col-lg-6">
                            <div className="h-100">
                                <h3 style={examDetailsStyles.sectionTitle}>Exam Details</h3>
                                <form>
                                    <div className="mb-3">
                                        <label className="form-label" style={examDetailsStyles.label}>
                                            Exam Name:
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={examDetails.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            style={examDetailsStyles.input}
                                            placeholder="Enter exam name"
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label" style={examDetailsStyles.label}>
                                            Exam Time:
                                        </label>
                                        <div className="d-flex justify-content-between" style={examDetailsStyles.timePicker}>
                                            <div style={{ width: '48%' }}>
                                                <label style={examDetailsStyles.label}>Hours:</label>
                                                <select
                                                    className="form-select"
                                                    value={Math.floor(examDetails.time / 60)}
                                                    onChange={(e) => {
                                                        const hours = parseInt(e.target.value) || 0;
                                                        const minutes = examDetails.time % 60;
                                                        handleInputChange('time', hours * 60 + minutes);
                                                    }}
                                                    style={examDetailsStyles.timeSelect}
                                                >
                                                    <option value="" disabled>Select hours</option>
                                                    {hours.map(hour => (
                                                        <option key={hour} value={hour}>
                                                            {hour} hour{hour !== 1 ? 's' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div style={{ width: '48%' }}>
                                                <label style={examDetailsStyles.label}>Minutes:</label>
                                                <select
                                                    className="form-select"
                                                    value={examDetails.time % 60}
                                                    onChange={(e) => {
                                                        const minutes = parseInt(e.target.value) || 0;
                                                        const hours = Math.floor(examDetails.time / 60);
                                                        handleInputChange('time', hours * 60 + minutes);
                                                    }}
                                                    style={examDetailsStyles.timeSelect}
                                                >
                                                    <option value="" disabled>Select minutes</option>
                                                    {minutes.map(minute => (
                                                        <option key={minute} value={minute}>
                                                            {minute} minutes
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <div style={examDetailsStyles.threeColumnContainer}>
                                            <div style={examDetailsStyles.threeColumnGroup}>
                                                <label className="form-label" style={examDetailsStyles.label}>
                                                    Year:
                                                </label>
                                                <select
                                                    className="form-select"
                                                    value={examDetails.year}
                                                    onChange={(e) => handleInputChange('year', e.target.value)}
                                                    style={examDetailsStyles.dropdownSelect}
                                                    required
                                                >
                                                    <option value="" disabled>Select year</option>
                                                    {years.map(year => (
                                                        <option key={year.value} value={year.value}>
                                                            {year.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div style={examDetailsStyles.threeColumnGroup}>
                                                <label className="form-label" style={examDetailsStyles.label}>
                                                    Department:
                                                </label>
                                                <select
                                                    className="form-select"
                                                    value={examDetails.department}
                                                    onChange={(e) => handleInputChange('department', e.target.value)}
                                                    style={examDetailsStyles.dropdownSelect}
                                                    required
                                                >
                                                    <option value="" disabled>Select department</option>
                                                    {departments.map(dept => (
                                                        <option key={dept.value} value={dept.value}>
                                                            {dept.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div style={examDetailsStyles.threeColumnGroup}>
                                                <label className="form-label" style={examDetailsStyles.label}>
                                                    Class:
                                                </label>
                                                <select
                                                    className="form-select"
                                                    value={examDetails.section}
                                                    onChange={(e) => handleInputChange('section', e.target.value)}
                                                    style={examDetailsStyles.dropdownSelect}
                                                    required
                                                >
                                                    <option value="" disabled>Select class</option>
                                                    {sections.map(section => (
                                                        <option key={section.value} value={section.value}>
                                                            {section.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Questions Section */}
                        <div className="col-lg-6">
                            <div className="h-100">
                                <h3 style={questionsStyles.sectionTitle}>Questions</h3>
                                <form>
                                    <div
                                        className={`drop-container rounded text-center ${isDragOver ? 'drag-over' : ''} ${selectedFile ? 'success' : ''}`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {isUploading ? (
                                            <div className="text-center">
                                                <div className="spinner-border text-primary mb-2" role="status"></div>
                                                <p className="mb-0">Uploading...</p>
                                            </div>
                                        ) : selectedFile ? (
                                            <div className="text-center">
                                                <i className="fas fa-file text-success fa-3x mb-3"></i>
                                                <h6 className="text-success">File Uploaded Successfully!</h6>
                                                <p className="text-muted mb-2">{selectedFile.name}</p>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowDeleteConfirm(true);
                                                    }}
                                                    style={questionsStyles.removeButton}
                                                >
                                                    Remove file
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <i className="fas fa-cloud-upload-alt text-muted fa-3x mb-3"></i>
                                                <div>
                                                    <span className="drop-title">
                                                        Drop files here
                                                    </span>
                                                    <span> or </span>
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleFileInputChange}
                                                        style={{ display: 'none' }}
                                                        accept=".csv"
                                                        required
                                                    />
                                                    <span style={questionsStyles.clickToUpload}>click to upload</span>
                                                </div>
                                                <p className="text-muted mt-2">Supported format: CSV</p>
                                            </div>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Start Exam Button */}
                    <div className="text-center">
                        <button
                            className="btn"
                            onClick={startExam}
                            disabled={isUploading || isStartingExam || !isFormValid}
                            style={{
                                ...commonStyles.startButton,
                                ...((isUploading || isStartingExam || !isFormValid) ? commonStyles.buttonDisabled : {})
                            }}
                            onMouseEnter={() => setHovered(true)}
                            onMouseLeave={() => setHovered(false)}
                        >
                            {isStartingExam ? 'Starting Exam...' : 'Start Exam'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <Footer />

            <style>{questionsStyles.cssStyles}</style>
        </div>
    );
};

export default ExamSchedule;