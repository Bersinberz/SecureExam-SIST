// main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

import Login from "./pages/login";
import ExamSchedule from "./pages/examSchedule";
import ExamStudents from "./pages/studentTable";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/exam-schedule" element={<ExamSchedule />} />
        <Route path="//exam-students" element={<ExamStudents />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
