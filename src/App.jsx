import "./App.css";
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Scan from "./scan";
import Home from "./home";

function App() {

  return (
    <div className="container">
      <Router>
        <nav>
          <NavLink to="*">Home</NavLink>
        </nav>
        
        <Routes>
          <Route path="*" element={<Home />} />
          <Route path="/scan" element={<Scan />} />
        </Routes>
      </Router>

  </div>
  );
}

export default App;
