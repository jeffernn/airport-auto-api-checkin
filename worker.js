// ========= /run /tg 的访问口令（必配） =========
const API_PWD = "网页或API访问的密码，需要先修改哦";

// ========= TG 推送（仍可用 env 覆盖）=========
let BotToken = "";
let ChatID = "";

// ========= 全局配置：支持多站点多账号 =========
const SITES = [
  {
    domain: "https://www.foo.com", // 机场域名
    user: "foo@gmail.com", // 账号
    pass: "foopwd", // 密码
    pagePwd: "1234", //有些机场需要固定密码验证 。为空 / null / undefined => 不做访问验证；否则会先 POST / 提交 pagepwd
	totpKey: "TOTPKEY", // totp 两步登录的密钥
  }
];

let checkinRet = "";
export default {
  async fetch(request, env, ctx) {
    await initializeVariables(env);
    const url = new URL(request.url);
    const ok = verifyApiPwd(request, url);
    if (!ok) {
      return new Response("pwd参数缺失或不正确", { status: 401 });
    }
    if (url.pathname === "/tg") {
      await sendMessage(buildSummaryText("当前配置", buildConfigSummary()));
      return new Response("ok", { status: 200 });
    }
    if (url.pathname === "/run") {
      checkinRet = await runAllSites();
      return new Response(checkinRet, {
        status: 200,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
      });
    }
    return new Response("not found", { status: 404 });
  },
  async scheduled(controller, env, ctx) {
    try {
      await initializeVariables(env);
      checkinRet = await runAllSites();
      await sendMessage(checkinRet);
    } catch (error) {
      checkinRet = `定时任务执行失败: ${error.message}`;
      await sendMessage(checkinRet);
    }
  },
};
async function initializeVariables(env) {
  BotToken = env.TGTOKEN || BotToken;
  ChatID = env.TGID || ChatID;
}
function verifyApiPwd(request, url) {
  // 1) query: /run?pwd=xxx
  const qPwd = url.searchParams.get("pwd");
  // 2) header: x-run-pwd: xxx （避免出现在URL日志里）
  const hPwd = request.headers.get("x-pwd");
  const provided = (hPwd && hPwd.trim()) || (qPwd && qPwd.trim()) || "";
  if (API_PWD === provided) {
    return true;
  }
  return false;
}
// =============== 主流程：跑全部站点 ===============
async function runAllSites() {
  const results = [];
  for (const site of SITES) {
    const one = await checkinOneSite(site).catch(
      (e) => `❌ ${maskDomain(site.domain)}\n错误: ${e.message}`
    );
    results.push(one);
  }
  return results.join("\n\n------------------------\n\n");
}
async function checkinOneSite(site) {
  const domain = normalizeDomain(site.domain);
  const user = site.user;
  const pass = site.pass;
  const pagePwd = site.pagePwd;
  const totpKey = site.totpKey;
  if (!domain || !user || !pass) throw new Error("站点配置缺失 domain/user/pass");
  let verifyCookie = "";
  if (pagePwd != null && String(pagePwd).trim() !== "") {
    verifyCookie = await verifyAccess(domain, pagePwd);
  }
  // ======= 新增：如配置totpKey则生成6位TOTP验证码 =======
  let code = "";
  if (totpKey != null && String(totpKey).trim() !== "") {
    code = await generateTOTP6(String(totpKey).trim());
  }
  const loginResponse = await fetch(`${domain}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      Origin: domain,
      Referer: `${domain}/auth/login`,
      ...(verifyCookie ? { Cookie: verifyCookie } : {}),
    },
    body: JSON.stringify({
      email: user,
      passwd: pass,
      remember_me: "on",
      code: code, // <= 这里使用TOTP验证码（无totpKey则为空字符串）
    }),
  });
  if (!loginResponse.ok) {
    const t = await loginResponse.text().catch(() => "");
    throw new Error(`登录请求失败 HTTP=${loginResponse.status}: ${t.slice(0, 200)}`);
  }
  const loginJson = await loginResponse.json();
  if (loginJson.ret !== 1) throw new Error(`登录失败: ${loginJson.msg || "未知错误"}`);
  const loginCookie = extractCookiePairs(getSetCookies(loginResponse.headers)).join("; ");
  if (!loginCookie) throw new Error("登录成功但未收到Cookie");
  const mergedCookie = mergeCookies(verifyCookie, loginCookie);
  const checkinResponse = await fetch(`${domain}/user/checkin`, {
    method: "POST",
    headers: {
      Cookie: mergedCookie,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      Origin: domain,
      Referer: `${domain}/user/panel`,
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const responseText = await checkinResponse.text().catch(() => "");
  let msg = "";
  let trafficInfo = "";
  try {
    const checkinResult = JSON.parse(responseText);
    msg = checkinResult.msg || (checkinResult.ret === 1 ? "签到成功" : "签到失败");
    if (checkinResult.trafficInfo) {
      const todayUsed = checkinResult.trafficInfo.todayUsedTraffic || "未知";
      const lastUsed = checkinResult.trafficInfo.lastUsedTraffic || "未知";
      const unUsed = checkinResult.trafficInfo.unUsedTraffic || "未知";
      trafficInfo = `\n今日使用流量: ${todayUsed}\n过去使用流量: ${lastUsed}\n剩余流量: ${unUsed}`;
    } else {
      trafficInfo = `\n流量信息不可用`;
    }
  } catch (e) {
    throw new Error(`签到响应非JSON或解析失败: ${e.message}；原始=${responseText.slice(0, 200)}`);
  }
  const head =
    `🎉 签到结果\n` +
    `站点: ${domain}\n` +
    `账号: ${maskUser(user)}\n` +
    `访问验证: ${pagePwd != null && String(pagePwd).trim() !== "" ? "启用" : "未启用"}` +
    `\nTOTP: ${totpKey != null && String(totpKey).trim() !== "" ? "启用" : "未启用"}`;
  return `${head}\n结果: ${msg}${trafficInfo}`;
}
async function verifyAccess(domain, pagePwd) {
  const resp = await fetch(`${domain}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: domain,
      Referer: `${domain}/`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    body: `pagepwd=${encodeURIComponent(pagePwd)}`,
  });
  const setCookies = getSetCookies(resp.headers);
  const pairs = extractCookiePairs(setCookies);
  const cookieStr = pairs.join("; ");
  if (!cookieStr) {
    const t = await resp.text().catch(() => "");
    throw new Error(`访问验证未获取到Cookie，HTTP=${resp.status}，响应片段=${t.slice(0, 120)}`);
  }
  return cookieStr;
}
// =============== TG 推送 ===============
async function sendMessage(msg = "") {
  if (!BotToken || !ChatID) return;
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const formattedTime = beijingTime.toISOString().slice(0, 19).replace("T", " ");
  const text = `执行时间: ${formattedTime}\n\n${msg}`;
  const url = `https://api.telegram.org/bot${BotToken}/sendMessage?chat_id=${ChatID}&parse_mode=HTML&text=${encodeURIComponent(
    text
  )}`;
  return fetch(url, {
    method: "get",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;",
      "Accept-Encoding": "gzip, deflate, br",
      "User-Agent": "Mozilla/5.0 Chrome/90.0.4430.72",
    },
  });
}
// =============== TOTP（6位） ===============
function base32ToBytes(base32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = String(base32)
    .toUpperCase()
    .replace(/=+$/g, "")
    .replace(/[\s-]/g, "");
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of cleaned) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new Error(`totpKey 含非法Base32字符: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}
function intToBytes(counter) {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(counter / 2 ** 32) >>> 0, false); // high
  view.setUint32(4, counter >>> 0, false); // low
  return new Uint8Array(buf);
}
async function hmacSha1(keyBytes, msgBytes) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgBytes);
  return new Uint8Array(sig);
}
async function generateTOTP6(base32Secret) {
  const step = 30;
  const digits = 6;
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / step);
  const keyBytes = base32ToBytes(base32Secret);
  const counterBytes = intToBytes(counter);
  const hmac = await hmacSha1(keyBytes, counterBytes);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const otp = (binCode % 10 ** digits).toString().padStart(digits, "0");
  return otp;
}
// =============== 工具函数 ===============
function normalizeDomain(d) {
  if (!d) return "";
  if (!d.includes("//")) return `https://${d}`;
  return d.replace(/\/+$/, "");
}
function getSetCookies(headers) {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie() || [];
  const sc = headers.get("set-cookie");
  return sc ? [sc] : [];
}
function extractCookiePairs(setCookieHeaders) {
  return (setCookieHeaders || [])
    .map((h) => (h || "").split(";")[0].trim())
    .filter(Boolean);
}
function mergeCookies(...cookieStrings) {
  const jar = new Map();
  for (const str of cookieStrings) {
    if (!str) continue;
    const parts = str
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const p of parts) {
      const eq = p.indexOf("=");
      if (eq <= 0) continue;
      const name = p.slice(0, eq).trim();
      const val = p.slice(eq + 1);
      jar.set(name, val);
    }
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function maskUser(u) {
  if (!u || u.length < 3) return "****";
  return `${u.substring(0, 1)}****${u.substring(u.length - 5)}`;
}
function maskDomain(d) {
  const domain = normalizeDomain(d);
  if (domain.length < 14) return domain;
  return `${domain.substring(0, 10)}****${domain.substring(domain.length - 6)}`;
}
function buildConfigSummary() {
  return SITES
    .map((s, i) => {
      const d = normalizeDomain(s.domain);
      const verifyOn = s.pagePwd != null && String(s.pagePwd).trim() !== "";
      const totpOn = s.totpKey != null && String(s.totpKey).trim() !== "";
      return `#${i + 1} ${d}\n账号: ${maskUser(s.user)}\n访问验证: ${verifyOn ? "启用" : "未启用"}\nTOTP: ${
        totpOn ? "启用" : "未启用"
      }`;
    })
    .join("\n\n");
}
function buildSummaryText(title, body) {
  return `${title}\n\n${body}`;
}
