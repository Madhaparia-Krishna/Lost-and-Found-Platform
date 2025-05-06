import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import FAQ from './pages/FAQ';
import About from './pages/About';
import HelpCenter from './pages/HelpCenter';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/about" element={<About />} />
        <Route path="/help" element={<HelpCenter />} />
      </Routes>
    </Router>
  );
}

export default App;
