import { useNavigate } from "react-router-dom";
import assets from "../../assets/assets";
import "./LeftSidebar.css";
import {
  arrayUnion,
  collection,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { useContext, useState, useEffect, useRef } from "react";
import { onSnapshot } from "firebase/firestore";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";

const LeftSideBar = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const {
    userData,
    chatData,
    chatUser,
    setChatUser,
    setMessagesId,
    MessagesId,
    setChatData,
    chatVisible,
    setChatVisible,
  } = useContext(AppContext);
  const [user, setUser] = useState(null);
  const [showSearch, setShowsearch] = useState(false);
  const [activeOptionsId, setActiveOptionsId] = useState(null);

  const optionsRef = useRef();

  const inputHandler = async (e) => {
    try {
      const input = e.target.value.toLowerCase();
      setUser(null);

      if (input) {
        setShowsearch(true);

        const userRef = collection(db, "users");
        const querySnap = await getDocs(userRef);

        const filteredUsers = querySnap.docs
          .map((doc) => doc.data())
          .filter(
            (u) =>
              u.username.toLowerCase().includes(input) &&
              u.id !== userData.id &&
              !chatData.some((chat) => chat.rId === u.id)
          );

        if (filteredUsers.length > 0) {
          setUser(filteredUsers[0]); // can be updated later to show multiple users
        } else {
          setUser(null);
        }
      } else {
        setShowsearch(false);
        setUser(null);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const addChat = async () => {
    const alreadyExists = chatData?.some((chat) => chat.rId === user.id);
    if (alreadyExists) {
      toast.info("Chat already exists.");
      return;
    }

    const messagesRef = collection(db, "messages");
    const chatRef = collection(db, "chats");
    try {
      const newMessageRef = doc(messagesRef);
      await setDoc(newMessageRef, {
        createAt: serverTimestamp(),
        messages: [],
      });
      await updateDoc(doc(chatRef, user.id), {
        chatData: arrayUnion({
          messageId: newMessageRef.id,
          lastMessage: "",
          rId: userData.id,
          updatedAt: Date.now(),
          messageSeen: true,
        }),
      });

      await updateDoc(doc(chatRef, userData.id), {
        chatData: arrayUnion({
          messageId: newMessageRef.id,
          lastMessage: "",
          rId: user.id,
          updatedAt: Date.now(),
          messageSeen: true,
        }),
      });

      {
        const newChatData = [...chatData];
        newChatData.push({
          messageId: newMessageRef.id,
          lastMessage: "",
          rId: user.id,
          updatedAt: Date.now(),
          messageSeen: true,
        });
        setChatData(newChatData);
        setMessagesId(newMessageRef.id);
        setChatUser({
          messageId: newMessageRef.id,
          rId: user.id,
          userData: user,
          lastMessage: "",
          updatedAt: Date.now(),
          messageSeen: true,
        });
      }
    } catch (error) {
      toast.error(error.message);
      console.log(error);
    }
  };

  const uniqueChats = Array.from(
    new Map(
      (Array.isArray(chatData) ? chatData : []).map((item) => [item.rId, item])
    ).values()
  );

  const filteredChats = uniqueChats.filter(
    (chat) => !userData?.blocked?.includes(chat.rId)
  );

  const setChat = async (item) => {
    setMessagesId(item.messageId);
    setChatUser(item);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setActiveOptionsId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOptionsClick = (e, item) => {
    e.stopPropagation();
    setActiveOptionsId((prev) => (prev === item.rId ? null : item.rId));
  };

  const deleteChat = async (item) => {
    try {
      const chatRef = doc(db, "chats", userData.id);
      const newChatList = chatData.filter((chat) => chat.rId !== item.rId);
      await updateDoc(chatRef, { chatData: newChatList });
      setChatData(newChatList);
      toast.success("Chat deleted.");
    } catch (error) {
      toast.error("Failed to delete chat.");
    }
  };

  // const blockUser = async (item) => {
  //   try {
  //     await updateDoc(doc(db, "users", userData.id), {
  //       blocked: arrayUnion(item.rId),
  //     });
  //     toast.success("User blocked.");
  //   } catch (error) {
  //     toast.error("Failed to block user.");
  //   }
  // };

  return (
    <div className={`ls  ${collapsed ? "collapsed" : ""}`}>
      <div className="ls-top">
        <div className="ls-nav">
          <div
            className="logo-chat"
            onClick={() => setCollapsed(!collapsed)}
            style={{ cursor: "pointer" }}
          >
            <img src={assets.logo} alt="Logo" />
            {!collapsed && <p>ChattriX</p>}
          </div>

          <div className="menu">
            <img src={assets.menu_icon} alt="" />
            <div className="sub-menu">
              <p onClick={() => navigate("/profile")}>Edit Profile</p>
              <hr />
              <p onClick={() => navigate("/")}>Log out</p>
            </div>
          </div>
        </div>
        <div className="ls-search">
          <img src={assets.search_icon} alt="Search Icon" />
          <input
            onChange={inputHandler}
            type="text"
            placeholder="Search here..."
          />
        </div>
      </div>

      <div className="ls-list">
        {showSearch && user ? (
          <div
            onClick={() => {
              addChat();
              setShowsearch(false);
            }}
            className="friends add-user"
          >
            <img src={user.avatar} alt="" />
            <p>{user.name}</p>
          </div>
        ) : (
          filteredChats.map((item, index) => (
            <div onClick={() => setChat(item)} key={index} className="friends">
              <img
                src={item.userData?.avatar || assets.avatar_icon}
                alt="Friend Avatar"
              />
              <div>
                <p>{item.userData?.name || "Unknown"}</p>
                <span>{item.lastMessage || "No last message yet"}</span>
              </div>
              <div className="friends-options" ref={optionsRef}>
                <button onClick={(e) => handleOptionsClick(e, item)}>
                  <img src={assets.menu_icon} />
                </button>
                {activeOptionsId === item.rId && (
                  <div className="friend-menu">
                    <p onClick={() => deleteChat(item)}>Delete Chat</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LeftSideBar;
