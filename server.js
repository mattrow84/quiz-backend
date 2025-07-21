const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

// Permetti tutto (semplice). In produzione puoi restringere a un dominio.
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Stato globale (una sola stanza, 4 opzioni)
let currentQuestion = null;
let currentOptions = { A: "", B: "", C: "", D: "" };
let answers = { A: 0, B: 0, C: 0, D: 0 };

// Nuova connessione
io.on("connection", (socket) => {
  console.log("Socket connesso:", socket.id);

  // Manda stato corrente
  socket.emit("question", {
    question: currentQuestion,
    options: currentOptions,
    answers
  });

  // Admin invia nuova domanda
  socket.on("newQuestion", (data) => {
    currentQuestion = data?.question || "";
    currentOptions = {
      A: data?.options?.A || "",
      B: data?.options?.B || "",
      C: data?.options?.C || "",
      D: data?.options?.D || ""
    };
    answers = { A: 0, B: 0, C: 0, D: 0 };

    io.emit("question", {
      question: currentQuestion,
      options: currentOptions,
      answers
    });
  });

  // Utente vota
  socket.on("answer", (opt) => {
    if (answers[opt] !== undefined) {
      answers[opt]++;
      io.emit("update", answers);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnesso:", socket.id);
  });
});

// Endpoint HTTP semplice (debug)
app.get("/", (req, res) => {
  res.send("Quiz backend attivo");
});

// Porta dinamica per Render + fallback locale
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend avviato sulla porta ${PORT}`);
});
