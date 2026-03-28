import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

import Login        from "./pages/login";
import ExamSchedule from "./pages/examSchedule";
import ExamStudents from "./pages/studentTable";
import CodeCompiler from "./pages/codeCompiler";
import ProtectedRoute from "./components/ProtectedRoute";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />

        {/* Staff only */}
        <Route path="/exam-schedule" element={
          <ProtectedRoute role="staff"><ExamSchedule /></ProtectedRoute>
        } />
        <Route path="/exam-students" element={
          <ProtectedRoute role="staff"><ExamStudents /></ProtectedRoute>
        } />

        {/* Student only */}
        <Route path="/code-compiler" element={
          <ProtectedRoute role="student"><CodeCompiler /></ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
