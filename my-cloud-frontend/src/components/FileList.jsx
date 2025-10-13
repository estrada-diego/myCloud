import { Checkbox } from "@mui/material";
import React from "react";
import { useFiles } from "../contexts/FileContext";

export default function FileList({ files, onOpen }) {
  const { selectedFiles, setSelectedFiles } = useFiles();

  const toggleSelect = (file) => {
    setSelectedFiles((prev) => {
      const exists = prev.some((f) => f.id === file.id);
      if (exists) {
        return prev.filter((f) => f.id !== file.id);
      } else {
        return [...prev, file]; 
      }
    });
  };

  return (
    <div id="fileContainer" className="file-manager-container file-manager-col-view">
      {files.map((file) => {
        const isChecked = selectedFiles.some((f) => f.id === file.id);
        return (
          <div
            key={file.id}
            className={`file-item ${isChecked ? "selected" : ""}`}
            onClick={() => file.type === "📁" && onOpen(file.id)}
          >
            <div className="file-item-select-bg bg-primary"></div>

            <label className="file-item-checkbox custom-checkbox">
              <Checkbox
                size="small"
                onChange={() => toggleSelect(file)}
                checked={isChecked}
                onClick={(e) => e.stopPropagation()}
              />
            </label>

            <div
              className={`file-item-icon far ${
                file.type === "📁" ? "fa-folder" : "fa-file"
              } text-secondary`}
            ></div>

            <a
              href="#"
              className="file-item-name"
              onClick={(e) => e.preventDefault()}
            >
              {file.originalname}
            </a>
            <div className="file-item-changed">
              {new Date(file.upload_time).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
