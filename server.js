const express = require("express");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const morgan = require("morgan");
const cors = require("cors");

const app = express();
const PORT = 5000;
app.use(express.json());
const STORAGE_DIR = './cloudStorage'
const DB_FILE = path.join(__dirname, "files.db");

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR);
}

function updateParentSizes(parentId, delta) {
  if (!parentId) return;
  db.get("SELECT parentId FROM files WHERE id = ?", [parentId], (err, row) => {
    db.run("UPDATE files SET size = size + ? WHERE id = ?", [delta, parentId]);
    if (row && row.parentId) updateParentSizes(row.parentId, delta);
  });
}
async function deleteAllChildren(rootId) {
  const stack = [rootId];

  while (stack.length > 0) {
    const currentId = stack.pop();

    db.all("SELECT id, parentId, filename, type FROM files WHERE parentId = ?", [currentId], (err, rows) => {
      if (err) {
        console.error("DB error while fetching children:", err);
        return;
      }

      rows.forEach((row) => {
        if (row.type === "📁") {
          stack.push(row.id);
        } else {
          const filePath = path.join(STORAGE_DIR, row.filename);
          fs.unlink(filePath, (fsErr) => {
            if (fsErr && fsErr.code !== "ENOENT") {
              console.error("Failed to delete file:", fsErr);
            }
            db.run("DELETE FROM files WHERE id = ?", [row.id], (dbErr) => {
              if (dbErr) console.error("DB error deleting file:", dbErr);
            });
          });
        }
      });

      db.run("DELETE FROM files WHERE id = ?", [currentId], (dbErr) => {
        if (dbErr) console.error("DB error deleting folder:", dbErr);
      });
    });
  }
}


async function ensurePath(parts, file) {
  let parentId = null;

  for (let j = 0; j < parts.length; j++) {
    const name = parts[j];
    const isFile = (j === parts.length - 1);

    if (isFile) {
      await new Promise((resolve) => {
        db.run(
          `INSERT INTO files (filename, originalname, size, upload_time, type, parentId)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [file.filename, name, file.size, Date.now(), "📄", parentId],
          (err) => {
            if (err) console.error("Insert file error:", err.message);
            else updateParentSizes(parentId, file.size);
            resolve();
          }
        );
      });
    } else {
      // Folder check or creation
      parentId = await new Promise((resolve) => {
        db.get(
          `SELECT id FROM files WHERE originalname = ? AND parentId IS ? AND type = '📁'`,
          [name, parentId],
          (err, row) => {
            if (err) {
              console.error("DB error while checking folder:", err.message);
              return resolve(parentId);
            }
            if (row) {
              return resolve(row.id);
            } else {
              db.run(
                `INSERT INTO files (filename, originalname, size, upload_time, type, parentId)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [name, name, 0, Date.now(), "📁", parentId],
                function (err2) {
                  if (err2) {
                    console.error("Failed to insert folder:", err2.message);
                    return resolve(parentId);
                  }
                  resolve(this.lastID);
                }
              );
            }
          }
        );
      });
    }
  }
}


// Setup multer for file uploads
const upload = multer({ dest: STORAGE_DIR });

// Init SQLite DB
const db = new sqlite3.Database(DB_FILE);
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      originalname TEXT NOT NULL,
      size INTEGER,
      upload_time INTEGER,
      type TEXT CHECK(type IN ('📄','📁')) NOT NULL DEFAULT '📄',
      parentId INTEGER REFERENCES files(id) ON DELETE CASCADE,
      UNIQUE (originalname, parentId)  
    )
  `);
});

// Upload endpoint
app.post("/upload", upload.array("files"), async (req, res) => {
  const paths = req.body.paths;
  if (!req.files?.length) return res.status(400).send("No files uploaded");

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    const relativePath = Array.isArray(paths) ? paths[i] : paths;
    if (!relativePath) continue;
    console.log(relativePath);

    const parts = relativePath.split("/");
    await ensurePath(parts, file, relativePath);
  }

  res.send("Upload successful");
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
      "📁"               // mark as directory
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
  const parentId = req.query.parentId || null;

  db.all(
    "SELECT id, originalname, size, type, upload_time FROM files WHERE parentId IS ?",
    [parentId],
    (err, rows) => {
      if (err) return res.status(500).send("DB error");

      const fmt = req.query.format || "json";
      
      if (fmt === "json") {
        if (!parentId) {
          return res.json({ parentName: null, files: rows });
        }
        db.get("SELECT originalname FROM files WHERE id = ?", [parentId], (err2, parent) => {
          if (err2) return res.status(500).send("DB error");
          res.json({
            parentName: parent ? parent.originalname : null,
            files: rows
          });
        });

      } else if (fmt === "csv") {
        const out = ["id,originalname,size,upload_time,type"]
          .concat(rows.map(r =>
            `${r.id},"${r.originalname.replace(/"/g,'""')}",${r.size},${r.upload_time},${r.type}`
          ))
          .join("\n");
        res.type("text/csv").send(out + "\n");
      } else {
        res.type("text/plain").send(rows.map(r => 
          `${r.id}\t${r.type}\t${r.originalname}\t${r.size} bytes`
        ).join("\n"));
      }
    }
  );
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

  db.get("SELECT id, parentId, type, filename FROM files WHERE id = ?", [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).send("Not found");

    const physicalPath = path.resolve(STORAGE_DIR, row.filename);

    if (!physicalPath.startsWith(path.resolve(STORAGE_DIR) + path.sep)) {
      return res.status(400).send("Invalid file path");
    }
    if (row.type === "📁") {
      db.all("SELECT id, parentId FROM files WHERE parentId = ?", [row.id], async (dbErr, rows) => {
        if (dbErr) return res.status(500).send("DB error");
        await deleteAllChildren(row.id);
      });
    } else {
      fs.unlink(physicalPath, (fsErr) => {
        if (fsErr) console.error("Failed to delete file:", fsErr);
        db.run("DELETE FROM files WHERE id = ?", [req.params.id], (dbErr) => {
          if (dbErr) return res.status(500).send("DB error");
        });
      });
      
    }
    res.send(`File deleted: ${row.originalname}\n`);
  });
});

app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.listen(PORT, "localhost", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

