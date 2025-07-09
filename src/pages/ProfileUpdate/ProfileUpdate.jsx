import { useContext, useEffect, useState } from "react";
import assets from "../../assets/assets";
import "./ProfileUpdate.css";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../config/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import upload from "../../lib/upload";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";

const ProfileUpdate = () => {
  const navigate = useNavigate();
  const [image, setImage] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [uid, setUid] = useState("");
  const [prevImage, setPrevImage] = useState("");
  const { setUserData } = useContext(AppContext);
  const ProfileUpdate = async (event) => {
    event.preventDefault();
    try {
      if (!prevImage && !image) {
        toast.error("Upload Profile Picture");
        return;
      }

      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      let imgUrl = prevImage;
      if (image) {
        imgUrl = await upload(image);
        setPrevImage(imgUrl);
      }

      const userDataToSave = {
        avatar: imgUrl,
        bio,
        name,
        id: uid,
      };

      if (docSnap.exists()) {
        await updateDoc(docRef, userDataToSave);
      } else {
        await setDoc(docRef, userDataToSave);
      }

      const snap = await getDoc(docRef);
      setUserData(snap.data());
      navigate("/chat");
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  // const ProfileUpdate = async (event) => {
  //   event.preventDefault();
  //   try {
  //     if (!prevImage && !image) {
  //       toast.error("Upload Profile Pitcure");
  //     }
  //     const docRef = doc(db, "users", uid);
  //     if (image) {
  //       const imgUrl = await upload(image);
  //       setPrevImage(imgUrl);
  //       await updateDoc(docRef, {
  //         avatar: imgUrl,
  //         bio: bio,
  //         name: name,
  //       });
  //     } else {
  //       await updateDoc(docRef, {
  //         bio: bio,
  //         name: name,
  //       });
  //     }

  //     const snap = await getDoc(docRef);
  //     setUserData(snap.data());
  //     navigate("/chat");
  //   } catch (error) {
  //     console.error(error);
  //     toast.error(error.message);
  //   }
  // };

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          if (docSnap.data().name) {
            setName(docSnap.data().name);
          }
          if (docSnap.data().bio) {
            setBio(docSnap.data().bio);
          }
          if (docSnap.data().avatar) {
            setPrevImage(docSnap.data().avatar);
          }
        }
      } else {
        navigate("/");
      }
    });
  }, []);

  return (
    <div className="profile">
    
      <div className="profile-container">
        <form onSubmit={ProfileUpdate}>
          <h3>Profile Details</h3>
          <label htmlFor="avatar">
            <input
              onChange={(e) => setImage(e.target.files[0])}
              type="file"
              id="avatar"
              accept=".png, .jpg, .jpeg"
              hidden
            />
            <img
              src={image ? URL.createObjectURL(image) : assets.avatar_icon}
              alt=""
            />
            Upload profile Image
          </label>
          <input
            onChange={(e) => setName(e.target.value)}
            value={name}
            type="text"
            placeholder="Your name"
            required
          />
          <textarea
            onChange={(e) => setBio(e.target.value)}
            value={bio}
            id="bio"
            placeholder="write profile bio"
            required
          ></textarea>
          <button type="submit">Save</button>
        </form>
        <img
          className="profile-pic"
          src={
            image
              ? URL.createObjectURL(image)
              : prevImage
              ? prevImage
              : assets.logo_big
          }
          alt=""
        />
      </div>
    </div>
  );
};

export default ProfileUpdate;
