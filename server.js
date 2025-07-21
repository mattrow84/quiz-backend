const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

// Permetti tutto (semplice). In produzione puoi restringere all'URL del frontend.
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // es: "https://tuo-frontend.vercel.app"
    methods: ["GET", "POST"]
  }
});

// ---- Stato globale ----
let currentQuestion = null;
let currentOptions = { A: "", B: "", C: "", D: "" };
let answers = { A: 0, B: 0, C: 0, D: 0 };
let votedSockets = new Set(); // limita a 1 voto per socket

io.on("connection", (socket) => {
  console.log("Socket connesso:", socket.id);

  // Invia stato corrente
  socket.emit("question", {
    question: currentQuestion,
    options: currentOptions,
    answers
  });

  // Admin -> nuova domanda
  socket.on("newQuestion", (data) => {
    console.log("Nuova domanda ricevuta:", data);
    currentQuestion = data?.question || "";
    currentOptions = {
      A: data?.options?.A || "",
      B: data?.options?.B || "",
      C: data?.options?.C || "",
      D: data?.options?.D || ""
    };
    answers = { A: 0, B: 0, C: 0, D: 0 };
    votedSockets.clear(); // sblocco voti per nuova domanda

    io.emit("question", {
      question: currentQuestion,
      options: currentOptions,
      answers
    });
  });

  // Utente -> voto
  socket.on("answer", (opt) => {
    if (votedSockets.has(socket.id)) {
      socket.emit("alreadyVoted");
      return;
    }
    if (answers[opt] !== undefined) {
      votedSockets.add(socket.id);
      answers[opt]++;
      io.emit("update", answers);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnesso:", socket.id);
  });
});

// Endpoint HTTP semplice
app.get("/", (req, res) => {
  res.send("Quiz backend attivo");
});

// Porta (Render -> process.env.PORT)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend avviato sulla porta ${PORT}`);
});