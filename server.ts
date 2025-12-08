import express, { Request, Response } from "express";
import multer from "multer";
import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";
import morgan from "morgan";
import cors from "cors";
import archiver from "archiver";
import mime from "mime-types";


const app = express();
const PORT = 5000;
const STORAGE_DIR = './cloudStorage'
const DB_FILE = path.join(__dirname, "files.db");
const MAX_STORAGE_BYTES = 1 * 1024 * 1024 * 1024 * 1024
let usedStorage = 0;

app.use(cors());
app.use(express.json());

/**
 * Represents a file record in the db.
 */
interface FileRecord {
  filename: string,
  originalname: string,
  type: string,
  id: number,
  parentId: number,
  size: number
}

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR);
}

// Begin helper functions

/**
 * Updates diectory's size when new files are added or deleted.
 * @param parentId the ID of the directory this file is in.  
 * @param delta the difference being applied to the parent dir.
 * @returns 
 */
function updateParentSizes(parentId: number | null, delta: number) {
  if (!parentId) return;
  db.get<FileRecord>("SELECT parentId FROM files WHERE id = ?", [parentId], (err, row) => {
    db.run("UPDATE files SET size = size + ? WHERE id = ?", [delta, parentId]);
    if (row && row.parentId) updateParentSizes(row.parentId, delta);
  });
}

function getUsedStorage(): Promise<number> {
  return new Promise((resolve, reject) => {
    db.get<{ total: number }>(
      "SELECT SUM(size) AS total FROM files WHERE parentId = null",
      (err, row) => {
        if (err) return reject(err);
        resolve(row?.total || 0);
      }
    );
  });
}

/**
 * Recursively deletes the files whenever a directory is delted.
 * @param rootId the id of the folder being deleted.
 */
async function deleteAllChildren(rootId: number) {
  const stack = [rootId];

  while (stack.length > 0) {
    const currentId = stack.pop();

    db.all<{type: string, filename: string, id: number}>
    ("SELECT id, parentId, filename, type FROM files WHERE parentId = ?", 
    [currentId], (err, rows) => {
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

/**
 * Adds a file to a directory. If the directories don't exist, 
 * it creates them.
 * @param parts the path's nodes' names.
 * @param file the metadata of the file.
 */
async function ensurePath(parts: string[], file: Express.Multer.File) {
  let parentId: number | null = null;

  for (let j = 0; j < parts.length; j++) {
    const name = parts[j];
    const isFile = (j === parts.length - 1);

    if (isFile) {
      await new Promise<void>((resolve) => {
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
        db.get<FileRecord>(
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

// End helper functions


// Setup multer for file uploads
const upload = multer({ dest: STORAGE_DIR });

// Init SQLite DB
const db = new sqlite3.Database("files.db");
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
db.get<{ total: number }>(
  "SELECT SUM(size) AS total FROM files WHERE type = '📄'",
  (err, row) => {
    usedStorage = row?.total || 0;
    console.log(`Storage initialized. Used: ${(usedStorage / (1024 ** 3)).toFixed(2)} GB`);
  }
);

// Upload endpoint
app.post("/upload", upload.array("files"), async (req: Request, res) => {
  const files = req.files as Express.Multer.File[];
  const paths = req.body.paths as string | string[];

  const incomingTotal = files.reduce((sum, f) => sum + f.size, 0);

  if (usedStorage + incomingTotal > MAX_STORAGE_BYTES) {
    const remaining = MAX_STORAGE_BYTES - usedStorage;
    return res
      .status(400)
      .send(`Storage limit exceeded. Only ${(remaining / (1024 ** 3)).toFixed(2)} GB left.`);
  }

  usedStorage += incomingTotal;

  if (!files?.length) return res.status(400).send("No files uploaded");

  for (let i = 0; i < files.length; i++) {
    const file= files[i];
    const relativePath = Array.isArray(paths) ? paths[i] : paths;
    if (!relativePath) continue;
    console.log(relativePath);

    const parts = relativePath.split("/");
    await ensurePath(parts, file!);
  }

  res.send("Upload successful");
});

// Uploads a zip
app.post("/download-multiple", express.json(), async (req: Request, res: Response) => {
  const { ids } = req.body as { ids: string[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "No file IDs provided." });
  }

  try {
    const archive = archiver("zip", { zlib: { level: 9 } });

    res.attachment("files.zip");
    archive.pipe(res);

    // Fetch all file paths in parallel
    const fileRows = await Promise.all(
      ids.map(
        (id) =>
          new Promise<{ originalname: string; filepath: string } | null>((resolve) => {
            db.get(
              "SELECT originalname, filepath FROM files WHERE id = ?",
              [id],
              (err, row) => {
                if (err || !row) resolve(null);
                else resolve(row as { originalname: string; filepath: string });
              }
            );
          })
      )
    );

    for (const row of fileRows) {
      if (row && fs.existsSync(row.filepath)) {
        archive.file(row.filepath, { name: row.originalname });
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error("Error creating zip:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to create zip archive" });
    }
  }
});
// View file inline
app.get("/view/:id", (req, res) => {
  db.get<FileRecord>("SELECT * FROM files WHERE id = ?", [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).send("Not found");

    const filepath = path.join(STORAGE_DIR, row.filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).send("File missing on disk");
    }

    const mimeType = mime.lookup(row.originalname) || "application/octet-stream";

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", "inline");

    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
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
      safeDir,           
      safeDir,           
      0,                 
      Date.now(),        
      "📁"               
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

  db.all<FileRecord>(
    "SELECT id, originalname, size, type, upload_time FROM files WHERE parentId IS ?",
    [parentId],
    (err, rows) => {
      if (err) return res.status(500).send("DB error");

      function getPathRecursive(id: number | null, cb: (path: string[]) => void) {
        if (!id) return cb([]);
        db.get<FileRecord>(
          "SELECT originalname, parentId FROM files WHERE id = ?",
          [id],
          (err2, row) => {
            if (err2 || !row) return cb([]);
            getPathRecursive(row.parentId, (prev) => cb([...prev, row.originalname]));
          }
        );
      }

      getPathRecursive(parentId ? Number(parentId) : null, (pathArr) => {
        res.json({
          parentName: pathArr[pathArr.length - 1] || null,
          path: pathArr,
          files: rows,
        });
      });
    }
  );
});


// Download file
app.get("/download/:id", (req, res) => {
  db.get<FileRecord>("SELECT * FROM files WHERE id = ?", [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).send("Not found");
    const filepath = path.join(STORAGE_DIR, row.filename);
    res.download(filepath, row.originalname);
  });
});

// Delete file
app.delete("/delete/:id", (req, res) => {

  db.get<FileRecord>("SELECT id, parentId, type, filename FROM files WHERE id = ?", [req.params.id], (err, row) => {
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
      usedStorage -= row.size;
      if (usedStorage < 0) usedStorage = 0;
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

app.get("/storage-usage", (req, res) => {
  res.json({
    used: usedStorage,
    limit: MAX_STORAGE_BYTES,
    percent: (usedStorage / MAX_STORAGE_BYTES) * 100,
  });
});


app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "my-cloud-frontend", "public")));


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.listen(PORT, "localhost", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

