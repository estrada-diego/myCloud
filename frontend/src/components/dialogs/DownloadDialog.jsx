import * as React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { useFiles } from "../../contexts/FileContext";

const API_BASE = "http://localhost:5050";

export default function DownloadDialog({ open, onClose, onConfirm }) {
  const { selectedFiles } = useFiles();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="download-dialog-title"
      aria-describedby="download-dialog-description"
    >
      <DialogTitle id="download-dialog-title">Download selected files?</DialogTitle>
      <DialogContent>
        <DialogContentText id="download-dialog-description">
          {selectedFiles.length === 0
            ? "No files selected."
            : `Do you want to download ${
                selectedFiles.length
              } selected file${selectedFiles.length > 1 ? "s" : ""}?`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          autoFocus
          variant="contained"
          color="primary"
        >
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
}
