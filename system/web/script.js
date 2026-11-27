const API = `${location.origin}/api/sub`;

const $ = id => document.getElementById(id);
const input = $("num");
const btn = $("submitBtn");
const codeEl = $("codeBox");
const msgEl = $("statusMsg");
const countEl = $("botsCount");

let watchToken = 0;
let watchTimer = null;

const url = (endpoint, number) => {
  const q = new URLSearchParams({ t: Date.now() });
  if (number) q.set("number", number);
  return `${API}/${endpoint}?${q}`;
};

const msg = (text, type) => {
  msgEl.textContent = text;
  msgEl.className = `status-msg ${type}`;
  msgEl.style.display = "block";
};

const code = text => {
  codeEl.textContent = text ?? "";
  codeEl.style.display = text ? "block" : "none";
};

const get = async (endpoint, number = null, timeout = 15000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url(endpoint, number), {
      cache: "no-store",
      signal: ctrl.signal,
    });
    const text = await res.text();
    return { ok: res.ok, data: text ? JSON.parse(text) : null };
  } finally {
    clearTimeout(timer);
  }
};

const savedCode = n => sessionStorage.getItem(`reze_${n}`) ?? "";
const saveCode = (n, c) => sessionStorage.setItem(`reze_${n}`, c);
const clearCode = n => sessionStorage.removeItem(`reze_${n}`);

async function refreshCount() {
  try {
    const { data } = await get("count", null, 8000);
    countEl.textContent = data?.count ?? "-";
  } catch {
    countEl.textContent = "-";
  }
}

function stopWatch() {
  watchToken++;
  clearTimeout(watchTimer);
  watchTimer = null;
}

function startWatch(number) {
  stopWatch();
  const token = watchToken;

  const step = async () => {
    if (token !== watchToken) return;

    try {
      const { data } = await get("status", number, 8000);
      if (data?.connected) {
        stopWatch();
        clearCode(number);
        code("");
        msg("تم الربط بنجاح", "ok");
        refreshCount();
        return;
      }
    } catch {}

    if (token === watchToken) {
      watchTimer = setTimeout(step, 2500);
    }
  };

  watchTimer = setTimeout(step, 2500);
}

async function submit() {
  const number = input.value.replace(/\D/g, "");

  if (number.length < 8) {
    msg("اكتب رقم صحيح بكود الدولة", "error");
    return;
  }

  stopWatch();
  btn.disabled = true;
  btn.textContent = "جاري الفحص...";

  try {
    const { data: status } = await get("status", number);
    if (status?.connected) {
      clearCode(number);
      code("");
      msg("الرقم مربوط بالفعل", "error");
      return;
    }

    btn.textContent = "جاري طلب الكود...";
    const { data } = await get("add", number, 25000);

    if (data?.success && data.code) {
      saveCode(number, data.code);
      code(data.code);
      msg("اضغط على الكود لنسخه - بانتظار الربط...", "ok");
      startWatch(number);
      return;
    }

    const old = data?.code ?? savedCode(number);
    code(old);
    msg(
      old ? "ده الكود الحالي" : "جلسة الرقم مفتوحة، انتظر قليلًا",
      old ? "ok" : "warn"
    );
    startWatch(number);
  } catch {
    const old = savedCode(number);
    code(old);
    msg(
      old ? "ده الكود الحالي" : "فشل الاتصال، أعد المحاولة",
      old ? "warn" : "error"
    );
    if (old) startWatch(number);
  } finally {
    btn.disabled = false;
    btn.textContent = "طلب الكود";
  }
}

async function copy() {
  const text = codeEl.textContent;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  msg("تم نسخ الكود - بانتظار الربط...", "ok");
}

btn.onclick = submit;
input.onkeydown = e => e.key === "Enter" && submit();
codeEl.onclick = copy;
document.onvisibilitychange = () => {
  if (document.visibilityState === "visible") refreshCount();
};

refreshCount();
setInterval(refreshCount, 3000);