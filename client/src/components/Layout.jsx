import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const wide = pathname.startsWith("/resources/");

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link to="/" className="site-logo">
            ShareSphere
          </Link>
          <nav className="site-nav">
            {user ? (
              <>
                <div className="nav-links">
                  <Link to="/browse">Browse</Link>
                  <Link to="/upload">Upload</Link>
                  <Link to="/transactions">Transactions</Link>
                  {user.role === "ADMIN" && <Link to="/admin">Admin</Link>}
                </div>
                {user.role !== "ADMIN" && (
                  <span className="credit-badge">{user.credits} credits</span>
                )}
                <span className="nav-divider"></span>
                <button className="logout-btn" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <div className="nav-links">
                <Link to="/login">Log in</Link>
                <Link to="/register">Register</Link>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className={`page${wide ? " page-wide" : ""}`}>
        <Outlet />
      </main>
    </>
  );
}
