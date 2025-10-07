import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../../components/input/PasswordInput";
import { validateEmail } from "../../utils/helper";
import axiosInstance from "../../utils/axiosInstance";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
  
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter a password");
      return;
    }
    setError("");
  
    try {
      const response = await axiosInstance.post("/login", { 
        email: email, 
        password: password,
      });
  
      console.log("Login response:", response.data);  // Debugging
  
      if (response.data) { 
        // localStorage.setItem("token", response.data.accessToken);
        // localStorage.setItem("userInfo", JSON.stringify(response.data.user)); // Store user info
        // navigate("/dashboard");
        localStorage.setItem("token", response.data.accessToken);
      localStorage.setItem("userInfo", JSON.stringify(response.data.user));
      
      // Check if user is admin and redirect accordingly
      if (response.data.user.isAdmin) {
        navigate("/admin"); // Redirect to admin dashboard
      } else {
        navigate("/dashboard"); // Redirect to regular dashboard
      }
      }
    } catch (error) {
      console.error("Login failed", error.response ? error.response.data : error);
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };
  
  // Add guest login function
  const handleGuestLogin = () => {
    // Create guest user object
    const guestUser = {
      id: `guest-${Date.now()}`,
      name: "Guest User",
      email: "guest@example.com",
      isGuest: true
    };
    
    // Store guest user in localStorage (not in users.json)
    localStorage.setItem("userInfo", JSON.stringify(guestUser));
    localStorage.setItem("token", `guest-token-${Date.now()}`); // Dummy token
    
    // Navigate to dashboard
    navigate("/dashboard");
  };
  
  return (
    <div className="h-screen bg-cyan-50 overflow-hidden relative">
      <div className="login-ui-box right-10 -top-40" />
      <div className="login-ui-box bg-cyan-200 -bottom-40 right-1/2" />
      <div className="container h-screen flex items-center justify-center px-20 mx-auto">
        <div className="w-2/4 h-[90vh] flex items-end bg-login-bg-img bg-cover bg-center rounded-lg p-10 z-50">
          <div>
            <h4 className="text-5xl text-white font-semibold leading-[58px]">
              Capture Your <br /> Journeys
            </h4>
            <p className="text-[15px] text-white leading-6 pr-7 mt-4">
              Record your travel experiences and memories in your personal
              travel journal.
            </p>
          </div>
        </div>

        <div className="w-2/4 h-[75vh] bg-white rounded-r-lg relative p-16 shadow-lg shadow-cyan-200/20">
          <form onSubmit={handleLogin}>
            <h4 className="text-2xl font-semibold mb-7">Login</h4>
            <input
              type="text"
              placeholder="Email"
              className="input-box"
              value={email}
              onChange={({ target }) => setEmail(target.value)}
            />

            <PasswordInput
              value={password}
              onChange={({ target }) => setPassword(target.value)}
            />

            {error && <p className="text-red-500 text-xs pb-1">{error}</p>}

            <button type="submit" className="btn-primary">
              LOGIN
            </button>

            <p className="text-xs text-slate-500 text-center my-4">Or</p>

            <button
              type="button"
              className="btn-primary btn-light mb-3"
              onClick={() => navigate("/signUp")}
            >
              CREATE ACCOUNT
            </button>
            
            {/* Add Guest Login Button */}
            <button
              type="button"
              className="btn-primary btn-light bg-gray-100 hover:bg-gray-200 text-gray-700"
              onClick={handleGuestLogin}
            >
              LOGIN AS GUEST
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
