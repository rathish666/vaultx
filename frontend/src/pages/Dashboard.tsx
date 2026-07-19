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

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [filesData, foldersData] = await Promise.all([
        apiFetch("/files"),
        apiFetch("/folders"),
      ]);
      setFiles(filesData);
      setFolders(foldersData);
    } catch (err: any) {
      setError(err.message || "Failed to load files");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8080/api/v1/files/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      await loadData();
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
      await loadData();
    } catch (err: any) {
      setError(err.message || "Delete failed");
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

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-600">VaultX</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.displayName || user?.email}</span>
          <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">
            Log out
          </button>
        </div>
      </div>

      <div className="mb-6">
        <label className="inline-block bg-blue-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-700">
          {uploading ? "Uploading..." : "Upload File"}
          <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          {folders.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Folders</h2>
              <div className="grid grid-cols-4 gap-3">
                {folders.map((f) => (
                  <div key={f.id} className="bg-white p-4 rounded shadow-sm border">
                    📁 {f.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Files</h2>
          {files.length === 0 ? (
            <p className="text-gray-500">No files yet. Upload one above.</p>
          ) : (
            <div className="bg-white rounded shadow-sm border divide-y">
              {files.map((f) => (
                <div key={f.id} className="flex justify-between items-center p-3">
                  <div>
                    <p className="font-medium">{f.filename}</p>
                    <p className="text-sm text-gray-500">{formatSize(f.sizeBytes)}</p>
                  </div>
                  <div className="flex gap-3">
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
    </div>
  );
}