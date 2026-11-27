import { Client } from "meowsab";
import { subBots, subs } from "./system/sub.js";
import "meowsab/safe";
import "./system/database.js";
import { startApi } from "./system/api.js";
import * as baileys from "baileys";
import notifications from "./system/notifications.js";
import path from "node:path";

/* ========== Client Config ======== */

const client = new Client({
  // commands
  plugsdir: "plugins",
  prefix: [".", "!"],

  // baileys
  library: [baileys],

  // session
  sessionStorage: {
    type: "sqlite",          
    path: "./session",
  },

  // pairing code
  login: {
    method: "pair",

    number: "67572486447",

    number: "84933807000",
    code: "REZE1234",
  },

  // owners
  owners: [
    
    { jid: "9647831000007@s.whatsapp.net", lid: "269144427626750@lid" },
    { jid: "967775061789@s.whatsapp.net", lid: "230919638098013@lid" },
    { jid: "966583820297@s.whatsapp.net", lid: "247579682029763@lid" },
    { lid: "1838246064203@lid" },
    { jid: "201027439894@s.whatsapp.net", lid: "140656605450455@lid" },
    
    { jid: "9647831000007@s.whatsapp.net", lid: "9647831000007@lid" },
    { jid: "9647831000007@s.whatsapp.net", lid: "9647831000007@lid" },
    { jid: "9647831000007@s.whatsapp.net", lid: "9647831000007@lid" },
    { lid: "9647831000007@lid" },
    { jid: "9647831000007@s.whatsapp.net", lid: "140656605450455@lid" },

    { username: "T7_14" },  
  ],

  // control settings
  settings: {
    message_owner_only: false,
    private_mode: false,
    message_group_only: false,
    no_message_baileys: false,
    from_me: false,
  },
});

/* ========== Config Info ======== */

const { config } = client;

config.info = {
  nameBot: "𝐑𝐞𝐳𝐞 𝐁𝐨𝐭",
  title: "𝐑 𝐄 𝐙 𝐄 — 𝐕𝐈𝐈7 🎀 | 𝐁𝐨𝐭 𝐢𝐬 𝐛𝐮𝐢𝐥𝐭 𝐨𝐧 𝐭𝐡𝐞 𝐌𝐄𝐎𝐖𝐒𝐀𝐁 𝐅𝐫𝐚𝐦𝐞𝐰𝐨𝐫𝐤",
  channel: {
    isForwarded: true,
    forwardingScore: 1,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363225356834044@newsletter",
      newsletterName: "𝐔𝐧𝐢𝐨𝐧 ~ 𝐕𝐈𝐈𝟕",
      serverMessageId: 1,
    },
  },
  newsletter: {
    name: "𝐔𝐧𝐢𝐨𝐧 ~ 𝐕𝐈𝐈𝟕",
    jid: "120363225356834044@newsletter",
  },
  images: [
    "https://raw.githubusercontent.com/MohamedVex/Lora-Upload1/main/uploads/1791910619812.jpg",
    "https://raw.githubusercontent.com/MohamedVex/Lora-Upload1/main/uploads/1791910652175.jpg",
    "https://raw.githubusercontent.com/MohamedVex/Lora-Upload1/main/uploads/1791910673893.jpg",
    "https://raw.githubusercontent.com/MohamedVex/Lora-Upload1/main/uploads/1791910702904.jpg",
  ],
};

/* ========== Send the error to owner ======== */
client.on("error", async (err) => {
  const conn = client.sock;
  const owner = client.owners?.[0]?.jid;

  if (!conn || !owner) return;

  const errorText = String(err?.stack || err?.message || err);

  try {
    await conn.sendMessage(owner, { text: errorText });
  } catch (e) {
    console.error("Failed to send error:", e);
  }
});


/* ========== Notification ======== */

const plugins = client.plug();
plugins.notification(notifications);

/* ========== Starting ======== */

const start = async () => {
  await client.connect();
    await subBots(client);

  await subs.start();
  await startApi(client, subs);
  console.log("✅ Installer API started on port 26165");
};

start().catch((err) => {
  console.error("❌ Startup error:", err.message);
});
