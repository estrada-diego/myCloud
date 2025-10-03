const API_BASE = "http://localhost:5000";

// Fetch files and populate table
async function loadFiles() {
  const res = await fetch(`${API_BASE}/files?format=json`);
  const files = await res.json();
  const tbody = document.getElementById("fileTableBody");
  tbody.innerHTML = "";

  files.forEach(file => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${file.id}</td>
      <td>${file.type}</td>
      <td>${file.originalname}</td>
      <td>${file.size} bytes</td>
      <td>
        <button class="action-btn download" onclick="downloadFile(${file.id}, '${file.originalname}')">Download</button>
        <button class="action-btn delete" onclick="deleteFile(${file.id})">Delete</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// Handle file upload
document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById("fileInput");
  if (fileInput.files.length === 0) return;

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData
  });

  fileInput.value = "";
  loadFiles(); // Refresh list
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
