const API_BASE = "";
let currentDir = null;
let path = []
const pathBar = document.querySelector(".breadcrumb");

function getParentIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("parentId");
  return id ? Number(id) : null;
}

function updateBreadcrumbs(parentId, poppedState, reload, parentName) {

  if (!poppedState && parentId && !reload) {
    path.push(parentName);
  }
  if (poppedState) path.pop();

  // Clear existing breadcrumb items
  pathBar.innerHTML = "";

  // Always start with "home"
  const homeItem = document.createElement("li");
  homeItem.className = "breadcrumb-item";
  const homeLink = document.createElement("a");
  homeLink.href = "javascript:void(0)";
  homeLink.textContent = "home";
  homeLink.onclick = () => {
    path = []
    openFolder(); 
  }
  homeItem.appendChild(homeLink);
  pathBar.appendChild(homeItem);

  // Add each path segment after "home"
  for (let i = 0; i < path.length; i++) {
    console.log(i, path);
    const li = document.createElement("li");
    li.className = "breadcrumb-item";
    if (i === path.length - 1) {
      // Last item (current directory)
      li.classList.add("active");
      li.textContent = path[i];
    } else {
      // Intermediate items - could be made clickable if you store IDs
      const link = document.createElement("a");
      link.href = "javascript:void(0)";
      link.textContent = path[i];
      // Optional: make intermediate paths navigable if you store IDs
      // link.onclick = () => openFolder(pathIds[i]);
      li.appendChild(link);
    }
    pathBar.appendChild(li);
  }
}
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

  updateBreadcrumbs(parentId, poppedState, reload, parentName);


  const tbody = document.getElementById("fileContainer");
  tbody.innerHTML = "";

  files.forEach(file => {
    const fd = document.createElement("div");
    fd.className = "file-item"

    // const nameCell = file.type === "📁"
    //   ? `<span class="clickable" onclick="openFolder(${file.id})">📁 ${file.originalname}</span>`
    //   : ` ${file.originalname}`;
    const ms = file.upload_time;
    const date = new Date(ms);


    fd.innerHTML = `
        <div class="file-item-select-bg bg-primary"></div>
        <label class="file-item-checkbox custom-control custom-checkbox">
            <input type="checkbox" class="custom-control-input" />
            <span class="custom-control-label"></span>
        </label>
        <div class="file-item-icon far ${(file.type === '📁') ? "fa-folder" : "fa-file"} text-secondary"></div>
        <a href="javascript:void(0)" class="file-item-name">
            ${file.originalname}
        </a>
        <div class="file-item-changed">${date.toLocaleString()}</div>
        <div class="file-item-actions btn-group">
            <button type="button" class="btn btn-default btn-sm rounded-pill icon-btn borderless md-btn-flat hide-arrow dropdown-toggle" data-toggle="dropdown"><i class="ion ion-ios-more"></i></button>
            <div class="dropdown-menu dropdown-menu-right">
                <a class="dropdown-item" href="javascript:void(0)">Rename</a>
                <a class="dropdown-item" href="javascript:void(0)">Move</a>
                <a class="dropdown-item" href="javascript:void(0)">Copy</a>
                <a class="dropdown-item" href="javascript:void(0)">Remove</a>
            </div>
        </div>
    `;
    tbody.appendChild(fd);

    fd.addEventListener("click", () => openFolder(file.id));


  });
}

async function openFolder(parentId = null) {
  history.pushState({ parentId }, "", `?parentId=${parentId}`);
  await loadFiles(parentId, false, false);
  currentDir = parentId;
}

// document.getElementById("uploadType").addEventListener("change", (e) => {
//   const value = e.target.value;
//   document.getElementById("fileInputWrapper").style.display = (value === "file") ? "block" : "none";
//   document.getElementById("folderInputWrapper").style.display = (value === "folder") ? "block" : "none";
// });

// Handle file upload
// document.getElementById("uploadForm").addEventListener("submit", async (e) => {
//   e.preventDefault();

//   const type = document.getElementById("uploadType").value;
//   const formData = new FormData();

//   if (type === "file") {
//     const files = document.getElementById("fileInput").files;
//     for (let f of files) {
//       formData.append("files", f);
//       formData.append("paths", f.name);
//     }
//   } else if (type === "folder") {
//     const files = document.getElementById("folderInput").files;
//     for (let f of files) {
//       formData.append("files", f);
//       formData.append("paths", f.webkitRelativePath || f.name);
//     }
//   } else {
//     alert("Please select an upload type.");
//     return;
//   }
//   const res = await fetch("/upload", { method: "POST", body: formData });
//   alert(await res.text());
//   loadFiles(null, false, true);
// });

window.addEventListener("popstate", (event) => {
  const parentId = getParentIdFromURL();
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
