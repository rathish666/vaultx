import { useAuth } from "../AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-600">VaultX</h1>
        <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">
          Log out
        </button>
      </div>
      <p className="text-lg">Welcome, {user?.displayName || user?.email}.</p>
      <p className="text-gray-500 mt-2">Your files will show up here soon.</p>
    </div>
  );
}