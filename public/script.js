const API_BASE = "";
let currentDir = null;

async function loadFiles(parentId = null) {
  currentDir = parentId;
  const res = await fetch(`${API_BASE}/files?format=json&parentId=${parentId || ""}`);
  const responseJson = await res.json();
  const files = responseJson.files;
  const parentName = responseJson.parentName;

  if (parentId) {
    const pathBar = document.getElementById("pathBar").innerText += "/" + parentName;
  }

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
      <td>${file.size} bytes</td>
      <td>${date.toLocaleString()}</td>
      <td>
        ${file.type === "📄" ? `<button onclick="downloadFile(${file.id}, '${file.originalname}')">Download</button>` : ""}
        <button onclick="deleteFile(${file.id})">Delete</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function openFolder(parentId = null) {
  history.pushState({ parentId }, "", `?parentId=${parentId}`);
  await loadFiles(parentId);
  currentDir = parentId;
}

// Fetch files and populate table
// async function loadFiles() {
//   const res = await fetch(`${API_BASE}/files?format=json`);
//   const files = await res.json();
//   const tbody = document.getElementById("fileTableBody");
//   tbody.innerHTML = "";

//   files.forEach(file => {
//     const tr = document.createElement("tr");

//     tr.innerHTML = `
//       <td>${file.id}</td>
//       <td>${file.type}</td>
//       <td>${file.originalname}</td>
//       <td>${file.size} bytes</td>
//       <td>
//         <button class="action-btn download" onclick="downloadFile(${file.id}, '${file.originalname}')">Download</button>
//         <button class="action-btn delete" onclick="deleteFile(${file.id})">Delete</button>
//       </td>
//     `;

//     tbody.appendChild(tr);
//   });
// }

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
  loadFiles();
});

window.addEventListener("popstate", (event) => {
  const parentId = event.state ? event.state.parentId : null;
  loadFiles(parentId);
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
  loadFiles();
}

// Initial load
loadFiles();
