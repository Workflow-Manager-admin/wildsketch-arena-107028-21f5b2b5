import React, { useEffect, useState, useRef, useCallback } from "react";
import "./App.css";
import "./index.css";
// Firebase SDK imports
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  query,
  orderBy,
  limit,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

// --- Firebase Config: Pulled From Environment (See supabase.md for details) ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};
// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

// --- UI COLORS ---
const APP_COLORS = {
  primary: "#ff4df0",
  secondary: "#ffffff",
  accent: "#be2778",
  success: "#43e43c",
  shadow: "rgba(200,200,220,0.18)",
};

// --- LIST OF PROMPT ANIMALS (sample, can be extended) ---
const ANIMALS = [
  "🦁 Lion",
  "🦓 Zebra",
  "🐒 Monkey",
  "🐍 Snake",
  "🐢 Turtle",
  "🦉 Owl",
  "🦩 Flamingo",
  "🦖 Dinosaur",
  "🐧 Penguin",
  "🐬 Dolphin",
  "🦅 Eagle",
  "🦖 T-Rex",
];

// --- UTILITY ---
function randomAnimal() {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
}
function uniqueUsername() {
  // Emoji+random number e.g. '🐢-195'
  const emojis = ["🦁", "🦓", "🐒", "🐢", "🐧", "🦩", "🐍", "🦉", "🦖"];
  return `${emojis[Math.floor(Math.random() * emojis.length)]}-${Math.floor(
    100 + Math.random() * 900
  )}`;
}

// --- DRAWING CANVAS COMPONENT ---
function DrawingCanvas({ visible, animal, onFinish, onCancel, submitting }) {
  const canvasRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(45);
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  // Timer logic
  useEffect(() => {
    if (!visible) return;
    setTimeLeft(45);
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          // Auto-finish
          onFinish(getImage());
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line
  }, [visible]);

  const getImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  };

  // Canvas drawing logic
  const start = (e) => {
    if (submitting) return;
    setDrawing(true);
    addPoint(e);
  };
  const end = () => setDrawing(false);
  const draw = (e) => {
    if (!drawing || submitting) return;
    addPoint(e, true);
  };
  const addPoint = (e, dragging = false) => {
    const bbox = canvasRef.current.getBoundingClientRect();
    const x =
      (e.touches?.[0]?.clientX || e.clientX) - bbox.left;
    const y =
      (e.touches?.[0]?.clientY || e.clientY) - bbox.top;
    setPoints((pts) =>
      [...pts, { x, y, dragging }]
    );
  };
  // Redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 350, 320);
    ctx.strokeStyle = APP_COLORS.accent;
    ctx.lineJoin = "round";
    ctx.lineWidth = 5;
    points.forEach(({ x, y, dragging }, i) => {
      ctx.beginPath();
      if (dragging && i) {
        ctx.moveTo(points[i - 1].x, points[i - 1].y);
      } else {
        ctx.moveTo(x - 1, y);
      }
      ctx.lineTo(x, y);
      ctx.closePath();
      ctx.stroke();
    });
  }, [points, visible]);

  // Reset points when opening
  useEffect(() => {
    if (visible) setPoints([]);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="modal-overlay">
      <div className="drawing-modal">
        <div className="drawing-header">
          <span className="animal-prompt">{animal}</span>
          <span className="timer">{timeLeft}s</span>
        </div>
        <canvas
          ref={canvasRef}
          width={350}
          height={320}
          className="drawing-canvas"
          onPointerDown={start}
          onPointerUp={end}
          onPointerOut={end}
          onPointerMove={draw}
          onTouchStart={start}
          onTouchEnd={end}
          onTouchCancel={end}
          onTouchMove={draw}
        >
          Canvas is not supported in this browser.
        </canvas>
        <div className="drawing-actions">
          <button className="btn-secondary" disabled={submitting} onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary" disabled={submitting} onClick={() => onFinish(getImage())}>
            {submitting ? "Uploading..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- SPINNER COMPONENT ---
function Spinner({ spinning, result, onDone, show, colors }) {
  const [deg, setDeg] = useState(0);
  const [isSpin, setIsSpin] = useState(false);

  const handleSpin = () => {
    if (!spinning) return;
    setIsSpin(true);
    setDeg((Math.floor(Math.random() * 4) + 2) * 360 + Math.floor(Math.random() * 360));
    setTimeout(() => {
      onDone(result);
      setIsSpin(false);
    }, 1600);
  };
  useEffect(() => {
    if (spinning) handleSpin();
    // eslint-disable-next-line
  }, [spinning]);
  if (!show) return null;
  return (
    <div className="modal-overlay">
      <div className="spinner-modal">
        <div className="spinner-label">Your drawing prompt:</div>
        <div className="spinner-display" style={{
          borderColor: colors.accent,
        }}>
          <div
            className="animal-emoji"
            style={{
              transform: isSpin
                ? `rotate(${deg}deg)`
                : `rotate(0deg)`,
              transition: "transform 1.2s cubic-bezier(.68,.09,.2,1.27)",
              fontSize: 56,
              filter: "drop-shadow(0 2px 9px #be2778a9)",
            }}
          >
            {result.split(" ")[0]}
          </div>
          <div className="animal-name">{result.split(" ").slice(1).join(" ")}</div>
        </div>
      </div>
    </div>
  );
}

// --- USER LOGIN COMPONENT ---
function UsernameLogin({ onSubmit, loading }) {
  const [uname, setUname] = useState(uniqueUsername());
  const [err, setErr] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!uname.trim() || uname.length < 3) {
      setErr("Choose a longer username.");
      return;
    }
    onSubmit(uname.trim());
  };
  return (
    <div className="login-backdrop">
      <form className="login-form" onSubmit={submit}>
        <h2>
          WildSketch Arena <span role="img" aria-label="brush">🎨</span>
        </h2>
        <label className="login-label">
          Choose a username&nbsp;
          <span className="small">
            (emoji allowed, public)
          </span>
        </label>
        <input
          type="text"
          value={uname}
          onChange={(e) => setUname(e.target.value)}
          className="login-input"
          disabled={loading}
          maxLength={24}
          autoFocus
        />
        {err && <div className="error">{err}</div>}
        <button type="submit" className="btn-primary" disabled={loading}>
          Let&apos;s go!
        </button>
        <div className="disclaimer">
          Anonymous login – no email required
        </div>
      </form>
    </div>
  );
}

// --- SINGLE PUBLIC GUESS COMPONENT ---
function PublicGuess({ guess }) {
  return (
    <span className="public-guess">
      <span role="img" aria-label="❌" style={{marginRight:'2px'}}>❌</span>
      <span style={{fontWeight:'bold'}}>{guess.guess}</span> – by {guess.username}
    </span>
  );
}

// --- DASHBOARD GRID CARD FOR DRAWING ---
function DrawingCard({
  drawing,
  onGuess,
  alreadyGuessed,
  userGuess,
  onImageClick,
  highlight,
  publicGuesses,
  isLeader,
  colors,
}) {
  const [guessText, setGuessText] = useState("");
  const [showWrong, setShowWrong] = useState(false);
  const allowGuess = !alreadyGuessed;

  const submitGuess = async (e) => {
    e.preventDefault();
    if (!guessText.trim()) return;
    onGuess(drawing, guessText.trim()).then((ok) => {
      setShowWrong(!ok);
      setGuessText("");
      setTimeout(() => setShowWrong(false), 1600);
    });
  };
  return (
    <div className={"drawing-card" + (highlight ? " highlight" : "") + (isLeader ? " leader" : "")}
      style={{
        borderColor: isLeader
          ? colors.primary
          : highlight
          ? colors.accent
          : "#e3e3eb",
        boxShadow: highlight
          ? "0 2px 16px 3px #be27785d"
          : isLeader
          ? "0 2px 18px 2px #ff4df04d"
          : "0 2px 10px 0 " + APP_COLORS.shadow,
      }}
    >
      <div className="drawing-img-wrap" onClick={onImageClick}>
        <img
          src={drawing.url}
          alt="drawing"
          className="drawing-img"
        />
      </div>
      <div className="drawing-author">
        <span className="drawing-username">
          {drawing.username}
        </span>
        <span className="drawing-date">
          {drawing.createdAt && new Date(drawing.createdAt.seconds * 1000).toLocaleTimeString()}
        </span>
      </div>
      <div className="drawing-stats">
        <span className="guess-count">
          🏆 {drawing.numCorrect}
        </span>
        <span className="guess-count">
          👀 {publicGuesses.length}
        </span>
      </div>
      {/* Guess section */}
      {allowGuess ? (
        <form className="guess-form" onSubmit={submitGuess}>
          <input
            type="text"
            className="guess-input"
            value={guessText}
            disabled={!allowGuess}
            onChange={(e) => setGuessText(e.target.value)}
            placeholder="Guess the animal..."
            maxLength={24}
          />
          <button className="btn-secondary" disabled={!guessText}>
            Guess
          </button>
        </form>
      ) : (
        <div className="guess-success">
          You guessed: <span className="highlighted">{userGuess?.guess}</span>
        </div>
      )}
      {/* Animation for wrong */}
      {showWrong && (
        <div className="guess-wrong">
          Wrong! 😅
        </div>
      )}
      {/* Public guesses */}
      {publicGuesses.length > 0 && (
        <div className="public-guesses-list">
          {publicGuesses.map((g, i) => (
            <PublicGuess guess={g} key={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- DRAWING PREVIEW MODAL ---
function DrawingModal({ image, onClose }) {
  if (!image) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="drawing-preview-modal" onClick={e => e.stopPropagation()}>
        <img src={image} alt="Full Drawing" className="drawing-modal-img"/>
        <button className="btn-primary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// --- MAIN APP ---
function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [username, setUsername] = useState(""); // local display name
  // App state
  const [drawModal, setDrawModal] = useState(false);
  const [drawSpinner, setDrawSpinner] = useState(false);
  const [animalPrompt, setAnimalPrompt] = useState("");
  const [canvasModal, setCanvasModal] = useState(false);
  const [canvasSub, setCanvasSub] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);

  // Dashboard state
  const [drawings, setDrawings] = useState([]);
  const [guesses, setGuesses] = useState({});
  const [topDrawingId, setTopDrawingId] = useState(null);
  const [submission, setSubmission] = useState(false);

  // PUBLIC_INTERFACE (run once on mount)
  useEffect(() => {
    setUserLoading(true);
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setUserLoading(false);
        setUsername(u.displayName || "");
      } else {
        setUser(null);
        setUserLoading(false);
      }
    });
    return () => unsub();
    // eslint-disable-next-line
  }, []);

  // Fetch drawings, real-time
  useEffect(() => {
    const unsub = onSnapshot(
      query(
        collection(db, "drawings"),
        orderBy("numCorrect", "desc"),
        orderBy("createdAt", "desc"),
        limit(32)
      ),
      (snap) => {
        let arr = [];
        let topId = null, maxCorrect = -1;
        snap.forEach((d) => {
          const data = d.data();
          arr.push({ id: d.id, ...data });
          if (data.numCorrect > maxCorrect) {
            topId = d.id;
            maxCorrect = data.numCorrect;
          }
        });
        setDrawings(arr);
        setTopDrawingId(topId);
      }
    );
    return () => unsub();
  }, []);

  // Fetch guesses for all visible drawings (real-time)
  useEffect(() => {
    if (drawings.length === 0) return;
    const unsubs = [];
    let guessUpdates = {};
    drawings.forEach((drawing) => {
      const unsub = onSnapshot(
        collection(db, "drawings", drawing.id, "guesses"),
        (snap) => {
          guessUpdates[drawing.id] = [];
          snap.forEach((g) => {
            guessUpdates[drawing.id].push({ id: g.id, ...g.data() });
          });
          // Only update after finishing all drawings
          setGuesses((old) => ({ ...old, ...guessUpdates }));
        }
      );
      unsubs.push(unsub);
    });
    return () => { for (let unsub of unsubs) unsub(); };
    // eslint-disable-next-line
  }, [drawings]);

  // PUBLIC_INTERFACE: Login flow
  const handleLogin = useCallback((uname) => {
    setUserLoading(true);
    signInAnonymously(auth)
      .then((cred) => updateProfile(cred.user, { displayName: uname }))
      .then(() => {
        setUsername(uname);
      })
      .finally(() => setUserLoading(false));
  }, []);

  // --- Drawing submission flow ---
  const openAddDrawingModal = () => {
    setDrawSpinner(true);
    // Pick random animal
    setAnimalPrompt(randomAnimal());
    setTimeout(() => {
      setDrawSpinner(false);
      setCanvasModal(true);
    }, 1800); // sync with spinner
  };
  const handleCancelDrawing = () => {
    setCanvasModal(false);
    setCanvasSub(false);
  };

  // Handle finish drawing (image) and upload
  const handleFinishCanvas = async (imgUri) => {
    setCanvasSub(true);
    try {
      // upload image to Firebase Storage
      const imgData = await fetch(imgUri).then((r) => r.blob());
      const fname = `drawings/${user.uid}-${Date.now()}.png`;
      const sref = storageRef(storage, fname);
      await uploadBytes(sref, imgData);
      const url = await getDownloadURL(sref);

      // Add drawing document
      await addDoc(collection(db, "drawings"), {
        url,
        username,
        guesses: [],
        numCorrect: 0,
        correctAnswer: animalPrompt.trim().toLowerCase(),
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      // eslint-disable-next-line
      alert("Could not upload drawing. Try again!");
    } finally {
      setCanvasModal(false);
      setCanvasSub(false);
    }
  };

  // Handle guess submission for a drawing
  const handleGuess = async (drawing, guess) => {
    if (!user || !drawing.id) return false;
    const correct = guess.trim().toLowerCase() === drawing.correctAnswer?.toLowerCase();
    // Allow only one guess per user per drawing
    const guessDocRef = doc(db, "drawings", drawing.id, "guesses", user.uid);
    const guessSnap = await getDoc(guessDocRef);
    if (guessSnap.exists()) return false;
    await setDoc(guessDocRef, {
      guess: guess,
      username,
      correct,
      ts: serverTimestamp(),
    });
    if (correct) {
      await updateDoc(doc(db, "drawings", drawing.id), {
        numCorrect: (drawing.numCorrect || 0) + 1,
      });
      // Animation/positive feedback automatically triggers via state update
    }
    return correct;
  };

  // For drawing modal preview
  const handleCardClick = (img) => setPreviewImg(img);

  // Determine if user already guessed for drawing
  const userGuessFor = (drawingId) => {
    const guessesArr = guesses[drawingId] || [];
    return guessesArr.find((g) => user && g.id === user.uid);
  };

  // Only public wrong guesses for display
  const publicWrongGuesses = (drawingId) =>
    (guesses[drawingId]?.filter((g) => !g.correct) || []).slice(-4);

  // Drawing list for dashboard, sorted: leader, rest by correct/createdAt
  const sorted = (() => {
    if (drawings.length === 0) return [];
    const leader = drawings.find((d) => d.id === topDrawingId);
    return leader
      ? [leader, ...drawings.filter((d) => d.id !== topDrawingId)]
      : drawings;
  })();

  // --- APP LAYOUT RENDER ---
  return (
    <div className="App">
      {/* Stylized floating fab for adding drawing */}
      {user && (
        <button
          className="fab"
          onClick={openAddDrawingModal}
          title="Add a new drawing"
        >
          <span className="fab-emoji" role="img" aria-label="add">
            🎲
          </span>
        </button>
      )}
      {/* Drawing modal (canvas) */}
      <DrawingCanvas
        visible={canvasModal}
        animal={animalPrompt}
        onFinish={handleFinishCanvas}
        onCancel={handleCancelDrawing}
        submitting={canvasSub}
      />
      {/* Spinner modal for prompt */}
      <Spinner
        spinning={drawSpinner}
        result={animalPrompt}
        onDone={() => {}}
        show={drawSpinner}
        colors={APP_COLORS}
      />
      {/* Enlarged drawing preview modal */}
      <DrawingModal image={previewImg} onClose={() => setPreviewImg(null)} />
      {/* Login screen */}
      {!user && !userLoading && (
        <UsernameLogin onSubmit={handleLogin} loading={userLoading} />
      )}

      {/* Dashboard */}
      {user && (
        <div className="dashboard">
          <header className="dashboard-header">
            <div className="logo-title" style={{ color: APP_COLORS.accent }}>
              WildSketch Arena <span style={{fontSize:32}}>🦁</span>
            </div>
            <div className="user-greeting">
              Welcome,&nbsp;
              <b>
                {username}
              </b>
              &nbsp;!
            </div>
          </header>
          {/* Leader Drawing Highlight */}
          {sorted.length > 0 && sorted[0] && (
            <div className="leader-highlight">
              <div className="leader-label">
                <span style={{
                  color: APP_COLORS.primary,
                  fontWeight: 600,
                  letterSpacing: "1px",
                }}>🏆  Top Drawing</span>
              </div>
              <DrawingCard
                drawing={sorted[0]}
                onGuess={handleGuess}
                alreadyGuessed={!!userGuessFor(sorted[0].id)}
                userGuess={userGuessFor(sorted[0].id)}
                onImageClick={() => handleCardClick(sorted[0].url)}
                highlight
                publicGuesses={publicWrongGuesses(sorted[0].id)}
                isLeader
                colors={APP_COLORS}
              />
            </div>
          )}
          {/* Rest of drawings in a responsive grid */}
          <div className="drawings-section">
            <h2
              style={{
                margin: "24px 0 10px 0",
                color: APP_COLORS.accent,
                fontWeight: 500,
                fontSize: "1.5rem",
              }}
            >
              Recent Drawings
            </h2>
            <div className="drawings-grid">
              {sorted.slice(1).map((drawing, i) => (
                <DrawingCard
                  key={drawing.id}
                  drawing={drawing}
                  onGuess={handleGuess}
                  alreadyGuessed={!!userGuessFor(drawing.id)}
                  userGuess={userGuessFor(drawing.id)}
                  onImageClick={() => handleCardClick(drawing.url)}
                  highlight={false}
                  publicGuesses={publicWrongGuesses(drawing.id)}
                  isLeader={false}
                  colors={APP_COLORS}
                />
              ))}
              {sorted.length <= 1 && (
                <div className="empty-tip">
                  <span role="img" aria-label="brush" style={{
                    fontSize: 34,
                  }}>🖌️</span>
                  <br/>
                  Be the first to add a drawing!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Footer */}
      <footer className="footer" style={{ color: APP_COLORS.accent }}>
        Made with <span role="img" aria-label="love">💖</span> for Wildsketch-Arena &nbsp;|&nbsp;
          <a href="https://firebase.google.com/" style={{color: APP_COLORS.primary}}>Firebase</a>
      </footer>
    </div>
  );
}

export default App;
