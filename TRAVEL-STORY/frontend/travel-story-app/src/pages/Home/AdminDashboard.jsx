import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import {
  MdDelete,
  MdPerson,
  MdStorage,
  MdAdminPanelSettings,
  MdSearch,
  MdRefresh,
} from "react-icons/md";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "../../components/input/Navbar";
import Modal from "react-modal";
import axios from 'axios';


const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState(null);
  const [totalStorage, setTotalStorage] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [error, setError] = useState(null);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  // Fetch admin info
  const getAdminInfo = async () => {
    try {
      console.log("Fetching admin info...");
      const response = await axiosInstance.get("/get-user");
      console.log("Admin info response:", response.data);

      if (response.data && response.data.user) {
        if (!response.data.user.isAdmin) {
          // Redirect non-admin users
          toast.error("You don't have permission to access this page");
          navigate("/dashboard");
          return;
        }
        setAdminInfo(response.data.user);
      }
    } catch (error) {
      console.error("Error fetching admin info:", error);
      if (error.response && error.response.status === 401) {
        localStorage.clear();
        navigate("/login");
      }
    }
  };

  ///handle deletion request
const handleRequestAction = async (requestId, status) => {
  try {
    console.log(`Sending ${status} request for ID: ${requestId}`);
    
    // Use the full backend URL to bypass proxy issues
    const response = await axios.put(`http://localhost:8000/admin/deletion-requests/${requestId}`, 
      { status }, 
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    console.log('Response:', response.data);
    
    // Update the UI by removing the processed request
    setDeletionRequests(prevRequests => 
      prevRequests.filter(request => request._id !== requestId)
    );
    
    toast.success(`Request ${status} successfully`);
  } catch (error) {
    console.error('Error updating request:', error);
    toast.error('Failed to process request');
  }
};

  /////*********useeffect */
  useEffect(() => {
  const fetchDeletionRequests = async () => {
    try {
      console.log("Fetching deletion requests...");
      const response = await axios.get('http://localhost:8000/admin/deletion-requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log("Deletion requests response:", response.data);
      setDeletionRequests(response.data.requests || []);
      setRequestsLoading(false);
    } catch (error) {
      console.error('Error fetching deletion requests:', error);
      setRequestsLoading(false);
    }
  };

  fetchDeletionRequests();
}, []);

  // Fetch all users
  const getAllUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching all users...");
      const response = await axiosInstance.get("/admin/get-all-users");
      console.log("All users response:", response.data);

      if (response.data && response.data.users) {
        setUsers(response.data.users);
        setFilteredUsers(response.data.users);

        // Calculate total storage
        const total = response.data.users.reduce(
          (acc, user) => acc + (user.storageUsed || 0),
          0
        );
        setTotalStorage(total);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setError(
        error.response?.data?.message || error.message || "Failed to load users"
      );
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Delete user account
  const deleteUser = async (userId) => {
    try {
      console.log("Deleting user with ID:", userId);
      const response = await axiosInstance.delete(
        `/admin/delete-user/${userId}`
      );
      console.log("Delete user response:", response.data);

      if (response.data && response.data.success) {
        toast.success("User deleted successfully");
        getAllUsers(); // Refresh user list
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    } finally {
      setDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (!term.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(
      (user) =>
        user.fullName.toLowerCase().includes(term.toLowerCase()) ||
        user.email.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  // Handle sorting
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sortedUsers = [...filteredUsers].sort((a, b) => {
      if (a[key] < b[key]) {
        return direction === "asc" ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    setFilteredUsers(sortedUsers);
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  useEffect(() => {
    getAdminInfo();
  }, []);

  useEffect(() => {
    if (adminInfo && adminInfo.isAdmin) {
      console.log("Admin confirmed, fetching users");
      getAllUsers();
    }
  }, [adminInfo]);

  // Get sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? " ▲" : " ▼";
    }
    return "";
  };

  return (
    <>
      <Navbar userInfo={adminInfo} />

      <div className="container mx-auto py-10 px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <MdAdminPanelSettings className="text-4xl text-primary mr-3" />
              <h1 className="text-2xl font-bold text-slate-800">
                Admin Dashboard
              </h1>
            </div>
            <button
              onClick={getAllUsers}
              className="flex items-center gap-2 bg-cyan-50 hover:bg-cyan-100 text-primary px-4 py-2 rounded"
            >
              <MdRefresh /> Refresh
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Total Users</p>
                  <h3 className="text-3xl font-bold text-slate-800">
                    {users.length}
                  </h3>
                </div>
                <MdPerson className="text-4xl text-primary opacity-70" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-500 mb-1">
                    Total Storage Used
                  </p>
                  <h3 className="text-3xl font-bold text-slate-800">
                    {formatBytes(totalStorage)}
                  </h3>
                </div>
                <MdStorage className="text-4xl text-primary opacity-70" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Active Stories</p>
                  <h3 className="text-3xl font-bold text-slate-800">
                    {users.reduce(
                      (acc, user) => acc + (user.storiesCount || 0),
                      0
                    )}
                  </h3>
                </div>
                <div className="text-4xl text-primary opacity-70">📖</div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden">
              <thead className="bg-gray-50 text-gray-600 text-sm">
                <tr>
                  <th
                    className="py-3 px-4 text-left cursor-pointer"
                    onClick={() => requestSort("fullName")}
                  >
                    User {getSortIndicator("fullName")}
                  </th>
                  <th
                    className="py-3 px-4 text-left cursor-pointer"
                    onClick={() => requestSort("email")}
                  >
                    Email {getSortIndicator("email")}
                  </th>
                  <th
                    className="py-3 px-4 text-left cursor-pointer"
                    onClick={() => requestSort("storiesCount")}
                  >
                    Stories {getSortIndicator("storiesCount")}
                  </th>
                  <th
                    className="py-3 px-4 text-left cursor-pointer"
                    onClick={() => requestSort("storageUsed")}
                  >
                    Storage Used {getSortIndicator("storageUsed")}
                  </th>
                  <th
                    className="py-3 px-4 text-left cursor-pointer"
                    onClick={() => requestSort("createdAt")}
                  >
                    Joined {getSortIndicator("createdAt")}
                  </th>
                  <th className="py-3 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="py-4 px-4 text-center text-gray-500"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="py-4 px-4 text-center text-gray-500"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id || user._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center text-primary font-medium mr-3">
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {user.fullName}
                            </p>
                            {user.isAdmin && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{user.email}</td>
                      <td className="py-3 px-4 text-gray-500">
                        {user.storiesCount || 0}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {formatBytes(user.storageUsed || 0)}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        {!user.isAdmin && (
                          <button
                            onClick={() => {
                              setUserToDelete(user);
                              setDeleteModalOpen(true);
                            }}
                            className="text-red-500 hover:text-red-700 flex items-center gap-1"
                          >
                            <MdDelete /> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Account Deletion Requests
          </h2>

          {requestsLoading ? (
            <p>Loading requests...</p>
          ) : deletionRequests?.length === 0 ? (
            <p>No pending deletion requests</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deletionRequests && deletionRequests?.map((request) => (
                    <tr key={request._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.userId.fullName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.userId.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.requestDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() =>
                            handleRequestAction(request._id, "approved")
                          }
                          className="text-green-600 hover:text-green-900 mr-4"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handleRequestAction(request._id, "rejected")
                          }
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onRequestClose={() => setDeleteModalOpen(false)}
        style={{
          overlay: {
            backgroundColor: "rgba(0,0,0,0.2)",
            zIndex: 999,
          },
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            marginRight: "-50%",
            transform: "translate(-50%, -50%)",
            maxWidth: "500px",
            borderRadius: "8px",
          },
        }}
        appElement={document.getElementById("root")}
      >
        <div className="p-4">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Confirm Account Deletion
          </h2>
          <p className="mb-6 text-gray-600">
            Are you sure you want to delete the account for{" "}
            <span className="font-semibold">{userToDelete?.fullName}</span>?
            This will permanently remove all their data including stories and
            images.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteUser(userToDelete?.id || userToDelete?._id)}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
            >
              Delete Account
            </button>
          </div>
        </div>
      </Modal>

      <ToastContainer />
    </>
  );
};

export default AdminDashboard;
