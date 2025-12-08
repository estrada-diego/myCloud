import { Checkbox, IconButton, Button } from "@mui/material";
import { useFiles } from "../contexts/FileContext";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons/faEllipsisV';
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { FileOptionsMenu } from "./FileOptionsMenu"



export default function FileContainer({ file, onOpen, viewMode }) {
    const { selectedFiles, setSelectedFiles } = useFiles();
    const isChecked = selectedFiles.some((f) => f.id === file.id);

    function formatBytes(bytes) {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      const value = bytes / Math.pow(k, i);
      return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${sizes[i]}`;
    }
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

    return (<div
            key={file.id}
            className={`file-item ${viewMode === "grid" ? "grid-item" : "list-item"} ${
        isChecked ? "selected" : ""
      }`}
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
            
           <div className="file-item-icon">
            {file.type === "📁" ? (
              <FolderIcon size="large" sx={{ color: "#6ab0ff" }} />
            ) : (
              <InsertDriveFileIcon size="large" sx={{ color: "#b5b5b5" }} />
            )}
          </div>

            <a
              href="#"
              className="file-item-name"
              onClick={(e) => e.preventDefault()}
            >
              {file.originalname}
            </a>
            <div className="file-data-container">
              <div className="file-item-changed">
                  <div>{new Date(file.upload_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                  <div>{new Date(file.upload_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>  
              </div>
              <div className="file-item-changed">{formatBytes(file.size)}</div>
            </div>

            {/* <IconButton aria-label="Example" size="small" 
                className="settings-button" 
                onClick={(e) => e.stopPropagation()}>
              <FontAwesomeIcon icon={faEllipsisV} />
            </IconButton> */}
            <FileOptionsMenu
              onOpen={() => console.log("Open clicked")}
              onDownload={() => {
                console.log("Download clicked")
              }}
              onDelete={() => console.log("Delete clicked")}
              file={file}
            />
          </div>
    )
}