// main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

import Login from "./pages/login";
import ExamSchedule from "./pages/examSchedule";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/exam-schedule" element={<ExamSchedule />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
