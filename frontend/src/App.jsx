// src/App.jsx
import { useRef, useState } from "react"; // <--- IMPORT useRef
import Split from "react-split";
import BlocklyWorkspace from "./components/BlocklyWorkspace.jsx";

export default function App() {
  const [analysisResult, setAnalysisResult] = useState({ lines: [], total: "O(1)" });
  const [generatedPython, setGeneratedPython] = useState("# Drag blocks to generate Python code");
  const [consoleOutput, setConsoleOutput] = useState("Ready to run...");
  const [blocklyJson, setBlocklyJson] = useState(null);

  const workspaceRef = useRef(null); // <--- CREATE REF

  const handleBlocklyChange = async (json, pythonCode) => {
    setGeneratedPython(pythonCode);
    setBlocklyJson(json);
    
    // --- NEW: CALL PYTHON BACKEND ---
    try {
      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pythonCode }),
      });

      const data = await response.json();
      
      if (data.status === "success") {
        // We directly use the data from Python now!
        setAnalysisResult({ 
            total: data.total, 
            lines: data.lines 
        });
      }
    } catch (error) {
      console.error("Backend offline:", error);
      // Optional: Fallback to local engine if needed, or just show "Offline"
      setAnalysisResult({ total: "Offline", lines: [] });
    }
  };

  const saveConfiguration = () => {
    if (!blocklyJson) {
        alert("No blocks to save!");
        return;
    }

    // --- NEW: Prompt user for a file name ---
    let fileName = prompt("Enter a name for your algorithm:", "my-algorithm");
    
    // If the user clicks "Cancel" or leaves it blank, abort the save
    if (!fileName) {
        return; 
    }

    // Ensure the file ends with .json
    if (!fileName.endsWith(".json")) {
        fileName += ".json";
    }

    // --- Existing Save Logic ---
    const jsonString = JSON.stringify(blocklyJson, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName; // <--- Uses the custom name here
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // <--- ADDED CLEAR FUNCTION
  const clearAll = () => {
    if (window.confirm("⚠️ Are you sure you want to delete all blocks? This cannot be undone.")) {
      if (workspaceRef.current) {
        workspaceRef.current.clear();
      }
    }
  };

  const runCode = () => {
    setConsoleOutput("> Running...");
    if (!window.Sk) {
      setConsoleOutput("Error: Python engine (Skulpt) not loaded. Check index.html");
      return;
    }

    let outputBuffer = "";
    function outf(text) { outputBuffer += text; }
    function builtinRead(x) {
      if (window.Sk.builtinFiles === undefined || window.Sk.builtinFiles["files"][x] === undefined)
          throw "File not found: '" + x + "'";
      return window.Sk.builtinFiles["files"][x];
    }

    window.Sk.pre = "output";
    window.Sk.configure({ output: outf, read: builtinRead });

    const myPromise = window.Sk.misceval.asyncToPromise(function() {
        return window.Sk.importMainWithBody("<stdin>", false, generatedPython, true);
    });

    myPromise.then(function() {
        setConsoleOutput(outputBuffer + "\n> Program finished.");
    }, function(err) {
        setConsoleOutput(outputBuffer + "\n> Error: " + err.toString());
    });
  };

  // --- NEW: LOAD PRE-MADE TEMPLATE WITH CONFIRMATION ---
  const handleTemplateSelect = async (e) => {
    const templatePath = e.target.value;
    if (!templatePath) return; 

    // 1. Ask for confirmation before overwriting
    const confirmLoad = window.confirm("⚠️ Loading a template will overwrite your current workspace. Do you want to continue?");
    
    if (!confirmLoad) {
      e.target.value = ""; // Reset dropdown if they cancel
      return;
    }

    try {
      // 2. Fetch the JSON file from the React 'public' folder
      const response = await fetch(`/templates/${templatePath}.json`);
      if (!response.ok) throw new Error("Template not found");
      
      const json = await response.json();
      
      // 3. Send the JSON to Blockly
      if (workspaceRef.current) {
        workspaceRef.current.loadTemplate(json);
      }
    } catch (error) {
      console.error("Failed to load template", error);
      alert(`Could not find the file: /templates/${templatePath}.json`);
    }
    
    // 4. Reset the dropdown back to the placeholder text
    e.target.value = ""; 
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left-group">
            <h1>AlgoBlocks</h1>

            {/* --- NEW: PRE-MADE TEMPLATES DROPDOWN --- */}
            <select 
              className="save-button" 
              style={{ backgroundColor: "#8e44ad", cursor: "pointer", marginRight: "10px" }}
              onChange={handleTemplateSelect}
              defaultValue=""
            >
              <option value="" disabled>📁 PRE-MADE TEMPLATES</option>
              
              <optgroup label="Search Algo">
                <option value="search/linear_search">Linear Search - O(n)</option>
                <option value="search/binary_search">Binary Search - O(log n)</option>
              </optgroup>
              
              <optgroup label="Sort Algo">
                {/* You mentioned you only have Bubble Sort for now, but we can list the others to prepare! */}
                <option value="sort/bubble_sort">Bubble Sort - O(n²)</option>
                <option value="sort/selection_sort">Selection Sort - O(n²)</option>
                <option value="sort/merge_sort">Merge Sort - O(n log n)</option>
              </optgroup>
            </select>

            <button className="save-button" onClick={saveConfiguration}>
                💾 SAVE BLOCKS
            </button>
            {/* <--- ADDED CLEAR BUTTON */}
            <button 
              className="save-button" 
              onClick={clearAll} 
              style={{ backgroundColor: "#e74c3c", marginLeft: "10px" }}
            >
                🗑️ CLEAR
            </button>
        </div>
        <div className="complexity-badge">
          Total Complexity: <strong>{analysisResult.total}</strong>
        </div>
      </header>

      <Split 
        className="main-content" 
        sizes={[70, 30]} 
        minSize={300}    
        gutterSize={10} 
        snapOffset={30}
      >
        <Split 
          className="left-column" 
          direction="vertical" 
          sizes={[70, 30]} 
          minSize={100}
        >
          <div className="workspace-area">
            {/* <--- PASS REF TO WORKSPACE */}
            <BlocklyWorkspace ref={workspaceRef} onChange={handleBlocklyChange} />
          </div>
          
          <div className="code-area">
            <div className="panel-header">Generated Python</div>
            <pre>{generatedPython}</pre>
          </div>
        </Split>

        <Split 
          className="right-column" 
          direction="vertical" 
          sizes={[50, 50]} 
          minSize={100}
        >
          <div className="complexity-area">
            <div className="panel-header">Time Complexity</div>
            <table>
              <thead>
                <tr>
                  <th>Logic</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {analysisResult.lines.map((row, i) => (
                  <tr key={i} style={{ color: row.color }}>
                    <td style={{ paddingLeft: `${row.indent * 15 + 5}px` }}>
                      {row.lineOfCode}
                    </td>
                    <td>{row.complexity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="console-area">
            <div className="panel-header console-header">
              <span>Console</span>
              <button className="run-button" onClick={runCode}>▶ RUN</button>
            </div>
            <pre className="console-output">{consoleOutput}</pre>
          </div>
        </Split>

      </Split>
    </div>
  );
}