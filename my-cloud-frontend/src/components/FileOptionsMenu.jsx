import React, { useState } from "react";
import { IconButton, Menu, MenuItem } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import { useFiles } from "../contexts/FileContext"; // or correct path


const API_BASE = "http://localhost:5000";

export function FileOptionsMenu({ onOpen, onDownload, onDelete, file }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const { loadFiles, currentDir } = useFiles();

  const handleClick = (event) => {
    event.stopPropagation(); // prevent triggering parent click
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (event) => {
    event.stopPropagation();
    setAnchorEl(null);
  };

  const handleDelete = async (event) => {

    try {
      let res = await fetch(`${API_BASE}/delete/${file.id}`, {
        method: "DELETE",
      });
  
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Download failed: ${text}`);
      }

  
    } catch (err) {
      console.error("Error during download:", err);
    } finally {
      handleClose(event);
      loadFiles(currentDir);
    }
    
  }

  return (
    <>
      <IconButton
        aria-label="More options"
        size="small"
        className="settings-button"
        onClick={handleClick}
      >
        <FontAwesomeIcon icon={faEllipsisV} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        onClick={(e) => e.stopPropagation()} // keeps menu clicks from bubbling up
      >
        {file.type !== "📁" && <MenuItem
          onClick={(e) => {
            e.stopPropagation()
            window.open(`${API_BASE}/view/${file.id}`, "_blank");
             handleClose(e);
          }}
        >
          Open
        </MenuItem>}
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDownload?.();

            handleClose(e);
          }}
        >
          Download
        </MenuItem>
        <MenuItem
          onClick={(e) => {
            handleDelete(e);
            e.stopPropagation();
            onDelete?.();
            handleClose(e);
          }}
        >
          Delete
        </MenuItem>
      </Menu>
    </>
  );
}
