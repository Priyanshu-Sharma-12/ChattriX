import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";
import { toast } from "react-toastify";
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const googleLogin = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        id: user.uid,
        username: user.displayName?.toLowerCase().replace(/\s+/g, ""),
        email: user.email,
        name: user.displayName || "",
        avatar: user.photoURL || "",
        bio: "Hey there, I am using ChattriX",
        lastSeen: Date.now(),
      });

      await setDoc(doc(db, "chats", user.uid), {
        chatData: [],
      });
    }

    toast.success("Logged in with Google!");
    return user;
  } catch (error) {
    console.error(error);
    toast.error(error.message || "Google login failed");
  }
};

const firebaseConfig = {
  apiKey: "AIzaSyA6hxnBKelzmqjniscN5yBxTmfhVIg0b-k",
  authDomain: "chattrix-psb.firebaseapp.com",
  projectId: "chattrix-psb",
  storageBucket: "chattrix-psb.firebasestorage.app",
  messagingSenderId: "467508843780",
  appId: "1:467508843780:web:1e7c91783da0238e656c51",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

// const signup = async (username, email, password) => {
//   try {
//     const res = await createUserWithEmailAndPassword(auth, email, password);
//     const user = res.user;
//     await setDoc(doc(db, "users", user.uid), {
//       id: user.uid,
//       username: username.toLowerCase(),
//       email,
//       name: "",
//       avatar: "",
//       bio: "Hey there , I am using ChattriX",
//       LastSeen: Date.now(),
//     });

//     await setDoc(doc(db, "chats", user.uid), {
//       chatData: [],
//     });
//     toast.success("Account Created!!!");
//   } catch (error) {
//     console.error(error);
//     toast.error(error.code);
//   }
// };

const signup = async (username, email, password) => {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;

    console.log("User created:", user.uid);

    await setDoc(doc(db, "users", user.uid), {
      id: user.uid,
      username: username.toLowerCase(),
      email: user.email,
      name: "",
      avatar: "",
      bio: "Hey there, I am using ChattriX",
      lastSeen: Date.now(),
    });

    await setDoc(doc(db, "chats", user.uid), {
      chatData: [],
    });

    toast.success("Account Created!");
  } catch (error) {
    console.error(error);
    toast.error(
      error.code.split("/")[1].split("-").join(" ") || "Signup failed"
    );
  }
};
const login = async (email, password) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);
    toast.error(
      error.code.split("/")[1].split("-").join(" ") || "Login failed"
    );
  }
};

const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
    toast.error(
      error.code.split("/")[1].split("-").join(" ") || "Login failed"
    );
  }
};
const resetPass = async(email)=>{
if(!email){
  toast.error("Enter your email");
  return null;
}
try {
  const userRef =collection(db,"users");
  const q=query(userRef,where("email","==",email));
  const querSnap =await getDocs(q);
if(!querSnap.empty){
await sendPasswordResetEmail(auth,email);
toast.success("Reset Email Sent!!!")
}
else{
  toast.error("Email doesn't exist");
}


} catch (error) {
  console.error(error);
  toast.error(error.message);
}


}




export { signup, login, logout, googleLogin,resetPass ,auth, db };
