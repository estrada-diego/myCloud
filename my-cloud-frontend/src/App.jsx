import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./styles.css";
import Breadcrumb from "./components/Breadcrumb"
import Actions from "./components/Actions"
import FileList from "./components/FileList"
import { useFiles } from "./contexts/FileContext";
import Header from "./components/Header";

const API_BASE = "http://localhost:5000";



export default function App() {
  const { files, path, currentDir, viewMode, setViewMode, loadFiles, setPath } = useFiles();


  useEffect(() => {
    const handlePopState = (event) => {
      const parentId = event.state?.parentId || null;
      loadFiles(parentId, true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  useEffect(() => {
    loadFiles(null); // load the home directory on first render
  }, []);


  return (
    <><Header></Header>
    <div className="container flex-grow-1 light-style container-p-y">
      <div className="container-m-nx container-m-ny bg-lightest mb-3">
      
      <Breadcrumb
        path={path}
        onClickRoot={() => {
          setPath([{ name: "home", id: null }]);
          loadFiles(null);
        }}
        onNavigate={(index) => {
          const newParentId = path[index].id;
          setPath(path.slice(0, index));
          loadFiles(newParentId);
        }}
      />
        <Actions viewMode={viewMode} setViewMode={setViewMode}></Actions>
      </div>
      <FileList files={files} onOpen={(id) => loadFiles(id)} viewMode={viewMode}/>
    </div>
    </>
  );
}






