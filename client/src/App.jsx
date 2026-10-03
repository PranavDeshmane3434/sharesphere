import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Upload from "./pages/Upload";
import Browse from "./pages/Browse";
import Admin from "./pages/Admin";
import Transactions from "./pages/Transactions";
import ProtectedRoute from "./components/ProtectedRoute";

function Home() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h1>ShareSphere</h1>

      {user ? (
        <div>
          <p>
            Logged in as {user.email} — Credits: {user.credits}
          </p>

          <nav>
            <Link to="/browse">Browse</Link>
            {" | "}
            <Link to="/upload">Upload</Link>
            {" | "}
            <Link to="/transactions">Transactions</Link>
            
            {user.role === "ADMIN" && (
              <>
                {" | "}
                <Link to="/admin">Admin</Link>
              </>
            )}
          </nav>

          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <p>
          <Link to="/login">Login</Link>
          {" or "}
          <Link to="/register">Register</Link>
        </p>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />

          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            }
          />

          <Route
            path="/browse"
            element={
              <ProtectedRoute>
                <Browse />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <Transactions />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
