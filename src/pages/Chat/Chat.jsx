import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import LeftSideBar from "../../components/LeftSidebar/LeftSidebar";
import ChatBox from "../../components/ChatBox/ChatBox";
import RightSideBar from "../../components/RightSidebar/RightSidebar";
import assets from "../../assets/assets";
import "./Chat.css";

const Chat = () => {
  const { chatData, userData } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (chatData && userData) {
    
      const loadingStages = [
        { progress: 20, message: "Initializing..." },
        { progress: 45, message: "Loading conversations..." },
        { progress: 70, message: "Establishing secure connection..." },
        { progress: 90, message: "Finalizing..." },
        { progress: 100, message: "Ready!" }
      ];

      let currentStage = 0;
      const loadingInterval = setInterval(() => {
        if (currentStage < loadingStages.length) {
          setLoadProgress(loadingStages[currentStage].progress);
          currentStage++;
        } else {
          clearInterval(loadingInterval);
          setLoading(false);
        }
      }, 500); 

      return () => clearInterval(loadingInterval);
    }
  }, [chatData, userData]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="spinner-container">
            <div 
              className="spinner-progress" 
              style={{ transform: `rotate(${loadProgress * 3.6}deg)` }}
            ></div>
            <div className="spinner-background"></div>
            <div className="progress-text">{loadProgress}%</div>
          </div>
          <p className="loading-status">
            {loadProgress < 30 ? "Initializing your secure connection..." :
             loadProgress < 60 ? "Loading your messages..." :
             loadProgress < 90 ? "Almost there..." : 
             "Ready to connect!"}
          </p>
          <div className="connection-indicator">
            <span className="connection-dot"></span>
            <span>Secure connection established</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat">
      <div className={`chat-container ${collapsed ? "sidebar-collapsed" : ""}`}>
        <LeftSideBar collapsed={collapsed} setCollapsed={setCollapsed} />
        <ChatBox
          sidebarCollapsed={collapsed}
          style={{
            gridColumn: collapsed ? "2 / span 1" : "2 / span 1",
            width: "100%",
          }}
        />
        <RightSideBar  />
      </div>
    </div>
  );
};

export default Chat;