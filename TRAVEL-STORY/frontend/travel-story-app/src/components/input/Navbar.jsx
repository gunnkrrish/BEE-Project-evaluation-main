import React, { useState, useRef, useEffect } from "react";
import LOGO from "../../assets/images/logo.png";
import { useNavigate } from "react-router-dom";
import ProfileInfo from "../Cards/ProfileInfo";
import SearchBar from "./SearchBar";
import axios from "axios";

const Navbar = ({ userInfo, searchQuery, setSearchQuery, onSearchNote, handleClearSearch }) => {
  const navigate = useNavigate();
  const isToken = localStorage.getItem("token");
   const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isAdmin = userInfo?.isAdmin;


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const onLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleSearch = () => {
    if (searchQuery) {
      onSearchNote(searchQuery);
    }
    else {
    onSearchNote(""); 
  }
  };

  const onClearSearch = () => {
    handleClearSearch();
    setSearchQuery("");
  };
const requestAccountDeletion = async () => {
  try {
    console.log("Sending deletion request...");
    const response = await axios.post('http://localhost:8000/api/request-account-deletion', {}, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    alert(response.data.message || 'Account deletion request submitted successfully');
    setDropdownOpen(false);
  } catch (error) {
    console.error('Error details:', error);
    if (error.response && error.response.status === 400) {
      alert('You already have a pending account deletion request. Please wait for admin approval.');
    } else {
      alert('Failed to submit deletion request. Please try again later.');
    }
  }
}; 


  const ProfileDropdown = ({ userInfo }) => {
    return (
      <div className="relative" ref={dropdownRef}>
        <div 
          className="flex items-center cursor-pointer" 
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <div className="mr-2 text-right">
            <p className="text-sm font-medium">{userInfo?.fullName || "User"}</p>
            <p className="text-xs text-gray-500">{userInfo?.email || ""}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
            {userInfo?.fullName ? userInfo.fullName.charAt(0).toUpperCase() : "U"}
          </div>
        </div>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
            <button
              onClick={onLogout}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Logout
            </button>
            <button
              onClick={requestAccountDeletion}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Request Account Deletion
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white flex items-center justify-between px-6 py-2 drop-shadow sticky top-0 z-10">
      <img src={LOGO} alt="travel story" className="h-9" />

      {isToken && (
        <>
          {!isAdmin && (<SearchBar
            value={searchQuery}
            onChange={({ target }) => {
              setSearchQuery(target.value);
            }}
            handleSearch={handleSearch}
            onClearSearch={onClearSearch}
          />)}
          <ProfileDropdown userInfo={userInfo} />
        </>
      )}
    </div>
  );
};

export default Navbar;



//commented code
// import React from "react";
// import LOGO from "../../assets/images/logo.png";
// import { useNavigate } from "react-router-dom";
// import ProfileInfo from "../Cards/ProfileInfo";
// import SearchBar from "./SearchBar";
// const Navbar = ({ userInfo,searchQuery,setSearchQuery,onSearchNote,handleClearSearch }) => { 
//   const navigate = useNavigate();
//   const isToken = localStorage.getItem("token");

//   const onLogout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     navigate("/login");
//   };

//   const handleSearch=()=>{
//     if (searchQuery){
//       onSearchNote(searchQuery);
//     }
//   }

//   const onClearSearch=()=>{
//     handleClearSearch();
//     setSearchQuery("")
//   }

//   return (
//     <div className="bg-white flex items-center justify-between px-6 py-2 drop-shadow sticky top-0 z-10">
//       <img src={LOGO} alt="travel story" className="h-9" />
      
//       {isToken && (
//         <>
//         <SearchBar
//         value = {searchQuery}
//         onChange = {({ target})=>{
//           setSearchQuery(target.value);
//         }}
//         handleSearch= {handleSearch}
//         onClearSearch = {onClearSearch}
//         />

//         <ProfileInfo userInfo={userInfo} onLogout={onLogout} />{" "}
//         </>
      
//       )}
//     </div>
//   );
// };

// export default Navbar;












//****************************************************************** */
// import React, { useEffect, useState } from "react";
// import LOGO from "../../assets/images/logo.png";
// import { useNavigate } from "react-router-dom";
// import ProfileInfo from "../Cards/ProfileInfo";

// const Navbar = () => {
//   const [userInfo, setUserInfo] = useState(null);
//   const navigate = useNavigate();
//   const isToken = localStorage.getItem("token");

//   useEffect(() => {
//     const user = JSON.parse(localStorage.getItem("user"));
//     if (user) {
//       setUserInfo(user);
//     }
//   }, []);

//   // const onLogout = () => {
//   //   localStorage.removeItem("token");
//   //   localStorage.removeItem("user");
//   //   navigate("/login");
//   // };

//   const onLogout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     setUserInfo(null); // Clear state immediately
//     navigate("/login");
//   };
  

//   return (
//     <div className="bg-white flex items-center justify-between px-6 py-2 drop-shadow sticky top-0 z-10">
//       <img src={LOGO} alt="travel story" className="h-9" />
//       {isToken && userInfo && (
//         <ProfileInfo userInfo={userInfo} onLogout={onLogout} />
//       )}
//     </div>
//   );
// };

// export default Navbar;


































// ********************************************************************************
// import React from "react";
// import LOGO from "../../assets/images/logo.png"
// import { useNavigate } from 'react-router-dom';
// import ProfileInfo from '../Cards/ProfileInfo';

// //-------------IMAGE---------------
// const Navbar = ({userInfo}) => {
//   const isToken = localStorage.getItem("token");
// const navigate = useNavigate();
//   // const onLogout = () => {
//   //   localStorage.clear();
//   //   navigate("/login");
//   // };
//   const onLogout = () => {
//     localStorage.removeItem("token");
//     navigate("/login");
//   };
  
//   return (
//     <div className= 'bg-white flex items-center justify-between px-6 py-2 drop-shadow sticky top-0 z-10'>
//       <img src={LOGO} alt="travel story" className="h-9" />
//       {isToken && <ProfileInfo userInfo={userInfo} onLogout={onLogout}/>}
//     </div>
//   );
// };

// export default Navbar



