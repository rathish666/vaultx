import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiFetch } from "../api";

interface FileItem {
  id: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
}

interface FolderItem {
  id: string;
  name: string;
}

interface Breadcrumb {
  id: string | null;
  name: string;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [trashedFiles, setTrashedFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"files" | "trash">("files");

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: "My Files" }]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FileItem[] | null>(null);
  const [versionsFileId, setVersionsFileId] = useState<string | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function openVersions(fileId: string) {
    setVersionsFileId(fileId);
    try {
      const data = await apiFetch(`/files/${fileId}/versions`);
      setVersions(data);
    } catch (err: any) {
      setError(err.message || "Failed to load versions");
    }
}

function closeVersions() {
    setVersionsFileId(null);
    setVersions([]);
}

async function handleRestoreVersion(fileId: string, versionId: string) {
    try {
      const token = localStorage.getItem("accessToken");
      await fetch(`http://localhost:8080/api/v1/files/${fileId}/versions/${versionId}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      closeVersions();
      await loadData(currentFolderId);
    } catch (err: any) {
      setError(err.message || "Restore version failed");
    }
}

async function openPreview(file: FileItem) {
    setPreviewFile(file);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`http://localhost:8080/api/v1/files/${file.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      setPreviewUrl(window.URL.createObjectURL(blob));
    } catch (err: any) {
      setError(err.message || "Failed to load preview");
    }
}

function closePreview() {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
}

function isPreviewable(mimeType: string) {
    return mimeType.startsWith("image/") || mimeType === "application/pdf" || mimeType.startsWith("text/");
}

  async function loadData(folderId: string | null) {
    setLoading(true);
    setError("");
    try {
      const filesQuery = folderId ? `?folderId=${folderId}` : "";
      const foldersQuery = folderId ? `?parentFolderId=${folderId}` : "";
      const [filesData, foldersData] = await Promise.all([
        apiFetch(`/files${filesQuery}`),
        apiFetch(`/folders${foldersQuery}`),
      ]);
      setFiles(filesData);
      setFolders(foldersData);
    } catch (err: any) {
      setError(err.message || "Failed to load files");
    } finally {
      setLoading(false);
    }
  }

  async function loadTrash() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/files/trash");
      setTrashedFiles(data);
    } catch (err: any) {
      setError(err.message || "Failed to load trash");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (view === "files") {
      loadData(currentFolderId);
    } else {
      loadTrash();
    }
  }, [currentFolderId, view]);

  function openFolder(folder: FolderItem) {
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
  }

  function goToBreadcrumb(index: number) {
    const target = breadcrumbs[index];
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setCurrentFolderId(target.id);
  }

  async function handleNewFolder() {
    const name = window.prompt("Folder name:");
    if (!name) return;

    try {
      await apiFetch("/folders", {
        method: "POST",
        body: JSON.stringify({ name, parentFolderId: currentFolderId }),
      });
      await loadData(currentFolderId);
    } catch (err: any) {
      setError(err.message || "Failed to create folder");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("file", file);
      if (currentFolderId) formData.append("folderId", currentFolderId);

      const url = currentFolderId
        ? `http://localhost:8080/api/v1/files/upload?folderId=${currentFolderId}`
        : "http://localhost:8080/api/v1/files/upload";

      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      await loadData(currentFolderId);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    try {
      const token = localStorage.getItem("accessToken");
      await fetch(`http://localhost:8080/api/v1/files/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadData(currentFolderId);
    } catch (err: any) {
      setError(err.message || "Delete failed");
    }
  }

  async function handleRestore(id: string) {
    try {
      const token = localStorage.getItem("accessToken");
      await fetch(`http://localhost:8080/api/v1/files/${id}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadTrash();
    } catch (err: any) {
      setError(err.message || "Restore failed");
    }
  }

  function handleDownload(id: string, filename: string) {
    const token = localStorage.getItem("accessToken");
    fetch(`http://localhost:8080/api/v1/files/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const results = await apiFetch(`/files/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(results);
    } catch (err: any) {
      setError(err.message || "Search failed");
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults(null);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function switchView(next: "files" | "trash") {
    setView(next);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-600">VaultX</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.displayName || user?.email}</span>
          <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">
            Log out
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => switchView("files")}
          className={`px-4 py-2 text-sm font-medium ${
            view === "files" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"
          }`}
        >
          My Files
        </button>
        <button
          onClick={() => switchView("trash")}
          className={`px-4 py-2 text-sm font-medium ${
            view === "trash" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"
          }`}
        >
          Trash
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {view === "files" ? (
        <>
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="border rounded px-3 py-2 w-64 text-sm"
            />
            <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900">
              Search
            </button>
            {searchResults !== null && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-sm text-gray-500 hover:text-gray-800 px-2"
              >
                Clear
              </button>
            )}
          </form>

          <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                <button
                  onClick={() => goToBreadcrumb(i)}
                  className={i === breadcrumbs.length - 1 ? "font-semibold text-gray-800" : "hover:underline"}
                >
                  {b.name}
                </button>
              </span>
            ))}
          </div>

          <div className="mb-6 flex gap-3">
            <label className="inline-block bg-blue-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-700">
              {uploading ? "Uploading..." : "Upload File"}
              <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
            </label>
            <button
              onClick={handleNewFolder}
              className="bg-white border px-4 py-2 rounded hover:bg-gray-50"
            >
              New Folder
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <>
              {searchResults === null && folders.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Folders</h2>
                  <div className="grid grid-cols-4 gap-3">
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => openFolder(f)}
                        className="bg-white p-4 rounded shadow-sm border text-left hover:bg-gray-50"
                      >
                        📁 {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                {searchResults !== null ? `Search results for "${searchQuery}"` : "Files"}
              </h2>
              {(searchResults ?? files).length === 0 ? (
                <p className="text-gray-500">
                  {searchResults !== null ? "No matching files." : "No files here yet."}
                </p>
              ) : (
                <div className="bg-white rounded shadow-sm border divide-y">
                  {(searchResults ?? files).map((f) => (
                    <div key={f.id} className="flex justify-between items-center p-3">
                      <div>
                        <p className="font-medium">{f.filename}</p>
                        <p className="text-sm text-gray-500">{formatSize(f.sizeBytes)}</p>
                      </div>
                      <div className="flex gap-3">
    {isPreviewable(f.mimeType) && (
      <button
        onClick={() => openPreview(f)}
        className="text-gray-700 text-sm hover:underline"
      >
        Preview
      </button>
    )}
    <button
      onClick={() => openVersions(f.id)}
      className="text-gray-700 text-sm hover:underline"
    >
      Versions
    </button>
    <button
      onClick={() => handleDownload(f.id, f.filename)}
      className="text-blue-600 text-sm hover:underline"
    >
      Download
    </button>
    <button
      onClick={() => handleDelete(f.id)}
      className="text-red-600 text-sm hover:underline"
    >
      Delete
    </button>
</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Trash</h2>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : trashedFiles.length === 0 ? (
            <p className="text-gray-500">Trash is empty.</p>
          ) : (
            <div className="bg-white rounded shadow-sm border divide-y">
              {trashedFiles.map((f) => (
                <div key={f.id} className="flex justify-between items-center p-3">
                  <div>
                    <p className="font-medium">{f.filename}</p>
                    <p className="text-sm text-gray-500">{formatSize(f.sizeBytes)}</p>
                  </div>
                  <button
                    onClick={() => handleRestore(f.id)}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {versionsFileId && (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Version History</h3>
          <button onClick={closeVersions} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>
        {versions.length === 0 ? (
          <p className="text-gray-500 text-sm">No previous versions.</p>
        ) : (
          <div className="divide-y">
            {versions.map((v) => (
              <div key={v.id} className="flex justify-between items-center py-2 text-sm">
                <div>
                  <p>Version {v.versionNumber}</p>
                  <p className="text-gray-500">{formatSize(v.sizeBytes)} &middot; {new Date(v.createdAt).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handleRestoreVersion(versionsFileId, v.id)}
                  className="text-blue-600 hover:underline"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
)}

{previewFile && (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">{previewFile.filename}</h3>
          <button onClick={closePreview} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          {previewUrl && previewFile.mimeType.startsWith("image/") && (
            <img src={previewUrl} alt={previewFile.filename} className="max-w-full" />
          )}
          {previewUrl && previewFile.mimeType === "application/pdf" && (
            <iframe src={previewUrl} className="w-full h-[65vh]" title="PDF preview" />
          )}
          {previewUrl && previewFile.mimeType.startsWith("text/") && (
            <PreviewText url={previewUrl} />
          )}
        </div>
      </div>
    </div>
)}
    </div>
  );
  function PreviewText({ url }: { url: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    fetch(url).then((r) => r.text()).then(setText);
  }, [url]);
  return <pre className="text-sm whitespace-pre-wrap">{text}</pre>;
}
}
