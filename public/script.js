const API_BASE = "";
let currentDir = null;
let path = ["all files"]
const pathBar = document.getElementById("pathBar");

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${sizes[i]}`;
}

async function loadFiles(parentId = null, poppedState = false, reload = false) {
  currentDir = parentId;
  const res = await fetch(`${API_BASE}/files?format=json&parentId=${parentId || ""}`);
  const responseJson = await res.json();
  const files = responseJson.files;
  const parentName = responseJson.parentName;

  if (!poppedState && parentId && !reload) path.push(parentName);
  if (poppedState) path.pop();
  pathBar.innerText = "/" + path.join("/");


  const tbody = document.getElementById("fileTableBody");
  tbody.innerHTML = "";

  files.forEach(file => {
    const tr = document.createElement("tr");

    const nameCell = file.type === "📁"
      ? `<span class="clickable" onclick="openFolder(${file.id})">📁 ${file.originalname}</span>`
      : ` ${file.originalname}`;
    const ms = file.upload_time;
    const date = new Date(ms);


    tr.innerHTML = `
      <td>${nameCell}</td>
      <td>${file.type}</td>
      <td>${formatBytes(file.size)} bytes</td>
      <td>${date.toLocaleString()}</td>
      <td>
        <button onclick="downloadFile(${file.id}, '${file.originalname}')">Download</button>
        <button onclick="deleteFile(${file.id})">Delete</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function openFolder(parentId = null) {
  history.pushState({ parentId }, "", `?parentId=${parentId}`);
  await loadFiles(parentId, false, false);
  currentDir = parentId;
}

document.getElementById("uploadType").addEventListener("change", (e) => {
  const value = e.target.value;
  document.getElementById("fileInputWrapper").style.display = (value === "file") ? "block" : "none";
  document.getElementById("folderInputWrapper").style.display = (value === "folder") ? "block" : "none";
});

// Handle file upload
document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const type = document.getElementById("uploadType").value;
  const formData = new FormData();

  if (type === "file") {
    const files = document.getElementById("fileInput").files;
    for (let f of files) {
      formData.append("files", f);
      formData.append("paths", f.name);
    }
  } else if (type === "folder") {
    const files = document.getElementById("folderInput").files;
    for (let f of files) {
      formData.append("files", f);
      formData.append("paths", f.webkitRelativePath || f.name);
    }
  } else {
    alert("Please select an upload type.");
    return;
  }
  const res = await fetch("/upload", { method: "POST", body: formData });
  alert(await res.text());
  loadFiles(null, false, true);
});

window.addEventListener("popstate", (event) => {
  const parentId = event.state ? event.state.parentId : null;
  loadFiles(parentId, true);
});

// Download file
function downloadFile(id, name) {
  const link = document.createElement("a");
  link.href = `${API_BASE}/download/${id}`;
  link.download = name;
  link.click();
}

// Delete file
async function deleteFile(id) {
  if (!confirm("Delete this file?")) return;
  await fetch(`${API_BASE}/delete/${id}`, { method: "DELETE" });
  loadFiles(currentDir, false, true);
}

// Initial load
loadFiles(null, false, true);
