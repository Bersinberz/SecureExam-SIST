import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import Message from '../components/Message';
import { getStudentsByFilter } from '../services/tableService';

// Define the Student interface
interface Student {
    userName: string;
    registerNumber: string;
    department: string;
    section: string;
    year: string;
}

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

    // Fetch students
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                setMessage(null);
                const data = await getStudentsByFilter({ department, section, year });
                setStudents(data);
            } catch (err) {
                console.error(err);
                setMessage({ type: 'error', text: 'Failed to fetch students data' });
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, [department, section, year]);

    // Debounce search
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
                                                        <th className="text-center px-4 py-3">S/No</th>
                                                        <th className="text-center px-4 py-3">Register No.</th>
                                                        <th className="px-4 py-3">Name</th>
                                                        <th className="px-4 py-3">Department</th>
                                                        <th className="text-center px-4 py-3">Section</th>
                                                        <th className="text-center px-4 py-3">Year</th>
                                                        <th className="text-center px-4 py-3">Question</th>
                                                        <th className="text-center px-4 py-3">Code</th>
                                                        <th className="text-center px-4 py-3">Viva</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentStudents.map((student, index) => (
                                                        <tr key={student.registerNumber}>
                                                            <td className="text-center align-middle px-4 py-2">
                                                                <span className="fw-medium text-dark">{indexOfFirstStudent + index + 1}</span>
                                                            </td>
                                                            <td className="text-center align-middle px-4 py-2">
                                                                <span className="font-monospace fw-semibold text-primary">{student.registerNumber}</span>
                                                            </td>
                                                            <td className="align-middle px-4 py-2">
                                                                <span className="fw-medium text-dark">{student.userName}</span>
                                                            </td>
                                                            <td className="align-middle px-4 py-2">
                                                                <span className="text-dark">{student.department}</span>
                                                            </td>
                                                            <td className="text-center align-middle px-4 py-2">
                                                                <span className="badge bg-success-subtle text-success-emphasis rounded-pill px-3 py-1">{student.section}</span>
                                                            </td>
                                                            <td className="text-center align-middle px-4 py-2">
                                                                <span className="badge bg-primary-subtle text-primary-emphasis rounded-pill px-3 py-1"> {student.year} Year</span>
                                                            </td>
                                                            <td className="text-center align-middle px-4 py-2">
                                                                <span className="badge bg-primary-subtle text-primary-emphasis rounded-pill px-3 py-1">Year {student.year}</span>
                                                            </td>
                                                            <td className="text-center align-middle px-4 py-2">
                                                                <span className="badge bg-primary-subtle text-primary-emphasis rounded-pill px-3 py-1">Year {student.year}</span>
                                                            </td>
                                                            <td className="text-center align-middle px-4 py-2">
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
                                                <button className="btn btn-gradient-download text-white px-4 py-2 rounded-pill d-flex align-items-center fw-semibold">
                                                    <i className="bi bi-download me-2"></i><span>Download</span>
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

            {message && (<Message type={message.type} text={message.text} onHide={handleHideMessage} duration={5000} />)}
            <Footer />
        </div>
    );
};

export default ExamStudents;