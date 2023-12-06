import React from "react";
import {Link} from 'react-router-dom';


function Home() {
  return (
    <div className="Home">
      <h1> Disk Analyzer</h1>
          <Link to="/scan" className="scan-button">Start Scanning</Link>    
    </div>
  );
}

export default Home;