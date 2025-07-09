import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../config/firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  getDoc,
} from "firebase/firestore";

const VideoCall = () => {
  const { roomId } = useParams();
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const pc = useRef(null);
  const [permissionError, setPermissionError] = useState(false);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [callActive, setCallActive] = useState(true);

  const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    const setup = async () => {
      pc.current = new RTCPeerConnection(servers);

      let localStream;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (error) {
        console.error("Media permission denied:", error);
        setPermissionError(true);
        return;
      }

      window.localStream = localStream;

      if (localRef.current) {
        localRef.current.srcObject = localStream;
      }
      localStream.getTracks().forEach((track) => {
        pc.current.addTrack(track, localStream);
      });

      pc.current.ontrack = (event) => {
        if (remoteRef.current) {
          remoteRef.current.srcObject = event.streams[0];
        }
      };

      const callDoc = doc(db, "calls", roomId);
      const offerCandidates = collection(callDoc, "offerCandidates");
      const answerCandidates = collection(callDoc, "answerCandidates");

      let isCaller = true;

      pc.current.onicecandidate = async (event) => {
        if (event.candidate) {
          const targetCollection = isCaller
            ? offerCandidates
            : answerCandidates;
          await addDoc(targetCollection, event.candidate.toJSON());
        }
      };

      const callSnapshot = await getDoc(callDoc);

      if (callSnapshot.exists() && callSnapshot.data().offer) {
        isCaller = false;

        const offerDescription = callSnapshot.data().offer;
        await pc.current.setRemoteDescription(
          new RTCSessionDescription(offerDescription)
        );

        const answerDescription = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answerDescription);

        const answer = {
          type: answerDescription.type,
          sdp: answerDescription.sdp,
        };
        await setDoc(callDoc, { ...callSnapshot.data(), answer }, { merge: true });
      } else {
        isCaller = true;

        const offerDescription = await pc.current.createOffer();
        await pc.current.setLocalDescription(offerDescription);

        const offer = {
          type: offerDescription.type,
          sdp: offerDescription.sdp,
        };
        await setDoc(callDoc, { offer });
        onSnapshot(callDoc, (snapshot) => {
          const data = snapshot.data();
          if (!pc.current.currentRemoteDescription && data?.answer) {
            const answerDesc = new RTCSessionDescription(data.answer);
            pc.current.setRemoteDescription(answerDesc);
          }
        });
      }

      const unsubOfferCandidates = onSnapshot(offerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.current.addIceCandidate(candidate);
          }
        });
      });

      const unsubAnswerCandidates = onSnapshot(answerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.current.addIceCandidate(candidate);
          }
        });
      });

      // Store cleanup in ref so it's accessible outside setup
      pc.current._unsub = () => {
        unsubOfferCandidates();
        unsubAnswerCandidates();
        pc.current.close();
      };
    };

    setup();

    return () => {
      if (pc.current?._unsub) pc.current._unsub();
    };
  }, [roomId]);

  const toggleMic = () => {
    window.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    });
  };

  const toggleCam = () => {
    window.localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    });
  };

  const endCall = () => {
    if (window.localStream) {
      window.localStream.getTracks().forEach((track) => track.stop());
    }
    setCallActive(false);
    window.location.href = "/chat";
  };

  return permissionError ? (
    <div
      style={{
        color: "white",
        background: "#111",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <h2>🚫 Camera/Microphone Access Denied</h2>
      <p>Please allow access in your browser settings and refresh the page.</p>
    </div>
  ) : (
    <>
      <div
        style={{
          position: "relative",
          width: "100vw",
          height: "100vh",
          background: "#111",
          overflow: "hidden",
        }}
      >
        {/* Remote video - full screen center */}
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Local video - bottom right corner */}
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            width: "200px",
            height: "150px",
            border: "2px solid #0ff",
            borderRadius: "8px",
            objectFit: "cover",
            zIndex: 2,
          }}
        />
      </div>

      {callActive && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "15px",
            background: "rgba(0,0,0,0.6)",
            padding: "10px 20px",
            borderRadius: "8px",
            zIndex: 9999,
          }}
        >
          <button
            onClick={toggleMic}
            style={{
              fontWeight: "bold",
              background: micOn ? "#0ff" : "#555",
              color: micOn ? "#000" : "#ccc",
              padding: "8px 14px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            {micOn ? "Mute Mic" : "Unmute Mic"}
          </button>
          <button
            onClick={toggleCam}
            style={{
              fontWeight: "bold",
              background: camOn ? "#0ff" : "#555",
              color: camOn ? "#000" : "#ccc",
              padding: "8px 14px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            {camOn ? "Turn Off Cam" : "Turn On Cam"}
          </button>
          <button
            onClick={endCall}
            style={{
              background: "red",
              color: "white",
              fontWeight: "bold",
              border: "none",
              padding: "8px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            Hang Up
          </button>
        </div>
      )}
    </>
  );
};

export default VideoCall;
