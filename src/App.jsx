// import React from 'react';

import { Route, Routes, useNavigate } from "react-router-dom";
import Login from "./pages/login/Login.jsx";
import Chat from "./pages/Chat/Chat.jsx";
import ProfileUpdate from "./pages/ProfileUpdate/ProfileUpdate";
import { ToastContainer, toast } from "react-toastify";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./config/firebase";
import { useContext, useEffect } from "react";
import { AppContext } from "./context/AppContext";
import VideoCall from "./pages/VideoCall/VideoCall";

const App = () => {
  const navigate = useNavigate();
  const { loadUserData } = useContext(AppContext);

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await loadUserData(user.uid);

        const path = window.location.pathname;
        const isAuthPage = path === "/" || path === "/profile";

        if (isAuthPage) {
          navigate("/chat");
        }
      } else {
        navigate("/");
      }
    });
  }, []);

  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/profile" element={<ProfileUpdate />} />
        <Route path="/call/:roomId" element={<VideoCall />} />
      </Routes>
    </>
  );
};

export default App;
