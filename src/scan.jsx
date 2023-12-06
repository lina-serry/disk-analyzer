import React from 'react';
import { useState, useEffect, ContextMenu } from 'react';
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import { PieChart, Pie, Cell, Tooltip} from "recharts";
import { BarChart, Bar, Rectangle, XAxis, YAxis, Legend } from 'recharts';
import { Treemap } from 'recharts';

function Scan() 
{
    const [info, setDirectory] = useState([]);
    const [d, setDelete] = useState('');
    const [currentPath, setCurrentPath] = useState("/initial/path");
    const [currentChart, setCurrentChart] = useState(null);
    const [largestinfo, setLargestDirectory] = useState([]);
    const [showLargestFiles, setShowLargestFiles] = useState(false);
    const [deleteSuccess, setDeleteSuccess] = useState(false);
    const [userPath, setUserPath] = useState(''); 
    const [savePath, setSavePath] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [fileTypeBreakdown, setFileTypeBreakdown] = useState([]);
    const [showFileTypeBreakdown, setShowFileTypeBreakdown] = useState(false);

    
   //displays directories awel mafta7 el page
   useEffect(() => {
    directory("/Users/linaserry/Desktop"); 
   }, []);


  //saves data to file
    async function saveDataToFile(filePath, sortedInfo) {
      if (filePath === '') {
        setErrorMessage('Please enter a path.');
        setTimeout(() => setErrorMessage(''), 1000);
        return; }
      try {
      invoke('save_data_to_file', {path: filePath ,data: sortedInfo })
        .then(() => alert('Data saved successfully!'))
        .catch((err) => alert('Error saving data: ' + err));
        setErrorMessage('');
      }
      catch (error) {
        setErrorMessage('Failed to save data. Please check the path and try again.');
      }
    }
    
  
  //displays directories
    async function directory(path, chartType) {
      if (path  === '') {
        setErrorMessage('Please enter a path.');
        setTimeout(() => setErrorMessage(''), 1000);
        return; }
        try {
          if (currentPath === path && currentChart === chartType) {
            setCurrentChart(null); // Hide the chart when clicking on button again
          } 
          else {
            setDirectory(await invoke("store_directories", { path }));
            setLargestDirectory(await invoke("scan_largest", { path }));
            setCurrentPath(path);
            setCurrentChart(chartType);
            }
    }
    catch (error) {
      setErrorMessage('');
    }
    }
  
    //deletes file
    async function deleteFile(path) {
      setDelete(await invoke("delete_file", {path}));
      setDeleteSuccess(true);
      setTimeout(() => {
        goToParentDirectory();
        setDeleteSuccess(false);
      }, 400);
    }
  

    //handles taking folder path from user
    const handleUserPathScan = () => {
      directory(userPath); 
    }
  

   //goes to parent directory
    function goToParentDirectory() {
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
      directory(parentPath);
    }
  
    //changes unit based on size
    function formatSize(sizeInGigabytes) {
      if (sizeInGigabytes >= 1) {
        return `${sizeInGigabytes.toFixed(2)} GB`;
      } else if (sizeInGigabytes >= 0.001) {
        return `${(sizeInGigabytes * 1000).toFixed(2)} MB`;
      } else {
        return `${(sizeInGigabytes * 1000000).toFixed(2)} KB`;
      }
    }

  //table display for all files in directory
    function renderDirectoryData() {
      const sortedInfo = [...info].sort((a, b) => b.size_gigabytes - a.size_gigabytes);
      // const pathToFile = '/Users/linaserry/Desktop/trial.txt';
     return(
      <table>
        <tbody>
          {sortedInfo.map((item, index) => (
            
            <tr key={index} onClick={() => directory(item.path)} style={{ cursor: 'pointer' }} >
              <td>{item.name}</td>
              <td>{formatSize(item.size_gigabytes)}</td>
            </tr>
            
          ))}
        </tbody>
        
        {!(sortedInfo.length === 0 && currentPath !== '/initial/path') && (
         <div className="user-path-input">
            <input
              type="text"
              value={savePath}
              onChange={(e) => setSavePath(e.target.value)}
              placeholder="Enter file path to save to"
            />
         </div>
        )}

        {sortedInfo.length === 0 && currentPath !== '/initial/path' ?(
          <button onClick={()=> deleteFile(currentPath)}>Delete</button>
          ):<button onClick={() => saveDataToFile(savePath,sortedInfo)}>Save Data</button>}
        {errorMessage && <div className="error-message">{errorMessage}</div>}

      </table>
       );
     }

  //table display for largest files in directory
  const toggleLargestFiles = () => {
    setShowLargestFiles(!showLargestFiles);
    };
    function renderLargestInfoTable() {
      if (!showLargestFiles) return null;
      if (info.length === 0 && currentPath !== '/initial/path') {
        return null; 
      }

      return (
        <table>
          <thead> Largest Files</thead>

          <tbody>
            {largestinfo.map((item, index) => (
              <tr key={index} onClick={() => directory(item.path)} style={{ cursor: 'pointer' }} >
                <td>{item.name}</td>
                <td>{formatSize(item.size_gigabytes)}</td> 
              </tr>
            ))}
          </tbody>
        </table>
      );
    }



  //file type breakdown
  const toggleFileTypeBreakdown = () => {
    setShowFileTypeBreakdown(!showFileTypeBreakdown);
   };

    useEffect(() => {
      setFileTypeBreakdown(aggregateSizesByType(info));
    }, [info]);

    function aggregateSizesByType(info) {
      const sizeByType = {};
  
      info.forEach(item => {
          if (!sizeByType[item.file_type]) {
              sizeByType[item.file_type] = 0;
          }
          sizeByType[item.file_type] += item.size_gigabytes;
      });
  
      return Object.entries(sizeByType).map(([file_type, size_gigabytes]) => ({
          file_type,
          size_gigabytes
      }));
  }

//pie chart display
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    if (percent > 0.01) {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return (
      <text x={x} y={y} fill="#313534" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
         <tspan x={x} dy="0">{`${(percent * 100).toFixed(0)}%`}</tspan>
      </text>
    );
    }
    return null;
  };


  //pie chart display for file type breakdown
  const renderCustomizedLabel_file = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    if (percent > 0.01) {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return (
      <text x={x} y={y} fill="#313534" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
         <tspan x={x} dy="0">{`${(percent * 100).toFixed(0)}%`}</tspan>
        <tspan x={x} dy="1.2em">{fileTypeBreakdown[index].file_type}</tspan>
      </text>
    );
    }
    return null;
  };

  //tooltip for charts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${payload[0].payload.name}: ${formatSize(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };

  //random colors for pie chart
  function generateRandomColor() {
    const hue = Math.floor(Math.random() * 360);
  const saturation = 60 + Math.random() * 20; 
  const lightness = 65 + Math.random() * 10; 
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
  const colors = info.map(() => generateRandomColor());


  //tooltip for file type breakdown
  const CustomTooltipp = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${payload[0].payload.file_type}: ${formatSize(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };


  return (
 <div className="container">
    
      <div className="user-path-input">
        <input
          type="text"
          value={userPath}
          onChange={(e) => setUserPath(e.target.value)}
          placeholder="Enter directory path"
        />
        <button onClick={handleUserPathScan}>Scan Directory</button>
        {errorMessage && <div className="error-message">{errorMessage}</div>}
      </div>

     <div className="btn-group">
        <button onClick={goToParentDirectory}>Back</button>
        {/* <button onClick={() => directory(currentPath)}>Refresh</button> */}
        {/* <button onClick={() => renderLargestInfoTable()}>Largest Files</button> */}
        <button onClick={toggleFileTypeBreakdown}>
            {showFileTypeBreakdown ? 'File Type Breakdown' : 'File Type Breakdown'}
        </button>
        <button onClick={toggleLargestFiles}>
            {showLargestFiles ? 'Largest Files' : 'Largest Files'}
        </button>
     </div>

      
     <div className="path-display">
      <p>Current Path: {currentPath}</p>
     </div>


 <div className="content">
    <div className="directory-data">
       {renderDirectoryData()}
       <div className="largest-files">
       {renderLargestInfoTable()}
        </div>
       {deleteSuccess && <div>File successfully deleted</div>}
    </div>


    <div className="charts">
    <button onClick={() => directory(currentPath,'bar')}>Bar Chart</button>
    <button onClick={() => directory(currentPath,'treemap')}>Tree Map</button>

      <div className="PieChart">
        <PieChart width={400} height={400} >
        <Pie
          data={info}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={200}
          fill="#422040"
          dataKey="size_gigabytes"
          nameKey="name"
        >
            {info.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={colors[index]} />
      ))}
        </Pie>
        <Tooltip content={<CustomTooltip />}/>
      </PieChart> 
      </div>

      <div className="PieChartt">
      { showFileTypeBreakdown && (
      <PieChart width={400} height={400}>
    <Pie
        data={fileTypeBreakdown}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={renderCustomizedLabel_file}
        outerRadius={150}
        fill="#422040"
        dataKey="size_gigabytes"
        nameKey="file_type"
       >
          {fileTypeBreakdown.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={generateRandomColor()} />
        ))}
    </Pie>
    <Tooltip content={<CustomTooltipp />}/>

    </PieChart> )}

    </div>

      <div className="BarChart">
        {currentChart === 'bar' && (
        <BarChart
          width={400}
          height={300}
          data={info}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}>
          
          <XAxis dataKey=" " stroke="white"/>
          <YAxis stroke="white" />
          <Tooltip content={<CustomTooltip />}/>
          <Legend />
          <Bar dataKey="size_gigabytes" fill="#78c586"  barSize= {45} activeBar={<Rectangle fill="pink" />} />
          
        </BarChart> )}

      </div>
      {currentChart === 'treemap' && (
      <Treemap
          width={400}
          height={200}
          data={info} 
          dataKey="size_gigabytes" 
          aspectRatio={4 / 3}
          stroke="#fff"
          fill="#BE4BAB"
            > 
      <Tooltip content={<CustomTooltip />}/>
      </Treemap> )}
      </div>    
  </div>

</div>
  );
}

export default Scan;