// FileContext.js
import { createContext, useContext, useState } from "react";

const FileContext = createContext();
const API_BASE = "/api";

export function FileProvider({ children }) {
  const [files, setFiles] = useState([]);
  const [path, setPath] = useState([{ name: "home", id: null }]);
  const [currentDir, setCurrentDir] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedFiles, setSelectedFiles] = useState([]);



  async function loadFiles(parentId = null, replace = false) {
    const res = await fetch(`${API_BASE}/files?format=json&parentId=${parentId || ""}`);
    const { files, parentName } = await res.json();

    setFiles(files);
    setCurrentDir(parentId);

    if (parentId === null) {
      setPath([{ name: "home", id: null }]);
    } else {
    setPath(prev => {
      const existingIndex = prev.findIndex(p => p.id === parentId);
      if (existingIndex !== -1) {
        return prev.slice(0, existingIndex + 1);
      } else {
        return [...prev, { name: parentName, id: parentId }];
      }
    });
  }

    const url = parentId ? `?dir=${parentId}` : "/";
    if (replace) {
      window.history.replaceState({ parentId }, "", url);
    } else {
      window.history.pushState({ parentId }, "", url);
    }
  }

  return (
    <FileContext.Provider value={{ 
      files, path, currentDir, viewMode, selectedFiles, 
      setViewMode, loadFiles, setPath, setSelectedFiles }}>
      {children}
    </FileContext.Provider>
  );
}

export function useFiles() {
  return useContext(FileContext);
}
