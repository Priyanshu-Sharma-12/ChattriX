import { createContext, useEffect, useRef, useState } from "react";
import { auth, db } from "../config/firebase";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export const AppContext = createContext();
const AppContextProvider = (props) => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [chatData, setChatData] = useState(null);
  const [messagesId, setMessagesId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatUser, setChatUser] = useState(null);
  const[chatVisible,setChatVisible]=useState(false);

  const loadUserData = async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      setUserData(userData);

      const currentPath = window.location.pathname;
      const isOnLoginOrProfile =
        currentPath === "/" || currentPath === "/profile";

      if (userData.avatar && userData.name && isOnLoginOrProfile) {
        navigate("/chat");
      } else if (isOnLoginOrProfile) {
        navigate("/profile");
      }

      await updateDoc(userRef, {
        lastSeen: Date.now(),
      });

      setInterval(async () => {
        if (auth.chatUser) {
          await updateDoc(useRef, { lastSeen: Date.now() });
        }
      }, 60000);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  useEffect(() => {
    if (!userData?.id) return;
    const chatRef = doc(db, "chats", userData.id);
    const unSub = onSnapshot(chatRef, async (res) => {
      try {
        const resData = res.data();
        if (!resData || !resData.chatData) return;
        const chatItems = resData.chatData;

        const tempData = await Promise.all(
          chatItems.map(async (item) => {
            const userRef = doc(db, "users", item.rId);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.exists() ? userSnap.data() : null;
            return { ...item, userData };
          })
        );
        setChatData(tempData.sort((a, b) => b.updatedAt - a.updatedAt));
      } catch (error) {}
    });
    return () => {
      unSub();
    };
  }, [userData]);

  const value = {
    userData,
    setUserData,
    chatData,
    setChatData,
    loadUserData,
    messages,
    setMessages,
    messagesId,
    setMessagesId,
    chatUser,
    setChatUser,
    chatVisible,setChatVisible
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;
