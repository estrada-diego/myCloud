import { ToggleButton, ToggleButtonGroup, Button } from "@mui/material";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import UploadMenu from "./UploadMenu";
import { useTheme } from "@mui/material/styles";
import { useFiles } from "../contexts/FileContext";
import DownloadDialog from "./dialogs/DownloadDialog";
import React, { useState } from "react";

const API_BASE = "/api";

export default function Actions({loadFiles, currentDir, viewMode, setViewMode}) {
  const theme = useTheme();
  const { selectedFiles } = useFiles();
  const [openDownload, setOpenDownload] = useState(false);

  const handleDownload = async () => {
    if (selectedFiles.length === 0) return;
  
    try {
      let res;
      let filename = "files.zip";
  
      if (selectedFiles.length === 1) {
        const file = selectedFiles[0];
        filename = file.originalname || "file";
        res = await fetch(`${API_BASE}/download/${file.id}`);
      } else {
        res = await fetch(`${API_BASE}/download-multiple`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedFiles.map((f) => f.id) }),
        });
      }
  
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Download failed: ${text}`);
      }
  
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
  
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error during download:", err);
    } finally {
      setOpenDownload(false);
    }
  };

  const handleViewChange = (event, newView) => {
    if (newView !== null) setViewMode(newView);
  };
  

  return (
    <>
      <hr className="m-0" />
      <div className="file-manager-actions container-p-x py-2">
        <div>
          <UploadMenu />
          <div>
            <Button
              variant="contained"
              color="gray"
              startIcon={<CloudDownloadIcon size="large" />}
              sx={{ height: "100%" }}
              disabled={selectedFiles.length === 0}
              onClick={() => setOpenDownload(true)}
            />
          </div>

          <div className="btn-group mr-2">
            <button
              type="button"
              className="btn btn-default md-btn-flat dropdown-toggle px-2"
              data-toggle="dropdown"
            >
              <i className="ion ion-ios-settings"></i>
            </button>
            <div className="dropdown-menu">
              <a className="dropdown-item" href="#">
                Move
              </a>
              <a className="dropdown-item" href="#">
                Copy
              </a>
              <a className="dropdown-item" href="#">
                Remove
              </a>
            </div>
          </div>
        </div>

        <ToggleButtonGroup size="small" exclusive onChange={handleViewChange} value={viewMode}>
          <ToggleButton value="list">
            <ViewListIcon />
          </ToggleButton>
          <ToggleButton value="module">
            <ViewModuleIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </div>

      <hr className="m-0" />
      <DownloadDialog
        open={openDownload}
        onClose={() => setOpenDownload(false)}
        onConfirm={handleDownload}
      />
    </>
  );
}
