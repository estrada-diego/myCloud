const express = require("express");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;
const STORAGE_DIR = '/mnt/ssd/cloudStorage'
const DB_FILE = path.join(__dirname, "files.db");

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR);
}

// Setup multer for file uploads
const upload = multer({ dest: STORAGE_DIR });

// Init SQLite DB
const db = new sqlite3.Database(DB_FILE);
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT,
      originalname TEXT UNIQUE,
      size INTEGER,
      upload_time INTEGER
    )
  `);
});

// Upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
  const { filename, originalname, size } = req.file;

  db.get(
  "SELECT EXISTS(SELECT 1 FROM files WHERE originalname = ?) AS found",
  [filename],
  (err, row) => {
    if (row.found) {
      return res.status(400).send("File name already exists. Please select another name.");
    } 
    db.run(
    "INSERT INTO files (filename, originalname, size, upload_time) VALUES (?, ?, ?, ?)",
    [filename, originalname, size, Date.now()],
    function (err) {
      
      if (err) {
        if (err.code === "SQLITE_CONSTRAINT") {
          return res.status(409).send("File name already exists.");
        }
        return res.status(500).send("DB error");
      }
      res.send(`File uploaded: ${originalname}`);
    }
  );
  });
});

// List files
app.get("/files", (req, res) => {
  db.all("SELECT id, originalname, size, upload_time FROM files", [], (err, rows) => {
    if (err) return res.status(500).send("DB error");
    res.json(rows);
  });
});

// Download file
app.get("/download/:id", (req, res) => {
  db.get("SELECT * FROM files WHERE id = ?", [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).send("Not found");
    const filepath = path.join(STORAGE_DIR, row.filename);
    res.download(filepath, row.originalname);
  });
});

// Delete file
app.delete("/delete/:id", (req, res) => {
  db.get("SELECT * FROM files WHERE id = ?", [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).send("Not found");

    const filepath = path.join(STORAGE_DIR, row.filename);
    if (!filepath.startsWith(STORAGE_DIR)) {
      // For safety reasons
      return res.status(400).send("Invalid file path");
    }

    fs.unlink(filepath, (fsErr) => {
      if (fsErr) console.error("Failed to delete file:", fsErr);

      db.run("DELETE FROM files WHERE id = ?", [req.params.id], function (dbErr) {
        if (dbErr) return res.status(500).send("DB error");
        res.send(`File deleted: ${row.originalname}\n`);
      });
    });
  });
});

app.listen(PORT, "localhost", () => {
  console.log(`Server running at localhost:${PORT}`);
});
