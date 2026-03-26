import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import Message from '../components/Message';
import { AuthenticationError, downloadSubmissions, getDownloadErrorMessage, getStudentsByFilter, getSubmissionByRegisterNumber, getUserFriendlyErrorMessage, NetworkError, NoStudentsFoundError, ServerError, StudentValidationError } from '../services/tableService';

// Define the Student interface
interface Student {
  userName: string;
  registerNumber: string;
  department: string;
  section: string;
  year: string;
  hasSubmitted?: boolean;
}

// Define Submission interface - STATUS FIELD REMOVED
interface Submission {
  _id: string;
  registerNumber: string;
  userName: string;
  department: string;
  section: string;
  year: string;
  assignedQuestion: string;
  code: string;
  language: string;
  examId: string;
  submittedAt: string;
}

const THEME_PRIMARY = '#9e1c3f';
const THEME_SECONDARY = '#831238';

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

// View Button Styles matching the page theme
const viewButtonStyles = {
  base: {
    background: `linear-gradient(135deg, ${THEME_PRIMARY} 0%, ${THEME_SECONDARY} 100%)`,
    border: 'none',
    color: 'white',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '80px',
  },
  hover: {
    transform: 'translateY(-2px)',
    boxShadow: `0 4px 12px rgba(158, 28, 63, 0.3)`,
  },
  active: {
    transform: 'translateY(0)',
    boxShadow: `0 2px 6px rgba(158, 28, 63, 0.4)`,
  },
  disabled: {
    background: '#6c757d',
    cursor: 'not-allowed',
    opacity: 0.6,
    transform: 'none',
    boxShadow: 'none',
  }
};

const customStyles = `
  /* Table Header */
  .table-header-custom {
    background-color: #2c3e50;
    color: #fff;
    position: sticky; 
    top: 0;
    z-index: 10;
  }
  .table-header-custom th {
    font-weight: 600;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Button Styles */
  .btn-gradient-finish {
    background: linear-gradient(135deg, #feb692 0%, #ea5455 100%);
    border: none;
    transition: all 0.3s ease;
  }
  .btn-gradient-finish:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 15px rgba(234, 84, 85, 0.3);
  }

  .btn-gradient-download {
    background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%);
    border: none;
    transition: all 0.3s ease;
  }
  .btn-gradient-download:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 15px rgba(102, 166, 255, 0.3);
  }

  /* Pagination */
  .pagination .page-item.active .page-link {
    background-color: #2c3e50;
    border-color: #2c3e50;
  }
  .pagination .page-link { color: #2c3e50; }
  .pagination .page-item.disabled .page-link { color: #6c757d; }

  /* Scrollable table container */
  .scrollable-table-container {
    height: calc(100vh - 380px) !important;
    overflow-y: auto;
    border: 1px solid #dee2e6;
  }

  /* Ensure table header stays sticky within container */
  .scrollable-table-container thead th {
    position: sticky;
    top: 0;
    z-index: 10;
  }

  /* Disable body scroll */
  .no-page-scroll {
    overflow: hidden !important;
  }

  /* Custom Viva Checkbox */
.viva-checkbox {
  position: relative;
  width: 22px;
  height: 22px;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  background-color: #f0f0f0;
  border: 2px solid #2c3e50;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.viva-checkbox:checked {
  background-color: #66a6ff;
  border-color: #66a6ff;
}

.viva-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 6px;
  height: 12px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.viva-checkbox:hover {
  box-shadow: 0 0 5px rgba(102, 166, 255, 0.5);
}

  /* Modal Backdrop */
  .modal-backdrop-custom {
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(5px);
  }

  /* Code Display */
  .code-display {
    font-family: 'Courier New', monospace;
    background-color: #1e1e1e;
    color: #d4d4d4;
    border: 1px solid #444;
    border-radius: 0.375rem;
    padding: 1rem;
    max-height: 400px;
    overflow: auto;
    font-size: 0.875rem;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* Enhanced Modal Styles */
  .enhanced-modal {
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    background: #ffffff;
  }

  .enhanced-modal-header {
    background-color: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    color: #212529;
    padding: '1rem 1.5rem';
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
  }

  .enhanced-modal-body {
    padding: '2rem 1.5rem';
  }

  .enhanced-modal-footer {
    border-top: '1px solid #e9ecef';
    padding: '1rem 1.5rem';
    background-color: '#f8f9fa';
    border-bottom-left-radius: 16px;
    border-bottom-right-radius: 16px;
  }

  /* View Button Animation */
  .view-btn {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  .view-btn:hover {
    transform: translateY(-2px) !important;
  }

  .view-btn:active {
    transform: translateY(0) !important;
  }
`;

const ExamStudents: React.FC = () => {
  const location = useLocation();
  const { department, section, year } = location.state as {
    department: string;
    section: string;
    year: string;
  };

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [vivaChecked, setVivaChecked] = useState<{ [key: string]: boolean }>({});
  const navigate = useNavigate();

  // New states for submission modal
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [loadingSubmission, setLoadingSubmission] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isViewHovered, setIsViewHovered] = useState<{ [key: string]: boolean }>({});
  const [isViewActive, setIsViewActive] = useState<{ [key: string]: boolean }>({});
  const [loadingDownload, setLoadingDownload] = useState(false); // ADD THIS

  useEffect(() => {
    if (showSubmissionModal) {
      setTimeout(() => setModalVisible(true), 10);
    } else {
      setModalVisible(false);
    }
  }, [showSubmissionModal]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setMessage(null);
        setLoading(true);

        const data = await getStudentsByFilter({ department, section, year });
        setStudents(data);

      } catch (err) {
        if (err instanceof AuthenticationError) {
          setMessage({ type: 'error', text: 'Authentication failed. Please login again.' });
          setTimeout(() => navigate('/login'), 2000);
        } else if (err instanceof NoStudentsFoundError) {
          setMessage({ type: 'info', text: err.message });
          setStudents([]);
        } else if (err instanceof StudentValidationError) {
          setMessage({ type: 'error', text: 'Invalid search criteria. Please check your inputs.' });
        } else if (err instanceof NetworkError) {
          setMessage({ type: 'error', text: 'Network connection issue. Please check your internet connection.' });
        } else if (err instanceof ServerError) {
          setMessage({ type: 'error', text: 'Server error occurred. Please try again later.' });
        } else {
          setMessage({
            type: 'error',
            text: getUserFriendlyErrorMessage(err) || 'Failed to fetch students. Please try again.'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (department && section && year) {
      fetchStudents();
    } else {
      setMessage({ type: 'error', text: 'Missing required filter parameters' });
      setLoading(false);
    }
  }, [department, section, year, navigate]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleVivaChange = (registerNumber: string) => {
    setVivaChecked(prev => ({
      ...prev,
      [registerNumber]: !prev[registerNumber],
    }));
  };

  const handleDownload = async () => {
    try {
      setLoadingDownload(true);
      setMessage(null);

      const blob = await downloadSubmissions({ department, section, year });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `submissions_${department}_${section}_${year}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      setMessage({
        type: 'error',
        text: getDownloadErrorMessage(error) || 'Failed to download submissions. Please try again.'
      });
    } finally {
      setLoadingDownload(false);
    }
  };

  const handleViewSubmission = async (registerNumber: string) => {
    try {
      setLoadingSubmission(true);
      setMessage(null);

      const submissionData = await getSubmissionByRegisterNumber(registerNumber);
      setSelectedSubmission(submissionData);
      setShowSubmissionModal(true);

    } catch (error: any) {
      if (error.response?.status === 404) {
        setMessage({
          type: 'error',
          text: error.response.data.message || 'No submission found for this student'
        });
      } else {
        setMessage({
          type: 'error',
          text: getUserFriendlyErrorMessage(error) || 'Failed to load submission details. Please try again.'
        });
      }
    } finally {
      setLoadingSubmission(false);
    }
  };

  const handleViewMouseEnter = (registerNumber: string) => {
    setIsViewHovered(prev => ({
      ...prev,
      [registerNumber]: true,
    }));
  };

  const handleViewMouseLeave = (registerNumber: string) => {
    setIsViewHovered(prev => ({
      ...prev,
      [registerNumber]: false,
    }));
  };

  const handleViewMouseDown = (registerNumber: string) => {
    setIsViewActive(prev => ({
      ...prev,
      [registerNumber]: true,
    }));
  };

  const handleViewMouseUp = (registerNumber: string) => {
    setIsViewActive(prev => ({
      ...prev,
      [registerNumber]: false,
    }));
  };

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!debouncedSearch) return students;
    return students.filter(
      (student) =>
        student.userName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        student.registerNumber.toString().includes(debouncedSearch)
    );
  }, [students, debouncedSearch]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Pagination
  const indexOfLastStudent = currentPage * itemsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - itemsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleHideMessage = () => setMessage(null);

  const closeSubmissionModal = () => {
    setShowSubmissionModal(false);
    setSelectedSubmission(null);
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light no-page-scroll">
      <style>{customStyles}</style>
      <Header />

      {/* Main content - no scrolling */}
      <main className="flex-grow-1 d-flex flex-column" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="d-flex flex-grow-1 justify-content-center align-items-center">
            <Loader />
          </div>
        ) : (
          <div className="container-fluid h-100 d-flex flex-column" style={{ padding: '1rem' }}>
            <div className="card shadow-sm border-0 flex-grow-1 d-flex flex-column">

              {/* Fixed Header Section */}
              <div className="card-header bg-white p-3 d-flex flex-wrap justify-content-between align-items-center gap-3 border-bottom">
                <h5 className="mb-0 fw-bold text-dark">
                  Students List - {department} ({section}) - Year {year}
                </h5>
                <div className="input-group" style={{ maxWidth: '300px' }}>
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search by name or reg no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  />
                </div>
              </div>

              {/* Scrollable Table Area */}
              <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                {filteredStudents.length > 0 ? (
                  <>
                    {/* Scrollable Table Container */}
                    <div className="scrollable-table-container">
                      <table className="table table-striped mb-0">
                        <thead className="table-header-custom">
                          <tr>
                            {/* ALL HEADERS ARE LEFT-ALIGNED */}
                            <th className="align-middle px-4 py-3">S/No</th>
                            <th className="align-middle px-4 py-3">Register No.</th>
                            <th className="align-middle px-4 py-3">Name</th>
                            <th className="align-middle px-4 py-3">Department</th>
                            <th className="align-middle px-4 py-3">Section</th>
                            <th className="align-middle px-4 py-3">Year</th>
                            <th className="align-middle px-4 py-3">Submission</th>
                            <th className="align-middle px-4 py-3">Viva</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentStudents.map((student, index) => (
                            <tr key={student.registerNumber}>
                              {/* Centered body data */}
                              <td className="text-center align-middle px-4 py-2">
                                <span className="fw-medium text-dark">{indexOfFirstStudent + index + 1}</span>
                              </td>

                              {/* --- MODIFIED LINE START --- */}
                              {/* Left-aligned body data (REMOVED text-center) */}
                              <td className="align-middle px-4 py-2">
                                <span className="font-monospace fw-semibold text-primary">{student.registerNumber}</span>
                              </td>
                              {/* --- MODIFIED LINE END --- */}

                              {/* Left-aligned body data */}
                              <td className="align-middle px-4 py-2">
                                <span className="fw-medium text-dark">{student.userName}</span>
                              </td>
                              {/* Left-aligned body data */}
                              <td className="align-middle px-4 py-2">
                                <span className="text-dark">{student.department}</span>
                              </td>
                              {/* Left-aligned body data */}
                              <td className="align-middle px-4 py-2">
                                <span className="text-dark">{student.section}</span>
                              </td>
                              {/* Left-aligned body data */}
                              <td className="align-middle px-4 py-2">
                                <span className="text-dark">{student.year} Year</span>
                              </td>

                              {/* Center-aligned actions */}
                              <td className="text-center align-middle px-4 py-2">
                                <button
                                  className="view-btn"
                                  onClick={() => handleViewSubmission(student.registerNumber)}
                                  disabled={loadingSubmission}
                                  onMouseEnter={() => handleViewMouseEnter(student.registerNumber)}
                                  onMouseLeave={() => handleViewMouseLeave(student.registerNumber)}
                                  onMouseDown={() => handleViewMouseDown(student.registerNumber)}
                                  onMouseUp={() => handleViewMouseUp(student.registerNumber)}
                                  style={{
                                    ...viewButtonStyles.base,
                                    ...(isViewHovered[student.registerNumber] ? viewButtonStyles.hover : {}),
                                    ...(isViewActive[student.registerNumber] ? viewButtonStyles.active : {}),
                                    ...(loadingSubmission ? viewButtonStyles.disabled : {}),
                                  }}
                                >
                                  {loadingSubmission ? (
                                    <div className="spinner-border spinner-border-sm me-1" role="status">
                                      <span className="visually-hidden">Loading...</span>
                                    </div>
                                  ) : (
                                    <i className="bi bi-eye me-1"></i>
                                  )}
                                  View
                                </button>
                              </td>
                              {/* Left-aligned checkbox */}
                              <td className="align-middle px-4 py-2">
                                <input
                                  type="checkbox"
                                  className="viva-checkbox"
                                  checked={!!vivaChecked[student.registerNumber]}
                                  onChange={() => handleVivaChange(student.registerNumber)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Fixed Footer with Pagination & Buttons - Always Visible */}
                    <div className="card-footer bg-white d-flex flex-wrap justify-content-between align-items-center p-3 gap-3 border-top">
                      <p className="mb-0 text-muted">
                        Showing {filteredStudents.length > 0 ? indexOfFirstStudent + 1 : 0} to {Math.min(indexOfLastStudent, filteredStudents.length)} of <span className="fw-bold">{filteredStudents.length}</span> students
                      </p>

                      {totalPages > 1 && (
                        <nav aria-label="Page navigation">
                          <ul className="pagination justify-content-center mb-0">
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                              <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>&laquo;</button>
                            </li>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                              <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                                <button className="page-link" onClick={() => handlePageChange(number)}>{number}</button>
                              </li>
                            ))}
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                              <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>&raquo;</button>
                            </li>
                          </ul>
                        </nav>
                      )}

                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-gradient-download text-white px-4 py-2 rounded-pill d-flex align-items-center fw-semibold"
                          onClick={handleDownload}
                          disabled={loadingDownload}
                        >
                          {loadingDownload ? (
                            <div className="spinner-border spinner-border-sm me-2" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                          ) : (
                            <i className="bi bi-download me-2"></i>
                          )}
                          <span>Download</span>
                        </button>
                        <button className="btn btn-gradient-finish text-white px-4 py-2 rounded-pill fw-semibold">Finish Exam</button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Empty State - Also Fixed Height */
                  <div className="flex-grow-1 d-flex align-items-center justify-content-center" style={{ height: 'calc(100vh - 380px)' }}>
                    <div className="text-center p-5">
                      <i className="bi bi-search" style={{ fontSize: '4rem', color: '#6c757d' }}></i>
                      <h3 className="h4 text-dark mb-2 mt-3">No Matching Students Found</h3>
                      <p className="text-muted mb-0">
                        Your search for "{searchQuery}" did not return any results.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Enhanced Submission Details Modal */}
      {showSubmissionModal && selectedSubmission && (
        <div className="modal fade show d-block" style={enhancedModalStyles.overlay} tabIndex={-1}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div
              className="modal-content enhanced-modal"
              style={{
                opacity: modalVisible ? 1 : 0,
                transform: modalVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="modal-header enhanced-modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="fas fa-file-code me-2" style={{ color: THEME_PRIMARY }}></i>
                  Submission Details - {selectedSubmission.registerNumber}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeSubmissionModal}
                ></button>
              </div>
              <div className="modal-body enhanced-modal-body">
                {/* Student Information */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="card h-100 border-0 shadow-sm">
                      <div className="card-header bg-light">
                        <h6 className="mb-0 fw-semibold">Student Information</h6>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-6 mb-3">
                            <strong className="text-muted small">Register No:</strong>
                            <p className="fw-semibold text-dark">{selectedSubmission.registerNumber}</p>
                          </div>
                          <div className="col-6 mb-3">
                            <strong className="text-muted small">Name:</strong>
                            <p className="fw-semibold text-dark">{selectedSubmission.userName}</p>
                          </div>
                          <div className="col-6 mb-3">
                            <strong className="text-muted small">Department:</strong>
                            <p className="fw-semibold text-dark">{selectedSubmission.department}</p>
                          </div>
                          <div className="col-6 mb-3">
                            <strong className="text-muted small">Section:</strong>
                            <p className="fw-semibold text-dark">{selectedSubmission.section}</p>
                          </div>
                          <div className="col-6 mb-3">
                            <strong className="text-muted small">Year:</strong>
                            <p className="fw-semibold text-dark">{selectedSubmission.year}</p>
                          </div>
                          <div className="col-6 mb-3">
                            <strong className="text-muted small">Language:</strong>
                            <p className="fw-semibold text-dark text-capitalize">{selectedSubmission.language}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card h-100 border-0 shadow-sm">
                      <div className="card-header bg-light">
                        <h6 className="mb-0 fw-semibold">Submission Details</h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-4">
                          <strong className="text-muted small">Submitted At:</strong>
                          <p className="fw-semibold text-dark">
                            {new Date(selectedSubmission.submittedAt).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <strong className="text-muted small">Assigned Question:</strong>
                          <p className="text-dark mt-2" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                            {selectedSubmission.assignedQuestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Code Display */}
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-light d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-semibold">Submitted Code</h6>
                    <span
                      className="badge fw-semibold"
                      style={{
                        backgroundColor: THEME_PRIMARY,
                        color: 'white'
                      }}
                    >
                      {selectedSubmission.language.toUpperCase()}
                    </span>
                  </div>
                  <div className="card-body p-0">
                    <pre className="code-display m-0">
                      <code>{selectedSubmission.code}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {message && (<Message type={message.type} text={message.text} onHide={handleHideMessage} duration={5000} />)}
      <Footer />
    </div>
  );
};

export default ExamStudents;