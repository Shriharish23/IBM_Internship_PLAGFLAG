import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import './styles/main.css';
import HomePage from './pages/HomePage';
import AnalyzePage from './pages/AnalyzePage';
import FolderPage from './pages/FolderPage';
import AboutPage from './pages/AboutPage';

function Sidebar() {
  return (
    <nav className="pf-sidebar">
      <div className="pf-sidebar-section-title">Analysis</div>
      <NavLink to="/analyze" className={({ isActive }) => `pf-sidebar-item${isActive ? ' active' : ''}`}>
        <svg viewBox="0 0 32 32" fill="currentColor" width="18" height="18">
          <path d="M24 3H8a2 2 0 00-2 2v22a2 2 0 002 2h16a2 2 0 002-2V5a2 2 0 00-2-2zm0 24H8V5h16z" />
          <path d="M10 10h12v2H10zm0 5h12v2H10zm0 5h8v2h-8z" />
        </svg>
        Text / File Scan
      </NavLink>
      <NavLink to="/folder" className={({ isActive }) => `pf-sidebar-item${isActive ? ' active' : ''}`}>
        <svg viewBox="0 0 32 32" fill="currentColor" width="18" height="18">
          <path d="M11.17 6l3.42 3.41.58.59H28v16H4V6h7.17M12 4H4a2 2 0 00-2 2v20a2 2 0 002 2h24a2 2 0 002-2V10a2 2 0 00-2-2H16l-4-4z" />
        </svg>
        Folder Analysis
      </NavLink>
      <div className="pf-sidebar-divider" />
      <div className="pf-sidebar-section-title">Info</div>
      <NavLink to="/" end className={({ isActive }) => `pf-sidebar-item${isActive ? ' active' : ''}`}>
        <svg viewBox="0 0 32 32" fill="currentColor" width="18" height="18">
          <path d="M16 2a14 14 0 1014 14A14 14 0 0016 2zm0 26a12 12 0 1112-12 12 12 0 01-12 12z" />
          <path d="M16 11a1.5 1.5 0 101.5 1.5A1.5 1.5 0 0016 11zm-1 5h2v8h-2z" />
        </svg>
        Dashboard
      </NavLink>
      <NavLink to="/about" className={({ isActive }) => `pf-sidebar-item${isActive ? ' active' : ''}`}>
        <svg viewBox="0 0 32 32" fill="currentColor" width="18" height="18">
          <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm4 14h-8v-2h3v-6h-3v-2h6v8h2v2z" />
        </svg>
        About
      </NavLink>
    </nav>
  );
}

function Header() {
  return (
    <header className="pf-header">
      <div className="pf-header-brand">
        <div>
          <div className="pf-header-logo">
            PLAG<span>FLAG</span>
          </div>
          <div className="pf-header-sub">Plagiarism Intelligence Platform</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span className="pf-header-badge">IBM Granite Powered</span>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="pf-footer">
      &copy; 2025 PLAGFLAG &mdash; Powered by{' '}
      <span>IBM Granite</span> &amp; watsonx.ai &nbsp;|&nbsp; Academic Integrity Platform
    </footer>
  );
}

function App() {
  return (
    <Router>
      <div className="pf-app">
        <Header />
        <div className="pf-layout">
          <Sidebar />
          <div className="pf-main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/analyze" element={<AnalyzePage />} />
              <Route path="/folder" element={<FolderPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
            <Footer />
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
