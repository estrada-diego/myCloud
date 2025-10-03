const express = require("express");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;
app.use(express.json());
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
      upload_time INTEGER,
      type TEXT CHECK(type IN ('file','dir')) NOT NULL DEFAULT 'file'
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
// Create a directory
app.post("/mkdir", (req, res) => {
  const { dirname } = req.body;
  if (!dirname) return res.status(400).send("Missing dirname");

  const safeDir = path.basename(dirname);
  const dirPath = path.join(STORAGE_DIR, safeDir);

  if (fs.existsSync(dirPath)) {
    return res.status(400).send("Directory already exists");
  }

  fs.mkdirSync(dirPath);
  console.log(safeDir);
  db.run(
    "INSERT INTO files (filename, originalname, size, upload_time, type) VALUES (?, ?, ?, ?, ?)",
    [
      safeDir,            // filename (same as originalname since no multer)
      safeDir,            // originalname
      0,                  // size = 0 for dirs
      Date.now(),         // timestamp
      "dir"               // mark as directory
    ],
    function (err) {
      console.log(err);
      if (err) return res.status(500).send("DB error");
      res.send(`Directory created: ${dirname}`);
    }
  );
});

// List files
app.get("/files", (req, res) => {
  db.all("SELECT id, originalname, size, type, upload_time FROM files", [], (err, rows) => {
    if (err) return res.status(500).send("DB error");

    const fmt = req.query.format || "json";
    if (fmt === "text") {
      // Determine column widths
      const idWidth = Math.max(...rows.map(r => String(r.id).length), 2);
      const nameWidth = Math.max(...rows.map(r => r.originalname.length), 12);
      const sizeWidth = Math.max(...rows.map(r => String(r.size).length), 4);
      const typeWidth = 4;

      // Header row
      let out = [
        String("ID").padEnd(idWidth),
        String("Type").padEnd(typeWidth),
        String("Name").padEnd(nameWidth),
        String("Size").padEnd(sizeWidth),
      ].join("  ") + "\n";

      // Data rows
      out += rows.map(r =>
        String(r.id).padEnd(idWidth) + "  " +
        String(r.type). padEnd(typeWidth) + "  " + 
        r.originalname.padEnd(nameWidth) + "  " +
        String(r.size).padEnd(sizeWidth) + " bytes"
        
      ).join("\n");

  

      res.type("text/plain").send(out + "\n");
    } else if (fmt === "csv") {
      const out = ["id,originalname,size,upload_time"]
        .concat(rows.map(r =>
          `${r.id},"${r.originalname.replace(/"/g,'""')}",${r.size},${r.upload_time}`
        ))
        .join("\n");
      res.type("text/csv").send(out + "\n");
    } else {
      res.json(rows);
    }
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
app.use(express.static(path.join(__dirname, "public")));

