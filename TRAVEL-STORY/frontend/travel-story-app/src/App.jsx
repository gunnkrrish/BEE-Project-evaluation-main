import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import React from 'react';

import Login from "./pages/Auth/Login";
import SignUp from "./pages/Auth/SignUp";
import Home from "./pages/Home/Home.jsx";
import AdminDashboard from "./pages/Home/AdminDashboard"; // Updated import path

const App = () => {
  return (
    <div>
      <Router>
        <Routes>
          <Route path="/" exact element={<Root />} />
          <Route path="/dashboard" exact element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/login" exact element={<Login />} />
          <Route path="/signup" exact element={<SignUp />} />
          <Route path="/admin" exact element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        </Routes>
      </Router>
    </div>
  );
};

// Root redirect based on authentication
const Root = () => {
  const isAuthenticated = !!localStorage.getItem("token");
  return isAuthenticated ? (
    <Navigate to="/dashboard" />
  ) : (
    <Navigate to="/login" />
  );
};

// Protected route for authenticated users (including guests)
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem("token");
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const isGuest = userInfo.isGuest === true;
  
  // Allow both regular authenticated users and guest users
  if (isAuthenticated || isGuest) {
    return children;
  }
  
  return <Navigate to="/login" />;
};

// Admin-only route
const AdminRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem("token");
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const isAdmin = userInfo.isAdmin === true;
  
  if (isAuthenticated && isAdmin) {
    return children;
  }
  
  // Redirect non-admins to dashboard
  return <Navigate to="/dashboard" />;
};

export default App;
