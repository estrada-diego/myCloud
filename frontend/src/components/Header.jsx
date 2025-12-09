// components/Header.jsx
import React from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../styles.css";

export default function Header() {
  return (
    <header className="app-header shadow-sm mb-3">
        <div className="container d-flex align-items-center py-3">
          <h1 className="logo m-0">myCloud</h1>
          <div className="header-actions d-flex align-items-center gap-3">
            <i className="fas fa-cloud text-primary fs-4"></i>
            <span className="text-muted small"></span>
          </div>
        </div>
      </header>
  );
}