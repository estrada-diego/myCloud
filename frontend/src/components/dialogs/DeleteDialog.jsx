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

export default function DeleteDialog({ open, onClose, onConfirm }) {
  const { selectedFiles } = useFiles();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">Delete selected files?</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {selectedFiles.length === 0
            ? "No files selected."
            : `Are you sure you want to delete ${
                selectedFiles.length
              } file${selectedFiles.length > 1 ? "s" : ""}? This action cannot be undone.`}
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
          color="error"
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
