import { useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import assets from "../../assets/assets";
import "./ChatBox.css";
import { AppContext } from "../../context/AppContext";
import {
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { toast } from "react-toastify";
import upload from "../../lib/upload";
import EmojiPicker from "emoji-picker-react";

const ChatBox = ({ sidebarCollapsed }) => {
  const navigate = useNavigate();
  // WebRTC video call room handler
  const handleStartCall = async () => {
    const roomId = uuidv4();
    const callUrl = `${window.location.origin}/call/${roomId}`;
    navigate(`/call/${roomId}`);

    if (!userData?.id || !messagesId) return;

    const messagePayload = {
      sId: userData.id,
      createdate: Timestamp.now(),
      text: `📞 Video Call: ${callUrl}`,
      isCall: true,
    };

    await updateDoc(doc(db, "messages", messagesId), {
      messages: arrayUnion(messagePayload),
    });

    const userIDs = [chatUser.rId, userData.id];
    for (const id of userIDs) {
      const userChatRef = doc(db, "chats", id);
      const userChatSnapshot = await getDoc(userChatRef);
      let userChatdata = userChatSnapshot.exists()
        ? userChatSnapshot.data()
        : { chatData: [] };

      const chatIndex = userChatdata.chatData.findIndex(
        (c) => c.messageId === messagesId
      );

      const updatedChatArray = [...userChatdata.chatData];
      const lastMsg = "📞 Video Call";

      if (chatIndex === -1) {
        updatedChatArray.push({
          messageId: messagesId,
          rId: id === userData.id ? chatUser.rId : userData.id,
          lastMessage: lastMsg,
          updatedAt: Date.now(),
          messageSeen: id === userData.id ? true : false,
        });
      } else {
        updatedChatArray[chatIndex] = {
          ...userChatdata.chatData[chatIndex],
          lastMessage: lastMsg,
          updatedAt: Date.now(),
          messageSeen:
            userChatdata.chatData[chatIndex].rId === userData.id ? false : true,
        };
      }

      await setDoc(
        userChatRef,
        { chatData: updatedChatArray },
        { merge: true }
      );
    }
  };
  const { userData, messagesId, chatUser, messages, setMessages, chatData } =
    useContext(AppContext);
  const currentChatMeta = chatData?.find(
    (c) => c.messageId === messagesId && c.rId === chatUser?.userData?.id
  );
  const isSeen = currentChatMeta?.messageSeen;
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const typingTimeoutRef = useRef(null);
  const bottomRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const sendMessage = async () => {
    try {
      const trimmedInput = input.trim();
      if (!userData?.id || (!trimmedInput && !imageFile) || !messagesId) {
        return;
      }

      let messagePayload = {
        sId: userData.id,
        createdate: Timestamp.now(),
      };

      if (trimmedInput) messagePayload.text = trimmedInput;
      if (imageFile) {
        const imgUrl = await upload(imageFile);
        messagePayload.image = imgUrl;
        setImageFile(null);
      }

      await updateDoc(doc(db, "messages", messagesId), {
        messages: arrayUnion(messagePayload),
      });

      const userIDs = [chatUser.rId, userData.id];
      for (const id of userIDs) {
        const userChatRef = doc(db, "chats", id);
        const userChatSnapshot = await getDoc(userChatRef);

        let userChatdata = userChatSnapshot.exists()
          ? userChatSnapshot.data()
          : { chatData: [] };
        const chatIndex = userChatdata.chatData.findIndex(
          (c) => c.messageId === messagesId
        );
        let updatedChatArray = [...userChatdata.chatData];
        if (chatIndex === -1) {
          // Add a new chat thread entry if not found
          updatedChatArray.push({
            messageId: messagesId,
            rId: id === userData.id ? chatUser.rId : userData.id,
            lastMessage: (trimmedInput || (imageFile ? "Image" : "")).slice(
              0,
              30
            ),
            updatedAt: Date.now(),
            messageSeen: id === userData.id ? true : false,
          });
        } else {
          // Update existing chat thread
          const updatedChat = {
            ...userChatdata.chatData[chatIndex],
            lastMessage: (trimmedInput || (imageFile ? "Image" : "")).slice(
              0,
              30
            ),
            updatedAt: Date.now(),
            messageSeen:
              userChatdata.chatData[chatIndex].rId === userData.id
                ? false
                : true,
          };
          updatedChatArray[chatIndex] = updatedChat;
        }

        await setDoc(
          userChatRef,
          {
            chatData: updatedChatArray,
          },
          { merge: true }
        );
      }
    } catch (error) {
      toast.error(error.message);
    }

    setInput("");
    setShowEmojiPicker(false);
  };

  // Delete message handler (now inside ChatBox, after sendMessage)
  const deleteMessage = async (msgToDelete) => {
    try {
      const docRef = doc(db, "messages", messagesId);
      const docSnap = await getDoc(docRef);
      const currentMessages = docSnap.data().messages || [];

      const msgKey = JSON.stringify({
        sId: msgToDelete.sId,
        text: msgToDelete.text || "",
        image: msgToDelete.image || "",
        createdate: msgToDelete.createdate?.seconds || msgToDelete.createdate,
      });

      const filtered = currentMessages.filter((msg) => {
        const compareKey = JSON.stringify({
          sId: msg.sId,
          text: msg.text || "",
          image: msg.image || "",
          createdate: msg.createdate?.seconds || msg.createdate,
        });
        return compareKey !== msgKey;
      });

      await updateDoc(docRef, { messages: filtered });
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete message");
    }
  };
  useEffect(() => {
    if (messagesId) {
      const unSub = onSnapshot(doc(db, "messages", messagesId), (res) => {
        const data = res.data();
        if (data?.messages) {
          const reversed = [...data.messages].reverse();
          setMessages(reversed);
          // Read Receipt: Mark as seen
          const markSeen = async () => {
            const chatRef = doc(db, "chats", userData.id);
            const chatSnap = await getDoc(chatRef);
            const userChats = chatSnap.data()?.chatData || [];
            const chatIndex = userChats.findIndex(
              (c) => c.messageId === messagesId
            );
            const latestMsg = data.messages?.[data.messages.length - 1];
            if (
              latestMsg &&
              latestMsg.sId !== userData.id &&
              chatIndex !== -1 &&
              !userChats[chatIndex].messageSeen &&
              userChats[chatIndex].rId === userData.id
            ) {
              userChats[chatIndex].messageSeen = true;
              await updateDoc(chatRef, { chatData: userChats });
            }
          };
          markSeen();
          // Typing indicator logic
          if (data?.typing && data.typing !== userData.id) {
            setOtherTyping(true);
            setTimeout(() => setOtherTyping(false), 2000);
          }
        } else {
          setMessages([]);
        }
      });
      return () => unSub();
    }
  }, [messagesId, setMessages, userData.id]);

  return chatUser ? (
    <div
      className={`chat-box ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      style={{
        width: sidebarCollapsed
          ? "calc(100% - 70px - 320px)"
          : "calc(100% - 300px - 320px)",
      }}
    >
      <div className="chat-header">
        <div className="chat-user">
          <img src={chatUser?.userData?.avatar || assets.avatar_icon} alt="" />
          <p>
            {chatUser?.userData?.name || "User"}{" "}
            {Date.now() - chatUser.userData.lastSeen <= 70000 ? (
              <div className="connection-dot-online"/>
            ) : null}{" "}
          </p>
          {otherTyping && (
            <div className="typing-indicator">
              Typing<span></span>
              <span></span>
              <span></span>
            </div>
          )}
          <button className="video-call-btn" onClick={handleStartCall}>
            <img src={assets.videocall1} alt="video" />
          </button>
          <img
            src={assets.helplogo}
            alt="info"
            className="help"
            onClick={() => setShowRightSidebar(!showRightSidebar)}
          />
        </div>
      </div>
      {showRightSidebar && (
        <div className="receiver-info">
          <img
            src={chatUser?.userData?.avatar || assets.avatar_icon}
            alt="avatar"
          />
          <h4>{chatUser?.userData?.name}</h4>
          <p>{chatUser?.userData?.email}</p>
          <p>{chatUser?.userData?.bio}</p>
        </div>
      )}
      <div className="chat-body">
        <div className="chat-msg">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={msg.sId === userData.id ? "s-msg" : "r-msg"}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <p
                  className={`msg-bubble ${
                    /^[\p{Emoji}\s]+$/u.test(msg.text) &&
                    !/[a-zA-Z0-9]/.test(msg.text)
                      ? "emoji-only"
                      : ""
                  }`}
                >
                  {msg.text?.split(" ").map((word, index) =>
                    word.startsWith("http") ? (
                      <a
                        key={index}
                        href={word}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#0ff", textDecoration: "underline" }}
                      >
                        {word}
                      </a>
                    ) : (
                      <span key={index}> {word} </span>
                    )
                  )}
                </p>
                {msg.sId === userData.id && (
                  <button
                    className="msg-options"
                    onClick={() => deleteMessage(msg)}
                    title="Delete message"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ff5c5c",
                      fontSize: "18px",
                      cursor: "pointer",
                      marginLeft: "8px",
                      transition: "transform 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.transform = "scale(1.3)")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.transform = "scale(1)")
                    }
                  >
                    🗑
                  </button>
                )}
              </div>
              {msg.image && (
                <img src={msg.image} alt="uploaded" className="msg-img" />
              )}
              <div>
                <p className="time">
                  {msg.createdate
                    ? new Date(
                        msg.createdate.seconds * 1000 || msg.createdate
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                  <span className="seen-status">
                    {msg.sId === userData.id && (
                      <>
                        {msg.status === "seen" ? (
                          <span className="seen-indicator">✅✅</span>
                        ) : msg.status === "delivered" ? (
                          <span className="delivered-indicator">✅</span>
                        ) : (
                          <span className="sent-indicator">🕒</span>
                        )}
                      </>
                    )}
                  </span>
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef}></div>
        </div>
      </div>
      <div className="chat-footer">
        <div className="chat-input">
          <input
            onChange={(e) => {
              setInput(e.target.value);
              if (!isTyping) {
                setIsTyping(true);
                updateDoc(doc(db, "messages", messagesId), {
                  typing: userData.id,
                });
                if (typingTimeoutRef.current) {
                  clearTimeout(typingTimeoutRef.current);
                }
                typingTimeoutRef.current = setTimeout(() => {
                  updateDoc(doc(db, "messages", messagesId), { typing: "" });
                  setIsTyping(false);
                }, 2000);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            value={input}
            type="text"
            placeholder="Send a message"
          ></input>
          <input
            type="file"
            id="image"
            accept="image/png,image/jpg,image/jpeg"
            hidden
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              setImageFile(file);
            }}
          ></input>
          <label htmlFor="image">
            <img src={assets.gallery_icon2} alt="Gallery Icon" />
          </label>
          <button
            type="button"
            className="emoji-button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            😊
          </button>

          {showEmojiPicker && (
            <div className="emoji-picker-container">
              <EmojiPicker
                onEmojiClick={(emojiData) =>
                  setInput((prev) => prev + emojiData.emoji)
                }
                theme="dark"
                height={350}
                width={300}
              />
            </div>
          )}
          {imageFile && (
            <div className="image-preview">
              <img src={URL.createObjectURL(imageFile)} alt="Preview" />
              <button onClick={() => setImageFile(null)}>✕</button>
            </div>
          )}
          <img
            onClick={sendMessage}
            src={assets.send_button}
            alt="Send Button"
          />
        </div>
      </div>
      <style>{`
        .message-menu {
          position: absolute;
          background-color: #111;
          color: #0ff;
          padding: 6px 10px;
          border-radius: 6px;
          box-shadow: 0 0 12px #0ff;
          font-size: 12px;
          z-index: 10;
          cursor: pointer;
          margin-left: 10px;
        }
        .message-menu p {
          margin: 0;
        }
        .message-menu p:hover {
          color: red;
        }
        .seen-status {
          display: none;
          margin-left: 4px;
          color: #0ff;
        }
        .time:hover .seen-status {
          display: inline;
        }
      `}</style>
    </div>
  ) : (
    <div className="login-right">
      <div className="login-overlay">
        <p className="quote">“Chat anytime , anywhere.”</p>
      </div>
      <img src={assets.logo_icon} className="login-image" alt="Welcome" />
    </div>
  );
};
export default ChatBox;
