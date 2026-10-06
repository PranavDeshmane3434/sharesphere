import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Upload from "./pages/Upload";
import Browse from "./pages/Browse";
import Admin from "./pages/Admin";
import Transactions from "./pages/Transactions";
import ProtectedRoute from "./components/ProtectedRoute";
import { Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

function Home() {
  const { user } = useAuth();

  return (
    <div className="hero">
      <h1>Share. Learn. Grow.</h1>
      <p>Upload your notes, earn credits, and download what the rest of your class has shared.</p>
      <div className="hero-actions">
        <Link to="/browse" className="btn btn-primary">Browse resources</Link>
        <Link to="/upload" className="btn">Upload a resource</Link>
      </div>

      <div className="credit-explainer">
        <div className="credit-explainer-item">
          <div className="amount earn">+5 credits</div>
          <p>Upload a resource and earn credits once it's confirmed.</p>
        </div>
        <div className="credit-explainer-item">
          <div className="amount spend">-2 credits</div>
          <p>Download a resource to spend credits from your balance.</p>
        </div>
        {user && (
          <div className="credit-explainer-item">
            <div className="amount">{user.credits} credits</div>
            <p>Your current balance.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
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
              path="/transactions"
              element={
                <ProtectedRoute>
                  <Transactions />
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
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
