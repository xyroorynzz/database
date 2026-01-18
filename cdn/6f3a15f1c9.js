const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason
} = require("@whiskeysockets/baileys")
const pino = require("pino")
const { resolve } = require("path")

const mainHandler = require("./main")
const coreHandler = require("./core")

const PAIR_NUMBER = "6285166343399"     
//real bot number 6283149966525
//test bot number 6285166343399
const OWNER_JID  = "6285165158485@s.whatsapp.net" // penerima notifikasi setelah sukses

let pairingRequested = false

async function start() {
  const sessionPath = resolve(__dirname, "session")
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()

  const logger = pino({ level: "silent" })
  const sock = makeWASocket({
    logger,
    version,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    browser: ["Android", "Chrome", "121.0.6167.178"],
    shouldIgnoreJid: jid => jid === "status@broadcast",
    syncFullHistory: false
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "connecting" && !state.creds.registered && !pairingRequested) {
      pairingRequested = true
      try {
        await new Promise(r => setTimeout(r, 800))
        const code = await sock.requestPairingCode(PAIR_NUMBER)
        console.log("\n=== PAIRING CODE ===\n" + code + "\n====================\n")
        console.log("Masukkan kode di WhatsApp: Linked devices -> Link with code (akun nomor " + PAIR_NUMBER + ")")
      } catch (e) {
        pairingRequested = false
        console.error("PAIRING ERROR:", e.message)
      }
    }

    if (connection === "open") {
      console.log("✔ Pairing sukses, session tersimpan.")
      pairingRequested = false
      try { await sock.sendMessage(OWNER_JID, { text: "bot on" }) } catch {}
    }

    if (connection === "close") {
      pairingRequested = false
      const status = lastDisconnect?.error?.output?.statusCode
      console.log("Disconnected status:", status)

      if (status === DisconnectReason.loggedOut || status === 401) {
        console.log("Logged out: hapus folder session/ lalu pairing ulang.")
        return
      }
      if (status === 428) {
        console.log("Precondition required: kode tidak dipakai/valid. Jalankan ulang untuk minta kode baru.")
        return
      }

      setTimeout(start, 3000)
    }
  })

  // hubungkan event messages ke main.js
  mainHandler(sock, {
    clearcache: require("./sys/clearcache"),
    OWNER_JID,
    PAIR_NUMBER,
    coreHandler
  })
}

start()