import React, { useState } from "react";
import "./Login.css";
import assets from "../../assets/assets";
import { signup, login, googleLogin, resetPass } from "../../config/firebase";

const Login = () => {
  const [currentState, setCurrentState] = useState("Sign up");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmitHandler = (event) => {
    event.preventDefault();
    if (currentState === "Sign up") {
      signup(username, email, password);
    } else {
      login(email, password);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <h1 className="login-logo">ChattriX</h1>
        <h2 className="login-header">{currentState}</h2>
        <p className="login-subtext">
          Let's get started with your first conversation.
        </p>
        <form onSubmit={onSubmitHandler} className="login-form">
          {currentState === "Sign up" && (
            <input
              onChange={(e) => setUsername(e.target.value)}
              value={username}
              type="text"
              placeholder="Username"
              className="form-input"
              required
            />
          )}
          <input
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            type="email"
            placeholder="Email Address"
            className="form-input"
          />
          <input
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            type="password"
            placeholder="Password"
            className="form-input"
          />
          <button type="submit" className="form-button gradient-button">
            {currentState === "Sign up" ? "Create Account" : "Login"}
          </button>
          <div className="login-alt">
            <p>or</p>
            <button
              type="button"
              className="google-button"
              onClick={async () => {
                try {
                  const user = await googleLogin();
                  console.log("Google Login Success:", user);
                } catch (error) {
                  console.error("Google Login Failed:", error.message);
                }
              }}
            >
              <img src={assets.google_icon1} alt="Google" /> Continue With
              Google
            </button>
          </div>
          <div className="login-footer">
            <p>
              {currentState === "Sign up"
                ? "Already have an account?"
                : "Create an account?"}
              <span
                onClick={() =>
                  setCurrentState(
                    currentState === "Sign up" ? "Login" : "Sign up"
                  )
                }
              >
                {currentState === "Sign up" ? " Login Here" : " Sign up"}
                {currentState == "Login" ? (
                  <p className="login-footer" >
                    Forget Password ? 
                    <span onClick={() => resetPass(email)}>reset here</span>{" "}
                  </p>
                ) : null}
              </span>
            </p>
          </div>
        </form>
      </div>
      <div className="login-right">
        <div className="login-overlay">
          <p className="quote">
            “ChattriX helped me connect instantly with my team across the
            world.”
          </p>
          <p className="author">Priyanshu Sharma</p>
        </div>
        <img src={assets.logo_icon} className="login-image" alt="Welcome" />
      </div>
    </div>
  );
};

export default Login;
