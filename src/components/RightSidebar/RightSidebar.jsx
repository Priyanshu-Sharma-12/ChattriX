import { useContext, useMemo, useState } from "react";
import assets from "../../assets/assets";
import { logout } from "../../config/firebase";
import "./RightSideBar.css";
import { AppContext } from "../../context/AppContext";

const RightSideBar = () => {
  const { userData, messages } = useContext(AppContext);
  const [previewImage, setPreviewImage] = useState(null);

  const mediaMessages = useMemo(() => {
    return messages.filter((msg) => msg.image);
  }, [messages]);

  return (
    <div className="rs">
      <div className="rs-profile">
        <img src={userData?.avatar || assets.avatar_icon} alt="Profile" />
        <h3>
          {" "}
          {Date.now() - userData.lastSeen <= 70000 ? (
            <div className="connection-dot-online" />
          ) : null}{" "}
          {userData?.name || "User"}
        </h3>
        <p>{userData?.bio || "Hey there, I’m using ChattriX"}</p>
      </div>
      <hr />
      <div className="rs-media">
        <p>Media</p>
        <div>
          {mediaMessages.map((msg, idx) => (
            <img
              key={idx}
              src={msg.image}
              alt={`media-${idx}`}
              onClick={() => setPreviewImage(msg.image)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </div>
      </div>
      <button onClick={logout}>Log Out</button>
      {previewImage && (
        <div className="preview-overlay" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" className="preview-image" />
        </div>
      )}
    </div>
  );
};

export default RightSideBar;
