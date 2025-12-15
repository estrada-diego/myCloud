import React, { useEffect, useState } from "react";
import { Button, Menu, MenuItem } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useFiles } from "../contexts/FileContext";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";


export default function UploadMenu() {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    const { files, path, currentDir, loadFiles, setPath } = useFiles();
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });


    const handleClick = (event) => {
      setAnchorEl(event.currentTarget);
    };
  
    const handleClose = () => {
      setAnchorEl(null);
    };
  
    const handleUpload = async (e, isFolder = false) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
      
        const formData = new FormData();
        for (const file of files) {
          formData.append("files", file);
          formData.append("paths", file.webkitRelativePath || file.name);
        }
      
        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) {
                setSnackbar({ open: true, message: "❌ Upload failed", severity: "error" });
            } else {
                setSnackbar({ open: true, message: "✅ Upload successful", severity: "success" });
                await loadFiles();
            }
        } catch (err) {
        } finally {
          handleClose();
        }
      };
      
      
  
    return (
        <>
        <div>
            <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={handleClick}
            sx={{
                height: "100%",
                marginRight: 0.5
            }}
            >
            Upload
            </Button>
    
            <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            >
            {/* Upload Files */}
            <MenuItem>
                <label style={{ cursor: "pointer", width: "100%" }}>
                📄 Upload Files
                <input
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => handleUpload(e, false)}
                />
                </label>
            </MenuItem>
    
            {/* Upload Folder */}
            <MenuItem>
                <label style={{ cursor: "pointer", width: "100%" }}>
                📁 Upload Folder
                <input
                    type="file"
                    webkitdirectory="true"
                    directory=""
                    hidden
                    onChange={(e) => handleUpload(e, true)}
                />
                </label>
            </MenuItem>
            </Menu>
        </div>
        <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
            <MuiAlert severity={snackbar.severity} variant="filled">
                {snackbar.message}
            </MuiAlert>
            </Snackbar>
        </>
    );
  }