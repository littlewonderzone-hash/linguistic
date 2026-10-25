/**
 * Linguistic (লিঙ্গুইসটিক অলিম্পিয়াড প্রস্তুতি কোর্স) — Google Apps Script ব্যাকএন্ড
 * ---------------------------------------------------------
 * এই কোডটি Google Sheet-কে ডাটাবেস হিসেবে ব্যবহার করে একটা API সার্ভার
 * তৈরি করে। কোনো ম্যানুয়াল হেডার লেখা বা Sheet ID কপি করার দরকার নেই —
 * নিচের setup() ফাংশনটা একবার Run করলেই সব ট্যাব, হেডার, ডিফল্ট
 * অ্যাডমিন — সব নিজে থেকে তৈরি হয়ে যাবে। আগে থেকে ডেটা থাকলে setup()
 * আবার Run করলেও পুরনো কোনো ডেটা মোছে না — শুধু নতুন কলাম/ট্যাব যোগ হয়।
 *
 * সেটআপ নির্দেশনা README_BN.md ফাইলে দেখুন।
 */

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "linguistic2026"; // ডিপ্লয়ের পর এটা অবশ্যই বদলান

// প্রতিটা তালিকায় নতুন ফিল্ড সবসময় শেষে যোগ করা হয় — যাতে আগে থেকে থাকা
// শিটের কোনো কলাম এলোমেলো না হয়ে যায়, পুরনো ডেটা অক্ষত থাকে।
const REGISTRATION_HEADERS = [
  "id", "name", "className", "school", "division", "phone", "email",
  "password", "bkashSender", "transactionId", "status", "note", "createdAt",
  "studentToken", "tier",
];

const NOTICE_HEADERS = ["id", "message", "active", "createdAt"];

const CONTACT_HEADERS = ["id", "email", "phone", "message", "status", "createdAt"];

const WRITTEN_QUESTION_HEADERS = [
  "id", "passageHtml", "questionsJson", "kind", "status",
  "forMock", "forLive", "createdAt", "passageImageUrl", "liveExamId",
];

// একাধিক লাইভ পরীক্ষা — প্রতিটার নিজস্ব নাম, শুরু/শেষের উইন্ডো (ISO সময়) ও পরীক্ষার সময়কাল (মিনিট)
const LIVE_EXAM_HEADERS = ["id", "title", "start", "end", "minutes", "createdAt"];

const WRITTEN_ATTEMPT_HEADERS = [
  "id", "registrationId", "phone", "email", "examType", "kind", "sessionId",
  "writtenQuestionId", "subQuestionId", "subQuestionText", "points", "imageUrl",
  "status", "score", "annotatedImageUrl", "adminComment", "createdAt", "gradedAt",
  "subQuestionImageUrl", "liveExamId",
];

const BENGALI_ORDINALS = [
  "প্রথম", "দ্বিতীয়", "তৃতীয়", "চতুর্থ", "পঞ্চম", "ষষ্ঠ", "সপ্তম", "অষ্টম",
  "নবম", "দশম", "একাদশ", "দ্বাদশ", "ত্রয়োদশ", "চতুর্দশ", "পঞ্চদশ",
];

function ordinalBn_(n) {
  return BENGALI_ORDINALS[n - 1] || n + "তম";
}

/**
 * এই একটামাত্র ফাংশন Run করলে দরকারি সব শিট/ট্যাব, হেডার, ডিফল্ট সেটিংস
 * এবং একটা ডিফল্ট অ্যাডমিন — সব অটোমেটিক তৈরি হয়ে যাবে। আগে একবার Run করা
 * থাকলেও আবার Run করা নিরাপদ — নতুন আপডেটে যোগ হওয়া কলাম/ট্যাব শুধু যোগ হবে,
 * পুরনো কোনো সারি/মান মোছা হবে না।
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let regSheet = ss.getSheetByName("Registrations");
  if (!regSheet) regSheet = ss.insertSheet("Registrations");
  ensureHeaders_(regSheet, REGISTRATION_HEADERS);
  forceTextColumn_(regSheet, REGISTRATION_HEADERS.indexOf("phone") + 1);
  forceTextColumn_(regSheet, REGISTRATION_HEADERS.indexOf("bkashSender") + 1);
  forceTextColumn_(regSheet, REGISTRATION_HEADERS.indexOf("transactionId") + 1);

  let settingsSheet = ss.getSheetByName("Settings");
  if (!settingsSheet) settingsSheet = ss.insertSheet("Settings");
  if (settingsSheet.getLastRow() === 0) {
    settingsSheet.appendRow(["key", "value"]);
    settingsSheet.appendRow(["price", "99"]);
    settingsSheet.appendRow(["discountDeadline", ""]);
    settingsSheet.appendRow(["courseImageUrl", ""]);
    settingsSheet.appendRow(["maintenanceMode", "FALSE"]);
    settingsSheet.appendRow(["writtenMinutes", "25"]);
    settingsSheet.appendRow(["setsPerExam", "3"]);
    settingsSheet.appendRow(["logoUrl", ""]);
    settingsSheet.appendRow(["offlineWrittenLastUsed", "[]"]);
    settingsSheet.setFrozenRows(1);
  } else {
    ensureSettingsKeys_(settingsSheet, [
      "writtenMinutes", "setsPerExam", "logoUrl",
      "offlineWrittenLastUsed",
    ]);
  }

  let adminsSheet = ss.getSheetByName("Admins");
  if (!adminsSheet) adminsSheet = ss.insertSheet("Admins");
  if (adminsSheet.getLastRow() === 0) {
    adminsSheet.appendRow(["username", "password", "token"]);
    adminsSheet.appendRow([DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD, ""]);
    adminsSheet.setFrozenRows(1);
  }

  let noticesSheet = ss.getSheetByName("Notices");
  if (!noticesSheet) noticesSheet = ss.insertSheet("Notices");
  ensureHeaders_(noticesSheet, NOTICE_HEADERS);

  let contactsSheet = ss.getSheetByName("Contacts");
  if (!contactsSheet) contactsSheet = ss.insertSheet("Contacts");
  ensureHeaders_(contactsSheet, CONTACT_HEADERS);

  let writtenQSheet = ss.getSheetByName("WrittenQuestions");
  if (!writtenQSheet) writtenQSheet = ss.insertSheet("WrittenQuestions");
  ensureHeaders_(writtenQSheet, WRITTEN_QUESTION_HEADERS);

  let liveSheet = ss.getSheetByName("LiveExams");
  if (!liveSheet) liveSheet = ss.insertSheet("LiveExams");
  ensureHeaders_(liveSheet, LIVE_EXAM_HEADERS);

  let writtenASheet = ss.getSheetByName("WrittenAttempts");
  if (!writtenASheet) writtenASheet = ss.insertSheet("WrittenAttempts");
  ensureHeaders_(writtenASheet, WRITTEN_ATTEMPT_HEADERS);

  const blank = ss.getSheetByName("Sheet1");
  if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);

  Logger.log("সেটআপ সম্পন্ন! এখন Deploy → New deployment (বা Manage deployments → New version) করুন।");
  Logger.log("অ্যাডমিন লগইন — username: " + DEFAULT_ADMIN_USERNAME + " | password: " + DEFAULT_ADMIN_PASSWORD);
}

/** কোনো শিটে হেডার না থাকলে বসিয়ে দেয়; থাকলে যা যা নতুন কলাম বাকি আছে সেগুলো
 *  শেষে যোগ করে দেয় — পুরনো কোনো ডেটা/কলামের অবস্থান বদলায় না। */
function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    return;
  }
  const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  headers.forEach((h) => {
    if (existing.indexOf(h) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h);
      existing.push(h);
    }
  });
}

/**
 * নতুন সারি যোগ করার সময় ডেটা সবসময় হেডারের *আসল নাম* দেখে সঠিক কলামে বসায় —
 * কোনো কলামের অবস্থান কোডে যেভাবে লেখা আছে সেই অনুমানের উপর নির্ভর করে না।
 *
 * কেন এটা জরুরিঃ ensureHeaders_() নতুন কলাম সবসময় শিটের *শেষে* যোগ করে, কিন্তু
 * কোডের হেডার-তালিকায় (যেমন WRITTEN_ATTEMPT_HEADERS) নতুন ফিল্ড মাঝখানে যোগ
 * হলে (যেমন "kind" আগে "sessionId"-এর ঠিক আগে বসানো হয়েছিল, শেষে না), তখন
 * appendRow([...fixed order...]) ভুল কলামে ডেটা বসিয়ে দিতে পারে — যেটা
 * "স্টুডেন্ট এক প্রশ্নের উত্তর দিয়েছে কিন্তু এডমিন প্যানেলে অন্য প্রশ্ন
 * দেখাচ্ছে" এই বাগের মূল কারণ ছিল। এই ফাংশনটা সবসময় শিটের *বর্তমান* হেডার
 * সারি পড়ে, নামের সাথে মিলিয়ে বসায় — তাই ভবিষ্যতে হেডার-অর্ডার যেভাবেই
 * বদলাক না কেন এই সমস্যা আর হবে না।
 */
function appendRowByHeaders_(sheet, dataObject) {
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headerRow.map((h) => (Object.prototype.hasOwnProperty.call(dataObject, h) ? dataObject[h] : ""));
  sheet.appendRow(row);
}

/** পুরনো Settings শিটে নতুন কোনো key না থাকলে সেটা খালি মান দিয়ে যোগ করে দেয়। */
function ensureSettingsKeys_(sheet, keys) {
  const rows = sheet.getDataRange().getValues();
  const existing = rows.slice(1).map((r) => r[0]);
  keys.forEach((k) => {
    if (existing.indexOf(k) === -1) sheet.appendRow([k, ""]);
  });
}

/** একটা কলামের ফরম্যাট "Plain text" করে দেয় যাতে ০১XXXXXXXXX-এর মতো নম্বরের
 *  শুরুর "0" Google Sheets সংখ্যা ভেবে মুছে না ফেলে। */
function forceTextColumn_(sheet, colIndex) {
  if (colIndex < 1) return;
  sheet.getRange(1, colIndex, Math.max(sheet.getMaxRows(), 1000), 1).setNumberFormat("@");
}

function getSheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1).map((row, idx) => {
    const obj = { _row: idx + 2 };
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });
}

function findRowIndexById_(sheet, id) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) return i + 1; // 1-indexed sheet row
  }
  return -1;
}

/** ফোন নম্বর তুলনার জন্য নরমালাইজ করে — Sheets মাঝেমধ্যে শুরুর "0" মুছে ফেলে,
 *  এই ফাংশনটা সেটা ধরে আবার বসিয়ে দেয় যাতে পুরনো (already-corrupted) সারির
 *  সাথেও ঠিকভাবে মিলে যায়। */
function normalizePhone_(v) {
  let digits = String(v || "").replace(/[^0-9]/g, "");
  if (digits.length === 10 && digits[0] !== "0") digits = "0" + digits;
  return digits;
}

/**
 * এই ফাংশনটা একবার ম্যানুয়ালি Run করলে Registrations শিটে আগে থেকে যেসব ফোন/বিকাশ
 * নম্বরের শুরুর "0" হারিয়ে গেছে (Google Sheets সংখ্যা ভেবে ফেলেছিল), সেগুলো খুঁজে বের
 * করে আবার "0" বসিয়ে ঠিক করে দেয় — শুধুমাত্র ১০-ডিজিটের (０ ছাড়া) নম্বরে প্রযোজ্য।
 * Apps Script এডিটরে ড্রপডাউন থেকে "fixExistingPhoneNumbers" সিলেক্ট করে ▶ Run করুন।
 */
function fixExistingPhoneNumbers() {
  const sheet = getSheet_("Registrations");
  forceTextColumn_(sheet, REGISTRATION_HEADERS.indexOf("phone") + 1);
  forceTextColumn_(sheet, REGISTRATION_HEADERS.indexOf("bkashSender") + 1);

  const phoneCol = REGISTRATION_HEADERS.indexOf("phone") + 1;
  const bkashCol = REGISTRATION_HEADERS.indexOf("bkashSender") + 1;
  const lastRow = sheet.getLastRow();
  let fixedCount = 0;

  for (let row = 2; row <= lastRow; row++) {
    [phoneCol, bkashCol].forEach((col) => {
      const cell = sheet.getRange(row, col);
      const current = String(cell.getValue() || "");
      const normalized = normalizePhone_(current);
      if (normalized && normalized !== current) {
        cell.setValue(normalized);
        fixedCount++;
      }
    });
  }

  Logger.log("ঠিক করা হয়েছে এমন ঘরের সংখ্যা: " + fixedCount);
}

/* ---------------- Settings ---------------- */

function getSettingsObj_() {
  const sheet = getSheet_("Settings");
  const rows = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < rows.length; i++) {
    settings[rows[i][0]] = rows[i][1];
  }
  settings.maintenanceMode = settings.maintenanceMode === true || settings.maintenanceMode === "TRUE";
  return settings;
}

function setSettingsObj_(newSettings) {
  const sheet = getSheet_("Settings");
  const rows = sheet.getDataRange().getValues();
  const keyRow = {};
  for (let i = 1; i < rows.length; i++) keyRow[rows[i][0]] = i + 1;

  Object.keys(newSettings).forEach((key) => {
    if (key === "action" || key === "token") return;
    const val = newSettings[key];
    if (keyRow[key]) {
      sheet.getRange(keyRow[key], 2).setValue(val);
    } else {
      sheet.appendRow([key, val]);
    }
  });
}

/* ---------------- Admin auth ---------------- */

function checkAdminToken_(token) {
  const admins = sheetToObjects_(getSheet_("Admins"));
  return admins.some((a) => String(a.token) === String(token) && token);
}

function adminLogin_(username, password) {
  const sheet = getSheet_("Admins");
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(username) && String(rows[i][1]) === String(password)) {
      const token = Utilities.getUuid();
      sheet.getRange(i + 1, 3).setValue(token);
      return token;
    }
  }
  return null;
}

/* ---------------- Registration ---------------- */

function registerStudent_(data) {
  const sheet = getSheet_("Registrations");
  const id = Utilities.getUuid();
  forceTextColumn_(sheet, REGISTRATION_HEADERS.indexOf("phone") + 1);
  forceTextColumn_(sheet, REGISTRATION_HEADERS.indexOf("bkashSender") + 1);
  forceTextColumn_(sheet, REGISTRATION_HEADERS.indexOf("transactionId") + 1);
  appendRowByHeaders_(sheet, {
    id,
    name: data.name,
    className: data.className,
    school: data.school,
    division: data.division,
    phone: normalizePhone_(data.phone),
    email: data.email,
    password: data.password,
    bkashSender: normalizePhone_(data.bkashSender),
    transactionId: data.transactionId,
    status: "pending", // পেমেন্ট যাচাইয়ের পর অ্যাডমিন কনফার্ম করবেন
    note: "",
    createdAt: new Date(),
    studentToken: "",
    tier: "paid",
  });
  return id;
}

function findRegistrationByContact_(phone, email) {
  const rows = sheetToObjects_(getSheet_("Registrations"));
  const matches = rows.filter(
    (r) => normalizePhone_(r.phone) === normalizePhone_(phone) && String(r.email).trim().toLowerCase() === String(email).trim().toLowerCase()
  );
  return matches.length ? matches[matches.length - 1] : null;
}

/** ফোন নম্বর *অথবা* ইমেইল — যেকোনো একটা আগে থেকে থাকলেও ম্যাচ ধরা হয়, যাতে
 *  একই ফোন বা একই ইমেইল দিয়ে দ্বিতীয়বার রেজিস্ট্রেশন করা না যায় (বিশেষত ফ্রি
 *  টায়ারের অপব্যবহার ঠেকাতে জরুরি)। */
function findRegistrationByPhoneOrEmail_(phone, email) {
  const rows = sheetToObjects_(getSheet_("Registrations"));
  const normPhone = normalizePhone_(phone);
  const normEmail = String(email).trim().toLowerCase();
  return rows.find(
    (r) => (normPhone && normalizePhone_(r.phone) === normPhone) || (normEmail && String(r.email).trim().toLowerCase() === normEmail)
  ) || null;
}

function findRegistrationById_(id) {
  const rows = sheetToObjects_(getSheet_("Registrations"));
  return rows.find((r) => String(r.id) === String(id)) || null;
}

/* ---------------- স্টুডেন্ট লগইন ---------------- */

function studentLogin_(email, password) {
  const sheet = getSheet_("Registrations");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const emailCol = headers.indexOf("email");
  const passCol = headers.indexOf("password");
  const tokenCol = headers.indexOf("studentToken");

  for (let i = 1; i < rows.length; i++) {
    if (
      String(rows[i][emailCol]).trim().toLowerCase() === String(email).trim().toLowerCase() &&
      String(rows[i][passCol]) === String(password)
    ) {
      const token = Utilities.getUuid();
      sheet.getRange(i + 1, tokenCol + 1).setValue(token);
      return { token, row: rows[i], headers };
    }
  }
  return null;
}

function findRegistrationByStudentToken_(token) {
  if (!token) return null;
  const rows = sheetToObjects_(getSheet_("Registrations"));
  return rows.find((r) => String(r.studentToken) === String(token)) || null;
}

/* ---------------- নোটিশ ---------------- */

function addNotice_(message) {
  const sheet = getSheet_("Notices");
  const id = Utilities.getUuid();
  appendRowByHeaders_(sheet, { id, message, active: true, createdAt: new Date() });
  return id;
}

function listActiveNotices_() {
  const rows = sheetToObjects_(getSheet_("Notices"));
  return rows
    .filter((n) => n.active === true || n.active === "TRUE")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((n) => ({ id: n.id, message: n.message, createdAt: n.createdAt }));
}

/* ---------------- যোগাযোগ ফর্ম ---------------- */

function addContact_(data) {
  const sheet = getSheet_("Contacts");
  const id = Utilities.getUuid();
  appendRowByHeaders_(sheet, {
    id,
    email: data.email,
    phone: normalizePhone_(data.phone),
    message: data.message,
    status: "new",
    createdAt: new Date(),
  });
  return id;
}

/* ---------------- সাধারণ সহায়ক ---------------- */

function shuffleArray_(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- সেটিংস থেকে লিখিত পরীক্ষার সময় ও সেট সংখ্যা ---------------- */

function getWrittenMinutes_() {
  const n = Number(getSettingsObj_().writtenMinutes);
  return n > 0 ? Math.round(n) : 25;
}

function getSetsPerExam_() {
  const n = Number(getSettingsObj_().setsPerExam);
  return n >= 1 ? Math.min(Math.round(n), 50) : 3;
}

/* ---------------- লাইভ পরীক্ষা (একাধিক, একই দিনেও) ---------------- */

function toIso_(v) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

function listLiveExams_() {
  return sheetToObjects_(getSheet_("LiveExams"))
    .filter((e) => e.id)
    .map((e) => ({
      id: String(e.id),
      title: e.title || "লাইভ পরীক্ষা",
      start: toIso_(e.start),
      end: toIso_(e.end),
      minutes: Number(e.minutes) > 0 ? Math.round(Number(e.minutes)) : 25,
    }))
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}

function findLiveExam_(id) {
  return listLiveExams_().find((e) => e.id === String(id)) || null;
}

/** কোন কোন লাইভ পরীক্ষায় এই স্টুডেন্ট ইতিমধ্যে অংশ নিয়েছে (জমা দিয়েছে) তার আইডির সেট। */
function participatedLiveExamIds_(registrationId) {
  const rows = sheetToObjects_(getSheet_("WrittenAttempts")).filter(
    (a) => String(a.registrationId) === String(registrationId) && a.examType === "live" && a.liveExamId
  );
  return new Set(rows.map((a) => String(a.liveExamId)));
}

/** প্রতিটা লাইভ পরীক্ষার অবস্থা: upcoming | open | closed, আর স্টুডেন্ট অংশ নিয়েছে কিনা।
 *  স্টুডেন্ট প্রতিটা লাইভ পরীক্ষায় একবারই অংশ নিতে পারে, কিন্তু আলাদা আলাদা লাইভ পরীক্ষা
 *  (একই দিনেও) যতগুলো খুশি নিতে পারে। */
function liveExamsWithStatus_(registrationId) {
  const now = new Date();
  const done = registrationId ? participatedLiveExamIds_(registrationId) : new Set();
  return listLiveExams_().map((e) => {
    const start = new Date(e.start);
    const end = new Date(e.end);
    let status = "open";
    if (now < start) status = "upcoming";
    else if (now > end) status = "closed";
    return { ...e, status, participated: done.has(e.id) };
  });
}

/* ---------------- লিখিত পরীক্ষা ---------------- */

/** একটা প্যাসেজ (উদ্দীপক) একাধিক প্রশ্নসহ যোগ করা হয়। q.subQuestions একটা
 *  অ্যারে: [{text, points, imageUrl?, imageBase64?}, ...]। kind: "written"
 *  (লিখিত)। status: "draft" | "published"।
 *
 *  ছবি-প্রশ্ন: অ্যাডমিন উদ্দীপক (passageImageBase64) এবং/অথবা প্রতিটা প্রশ্নের
 *  (sq.imageBase64) জন্য ছবি দিতে পারেন — ছবিগুলো এই স্ক্রিপ্ট যে Google
 *  অ্যাকাউন্টে চলছে (ডেটাবেজ অ্যাকাউন্ট) তার Drive-এর "Linguistic Question Images"
 *  ফোল্ডারে সেভ হয় এবং স্টুডেন্টরা পরীক্ষায় সেটা দেখতে পায়। লেখা ছাড়া শুধু ছবি
 *  দিয়েও প্রশ্ন যোগ করা যায়। এডিটের সময় আগের ছবির URL (passageImageUrl /
 *  sq.imageUrl) ফেরত এলে সেটাই রাখা হয়; খালি পাঠালে ছবি সরে যায়। */
function resolveQuestionImage_(base64, existingUrl, prefix) {
  if (base64) {
    return uploadImageToDrive_(base64, "image/jpeg", prefix + "_" + Utilities.getUuid() + ".jpg", QUESTION_IMAGE_FOLDER);
  }
  return existingUrl || "";
}

function buildSubQuestions_(list, keepIds) {
  return (list || []).map((sq) => ({
    id: keepIds && sq.id ? sq.id : Utilities.getUuid(),
    text: sq.text || "",
    points: sq.points || 10,
    imageUrl: resolveQuestionImage_(sq.imageBase64, sq.imageUrl, "q"),
  }));
}

function addWrittenQuestion_(q) {
  const sheet = getSheet_("WrittenQuestions");
  const id = Utilities.getUuid();
  const subQuestions = buildSubQuestions_(q.subQuestions, false);
  appendRowByHeaders_(sheet, {
    id,
    passageHtml: q.passageHtml || "",
    passageImageUrl: resolveQuestionImage_(q.passageImageBase64, q.passageImageUrl, "passage"),
    questionsJson: JSON.stringify(subQuestions),
    kind: q.kind || "written",
    status: q.status === "published" ? "published" : "draft",
    forMock: q.forMock !== false,
    forLive: !!q.forLive,
    liveExamId: q.forLive && q.liveExamId ? String(q.liveExamId) : "",
    createdAt: new Date(),
  });
  return id;
}

function updateWrittenQuestion_(id, q) {
  const sheet = getSheet_("WrittenQuestions");
  const rowIdx = findRowIndexById_(sheet, id);
  if (rowIdx === -1) return false;
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = (name) => headerRow.indexOf(name) + 1;
  const subQuestions = buildSubQuestions_(q.subQuestions, true);
  sheet.getRange(rowIdx, col("passageHtml")).setValue(q.passageHtml || "");
  sheet.getRange(rowIdx, col("passageImageUrl")).setValue(resolveQuestionImage_(q.passageImageBase64, q.passageImageUrl, "passage"));
  sheet.getRange(rowIdx, col("questionsJson")).setValue(JSON.stringify(subQuestions));
  sheet.getRange(rowIdx, col("kind")).setValue(q.kind || "written");
  sheet.getRange(rowIdx, col("status")).setValue(q.status === "published" ? "published" : "draft");
  sheet.getRange(rowIdx, col("forMock")).setValue(q.forMock !== false);
  sheet.getRange(rowIdx, col("forLive")).setValue(!!q.forLive);
  sheet.getRange(rowIdx, col("liveExamId")).setValue(q.forLive && q.liveExamId ? String(q.liveExamId) : "");
  return true;
}

/** ফর্মের তথ্য ঠিক আছে কিনা যাচাই — লিখিতে উদ্দীপকের লেখা, উদ্দীপকের ছবি,
 *  অথবা অন্তত একটা প্রশ্নের লেখা/ছবি — এর যেকোনো একটা থাকতে হবে (শুধু ছবি দিয়েও
 *  চলবে)। null ফেরত মানে ঠিক আছে। */
function validateWrittenQuestion_(q) {
  const subs = q.subQuestions || [];
  if (subs.length === 0) return "অন্তত একটা প্রশ্ন যোগ করুন।";
  const hasText = (html) => String(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() !== "";
  const hasPassage = hasText(q.passageHtml) || q.passageImageBase64 || q.passageImageUrl;
  const hasAnySub = subs.some((sq) => hasText(sq.text) || sq.imageBase64 || sq.imageUrl);
  if (!hasPassage && !hasAnySub) return "উদ্দীপক বা প্রশ্নের লেখা অথবা ছবি দিন।";
  return null;
}

function parsedWrittenQuestions_() {
  return sheetToObjects_(getSheet_("WrittenQuestions")).map((q) => ({
    ...q,
    subQuestions: (() => {
      try {
        return JSON.parse(q.questionsJson || "[]");
      } catch (e) {
        return [];
      }
    })(),
  }));
}

/** কোনো স্টুডেন্ট এখন পর্যন্ত কোন কোন প্রশ্ন-সেট (প্যাসেজ) অ্যাটেম্পট করেছে তার আইডিগুলো। */
function getAttemptedIds_(registrationId) {
  const rows = sheetToObjects_(getSheet_("WrittenAttempts")).filter(
    (a) => String(a.registrationId) === String(registrationId)
  );
  return new Set(rows.map((a) => String(a.writtenQuestionId)));
}

/** আগে যা দেওয়া হয়নি সেগুলো থেকে আগে বাছাই করে; পুরো ব্যাংক শেষ হয়ে গেলে
 *  (unseen কম পড়লে) আগে দেওয়া প্রশ্ন থেকে বাকিটা পূরণ করে — অর্থাৎ পুরো
 *  ব্যাংক শেষ হলেই আবার শুরু থেকে চক্র চলে। */
function pickAvoidingRepeats_(items, needed, attemptedIds, idKey) {
  const unseen = items.filter((it) => !attemptedIds.has(String(it[idKey])));
  const seen = items.filter((it) => attemptedIds.has(String(it[idKey])));
  let picked = shuffleArray_(unseen).slice(0, needed);
  if (picked.length < needed) {
    picked = picked.concat(shuffleArray_(seen).slice(0, needed - picked.length));
  }
  return picked;
}

/** mock/live অনুযায়ী শুধু published প্রশ্ন থেকে (সেটিংসের সেট সংখ্যা অনুযায়ী) প্যাসেজ বাছাই করে।
 *  registrationId দেওয়া থাকলে স্টুডেন্টের আগে-না-দেওয়া প্রশ্নকে অগ্রাধিকার
 *  দেওয়া হয় — পুরো ব্যাংক শেষ করলেই আবার শুরু থেকে (রিপিট) চক্র চলে। */
function getWrittenSets_(examType, registrationId, liveExamId) {
  const all = parsedWrittenQuestions_().filter((q) => {
    if (q.status !== "published" || (q.kind || "written") !== "written") return false;
    if (examType === "live") {
      // forLive প্রশ্ন: নির্দিষ্ট লাইভ পরীক্ষায় বাঁধা থাকলে শুধু সেটাতেই আসে; বাঁধা না থাকলে সব লাইভ পরীক্ষায়
      return q.forLive && (!q.liveExamId || String(q.liveExamId) === String(liveExamId));
    }
    return q.forMock;
  });
  const attemptedIds = registrationId ? getAttemptedIds_(registrationId) : new Set();
  const picked = pickAvoidingRepeats_(all, getSetsPerExam_(), attemptedIds, "id");
  return picked.map((q) => ({
    id: q.id,
    passageHtml: q.passageHtml,
    passageImageUrl: q.passageImageUrl || "",
    subQuestions: (q.subQuestions || []).map((sq) => ({ ...sq, writtenQuestionId: q.id })),
  }));
}

/** ব্রাউজার থেকে পাঠানো base64 ছবি Google Drive-এ আপলোড করে এবং শেয়ারড লিংক ফেরত দেয়। */
const ANSWER_IMAGE_FOLDER = "Linguistic Written Answers";
const QUESTION_IMAGE_FOLDER = "Linguistic Question Images";

function uploadImageToDrive_(base64Data, mimeType, filename, folderNameArg) {
  const folderName = folderNameArg || ANSWER_IMAGE_FOLDER;
  const folders = DriveApp.getFoldersByName(folderName);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

  const bytes = Utilities.base64Decode(base64Data.replace(/^data:[^;]+;base64,/, ""));
  const blob = Utilities.newBlob(bytes, mimeType || "image/jpeg", filename);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return "https://lh3.googleusercontent.com/d/" + file.getId();
}

function saveWrittenAttempt_(data) {
  const sheet = getSheet_("WrittenAttempts");
  const id = Utilities.getUuid();
  appendRowByHeaders_(sheet, {
    id,
    registrationId: data.registrationId || "",
    phone: data.phone,
    email: data.email,
    examType: data.examType,
    kind: data.kind,
    sessionId: data.sessionId,
    writtenQuestionId: data.writtenQuestionId,
    subQuestionId: data.subQuestionId,
    subQuestionText: data.subQuestionText,
    subQuestionImageUrl: data.subQuestionImageUrl || "",
    liveExamId: data.liveExamId || "",
    points: data.points,
    imageUrl: data.imageUrl,
    status: "pending",
    score: "",
    annotatedImageUrl: "",
    adminComment: "",
    createdAt: new Date(),
    gradedAt: "",
  });
  return id;
}

function listWrittenAttemptsForStudent_(registrationId) {
  const rows = sheetToObjects_(getSheet_("WrittenAttempts")).filter(
    (a) => String(a.registrationId) === String(registrationId)
  );
  const liveTitle = {};
  listLiveExams_().forEach((e) => (liveTitle[e.id] = e.title));
  const sessions = {};
  rows.forEach((a) => {
    if (!sessions[a.sessionId]) {
      sessions[a.sessionId] = { sessionId: a.sessionId, examType: a.examType, kind: a.kind, createdAt: a.createdAt, liveExamTitle: liveTitle[String(a.liveExamId)] || "", items: [] };
    }
    sessions[a.sessionId].items.push(a);
  });
  return Object.values(sessions).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function listPendingWrittenAttempts_() {
  const pending = sheetToObjects_(getSheet_("WrittenAttempts")).filter((a) => a.status === "pending");
  const questions = parsedWrittenQuestions_();
  const byId = {};
  questions.forEach((q) => (byId[q.id] = q));
  return pending.map((a) => ({
    ...a,
    passageHtml: (byId[a.writtenQuestionId] || {}).passageHtml || "",
    passageImageUrl: (byId[a.writtenQuestionId] || {}).passageImageUrl || "",
  }));
}

function gradeWrittenAttempt_(id, score, annotatedImageUrl, adminComment) {
  const sheet = getSheet_("WrittenAttempts");
  const rowIdx = findRowIndexById_(sheet, id);
  if (rowIdx === -1) return false;
  const col = (name) => WRITTEN_ATTEMPT_HEADERS.indexOf(name) + 1;
  sheet.getRange(rowIdx, col("status")).setValue("graded");
  sheet.getRange(rowIdx, col("score")).setValue(score);
  sheet.getRange(rowIdx, col("annotatedImageUrl")).setValue(annotatedImageUrl || "");
  sheet.getRange(rowIdx, col("adminComment")).setValue(adminComment || "");
  sheet.getRange(rowIdx, col("gradedAt")).setValue(new Date());
  return true;
}

/** একটা পুরো গ্রুপ (একই ছবির সাথে যুক্ত সবগুলো প্রশ্ন — যেমন একটা উদ্দীপকের
 *  সবকটা প্রশ্ন) একসাথে মূল্যায়ন করে — প্রতিটার নম্বর
 *  আলাদা, কিন্তু দাগানো ছবি ও মন্তব্য সবগুলোর জন্য একই। */
function gradeWrittenAttemptsBatch_(items, annotatedImageUrl, adminComment) {
  let count = 0;
  items.forEach((item) => {
    if (gradeWrittenAttempt_(item.id, item.score, annotatedImageUrl, adminComment)) count++;
  });
  return count;
}

/* ---------------- র‍্যাঙ্কিং / মেরিট তালিকা ---------------- */

/** মেরিট তালিকা এখন লিখিত পরীক্ষার *মূল্যায়ন শেষ হওয়া* নম্বরের উপর ভিত্তি
 *  করে। একটা পরীক্ষা-সেশনের (sessionId) সবগুলো প্রশ্নের নম্বর দেওয়া হয়ে গেলে
 *  তবেই সেটা তালিকায় ঢোকে; প্রতিটা স্টুডেন্টের সর্বোচ্চ সেশন-স্কোর নেওয়া হয়
 *  (মক টেস্ট বহুবার দেওয়া যায় বলে)। */
function getLeaderboard_(examType, liveExamId) {
  const rows = sheetToObjects_(getSheet_("WrittenAttempts")).filter(
    (a) =>
      a.examType === examType &&
      a.kind === "written" &&
      (examType !== "live" || !liveExamId || String(a.liveExamId) === String(liveExamId))
  );
  const regs = sheetToObjects_(getSheet_("Registrations"));
  const regById = {};
  regs.forEach((r) => (regById[r.id] = r));

  const sessions = {};
  rows.forEach((a) => {
    const key = String(a.sessionId);
    if (!sessions[key]) {
      sessions[key] = { registrationId: String(a.registrationId), score: 0, total: 0, allGraded: true, createdAt: a.createdAt };
    }
    const sess = sessions[key];
    sess.total += Number(a.points) || 0;
    if (a.status === "graded") sess.score += Number(a.score) || 0;
    else sess.allGraded = false;
    if (new Date(a.createdAt) < new Date(sess.createdAt)) sess.createdAt = a.createdAt;
  });

  const bestByStudent = {};
  Object.values(sessions)
    .filter((sess) => sess.allGraded)
    .forEach((sess) => {
      const cur = bestByStudent[sess.registrationId];
      if (!cur || sess.score > cur.score) bestByStudent[sess.registrationId] = sess;
    });

  return Object.values(bestByStudent)
    .sort((a, b) => b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, 20)
    .map((sess) => {
      const r = regById[sess.registrationId] || {};
      return {
        name: r.name || "অজানা",
        className: r.className || "",
        school: r.school || "",
        division: r.division || "",
        score: sess.score,
        total: sess.total,
      };
    });
}

/* ---------------- অফলাইন পরীক্ষার প্রশ্নপত্র (PDF) ---------------- */

// ওয়েবসাইটের বাংলা ফন্টের কাছাকাছি এবং Google Docs-এ নির্ভরযোগ্যভাবে পাওয়া যায় এমন ফন্ট
const PDF_FONT = "Noto Sans Bengali";
const CM_TO_PT = 28.35; // ১ সেন্টিমিটার = ২৮.৩৫ পয়েন্ট (Google Docs স্পেসিং এককে)

/** Settings শিটে ছোট একটা JSON তালিকা হিসেবে "গত বার অফলাইনে কোন প্রশ্নগুলো
 *  ব্যবহার হয়েছিল" সংরক্ষণ করা হয় — যাতে পরের বার জেনারেট করলে যতটা সম্ভব
 *  ভিন্ন প্রশ্ন আসে (সম্পূর্ণ রিপিটেশন-মুক্ত না, কিন্তু ঝুঁকি অনেক কমে)। */
function getRecentlyUsedIds_(key) {
  const settings = getSettingsObj_();
  try {
    return new Set(JSON.parse(settings[key] || "[]"));
  } catch (e) {
    return new Set();
  }
}

function saveRecentlyUsedIds_(key, ids) {
  setSettingsObj_({ [key]: JSON.stringify(ids) });
}

/** সেটিংসে logoUrl দেওয়া থাকলে সেটা ফেচ করার চেষ্টা করে — ব্যর্থ হলে null
 *  ফেরত দেয়, পিডিএফ তখন লোগো ছাড়াই শুধু লেখা দিয়ে হেডার বানায়। */
function fetchLogoBlob_() {
  try {
    const settings = getSettingsObj_();
    if (!settings.logoUrl) return null;
    const res = UrlFetchApp.fetch(settings.logoUrl, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    return res.getBlob();
  } catch (e) {
    return null;
  }
}

/** পাতার একদম উপরে ছোট, কমপ্যাক্ট হেডার — লোগো (থাকলে) + "অগ্রদূত পরীক্ষা
 *  কেন্দ্র" + শিরোনাম + সাবটাইটেল, সবই ছোট ফন্টে যাতে অহেতুক জায়গা নষ্ট না হয়। */
function addPdfHeader_(body, title, subtitle) {
  const logo = fetchLogoBlob_();
  if (logo) {
    try {
      const imgPara = body.appendParagraph("");
      imgPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      const img = imgPara.appendInlineImage(logo);
      imgPara.setSpacingAfter(2);
      img.setWidth(34);
      img.setHeight(34);
    } catch (e) {
      // লোগো বসাতে সমস্যা হলেও বাকি ডকুমেন্ট চলতে থাকবে
    }
  }
  body
    .appendParagraph("অগ্রদূত পরীক্ষা কেন্দ্র")
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
    .setFontFamily(PDF_FONT)
    .setBold(true)
    .setFontSize(13)
    .setSpacingBefore(0)
    .setSpacingAfter(2);
  body
    .appendParagraph(title)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
    .setFontFamily(PDF_FONT)
    .setBold(true)
    .setFontSize(11)
    .setSpacingBefore(0)
    .setSpacingAfter(1);
  body
    .appendParagraph(subtitle)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
    .setFontFamily(PDF_FONT)
    .setFontSize(9)
    .setSpacingBefore(0)
    .setSpacingAfter(4);
}

/** সাধারণ HTML (আমাদের রিচ-টেক্সট এডিটর থেকে আসা) থেকে সাদামাটা প্লেইন টেক্সট
 *  বের করে, লাইন ব্রেক ঠিক রেখে — Google Docs-এ রঙ/বোল্ড ফরম্যাটিং হুবহু
 *  বসানো এই মুহূর্তে সাপোর্ট করা হয়নি, শুধু টেক্সট ও লাইন ব্রেক ঠিক থাকে। */
function htmlToPlainLines_(html) {
  if (!html) return [];
  let text = String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return text.split("\n").map((l) => l.trim()).filter((l, i, arr) => l !== "" || (i > 0 && arr[i - 1] !== ""));
}

/** পুরো ডকুমেন্টের সবকিছুতে (যা যা আলাদাভাবে ফন্ট সেট করা হয়নি) ওয়েবসাইটের
 *  মতো বাংলা ফন্ট বসিয়ে দেয় — শেষে একবার কল করলেই পুরো ডকুমেন্ট কভার হয়। */
function applyDocFont_(body) {
  try {
    body.editAsText().setFontFamily(PDF_FONT);
  } catch (e) {
    // ফন্ট সেট করা না গেলেও PDF তৈরি হতে থাকবে, ডিফল্ট ফন্টে
  }
}

function docToBase64Pdf_(doc) {
  applyDocFont_(doc.getBody());
  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  const pdfBlob = file.getAs(MimeType.PDF);
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  file.setTrashed(true); // অস্থায়ী Google Doc রাখার দরকার নেই, PDF হয়ে গেলে মুছে ফেলা হয়
  return base64;
}

/** Drive-এ থাকা ছবি (lh3.googleusercontent.com/d/<id> লিংক) Google Doc-এ বসায় —
 *  পাতার চওড়ার মধ্যে আটকে রাখতে অনুপাত ঠিক রেখে ছোট করা হয়। ব্যর্থ হলেও PDF
 *  তৈরি হতে থাকে (শুধু ছবিটা বাদ পড়ে)। */
function appendDriveImage_(body, url, maxWidth) {
  try {
    const m = String(url || "").match(/\/d\/([^/?&]+)/);
    if (!m) return;
    const blob = DriveApp.getFileById(m[1]).getBlob();
    const img = body.appendImage(blob);
    const w = img.getWidth();
    const h = img.getHeight();
    if (w > maxWidth) {
      img.setWidth(maxWidth);
      img.setHeight(Math.round((h * maxWidth) / w));
    }
  } catch (e) {
    // ছবি বসানো না গেলেও বাকি প্রশ্নপত্র ঠিকঠাক তৈরি হবে
  }
}

/** অফলাইন লিখিত প্রশ্নপত্র — ৩টা সেট, প্রতিটা আলাদা পাতায়। উদ্দীপক
 *  উপরে ছোট ফন্টে, প্রতিটা প্রশ্নের নিচে দাগ না দিয়ে ২ সেন্টিমিটার ফাঁকা
 *  জায়গা রাখা হয় ("উত্তরঃ" লিখে)। */
function buildOfflineWrittenPdf_() {
  const all = parsedWrittenQuestions_().filter((q) => q.status === "published" && q.forMock && q.kind === "written");
  const recentlyUsed = getRecentlyUsedIds_("offlineWrittenLastUsed");
  const picked = pickAvoidingRepeats_(all, getSetsPerExam_(), recentlyUsed, "id");

  const doc = DocumentApp.create("Offline Written - " + new Date().toISOString());
  const body = doc.getBody();
  body.setMarginTop(20).setMarginBottom(20).setMarginLeft(30).setMarginRight(30);

  picked.forEach((set, si) => {
    if (si > 0) body.appendPageBreak();
    addPdfHeader_(body, "লিখিত প্রশ্ন", "সময়: " + getWrittenMinutes_() + " মিনিট");

    htmlToPlainLines_(set.passageHtml).forEach((line) => {
      body.appendParagraph(line).setFontSize(9.5).setItalic(true).setSpacingBefore(0).setSpacingAfter(1);
    });
    if (set.passageImageUrl) appendDriveImage_(body, set.passageImageUrl, 500);
    body.appendParagraph(" ").setFontSize(4);

    (set.subQuestions || []).forEach((sq, qi) => {
      const lines = htmlToPlainLines_(sq.text);
      if (lines.length === 0) lines.push("প্রশ্ন নং " + (qi + 1));
      lines.forEach((line, li) => {
        body
          .appendParagraph((li === 0 ? `${qi + 1}. ` : "    ") + line + (li === 0 ? ` (${sq.points} নম্বর)` : ""))
          .setFontSize(10)
          .setSpacingBefore(4)
          .setSpacingAfter(0);
      });
      if (sq.imageUrl) appendDriveImage_(body, sq.imageUrl, 480);
      // দাগ না দিয়ে "উত্তরঃ" লিখে ২ সেন্টিমিটার ফাঁকা জায়গা রাখা হচ্ছে
      body.appendParagraph("উত্তরঃ").setFontSize(9.5).setSpacingBefore(2).setSpacingAfter(CM_TO_PT * 2);
    });
  });

  saveRecentlyUsedIds_("offlineWrittenLastUsed", picked.map((q) => q.id));
  return { base64: docToBase64Pdf_(doc), filename: "Agrodut-Onudhabonmulok-" + Date.now() + ".pdf" };
}

/* ---------------- HTTP entry points ---------------- */

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === "getSettings") {
      return jsonOut_({ ok: true, data: getSettingsObj_() });
    }
    return jsonOut_({ ok: false, message: "অজানা action" });
  } catch (err) {
    return jsonOut_({ ok: false, message: String(err) });
  }
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ ok: false, message: "ভুল রিকোয়েস্ট ফরম্যাট" });
  }

  const action = body.action;

  try {
    switch (action) {
      case "register": {
        if (!body.name || !body.phone || !body.email) {
          return jsonOut_({ ok: false, message: "প্রয়োজনীয় তথ্য অনুপস্থিত" });
        }
        if (findRegistrationByPhoneOrEmail_(body.phone, body.email)) {
          return jsonOut_({ ok: false, message: "এই মোবাইল নম্বর বা ইমেইল দিয়ে ইতিমধ্যে রেজিস্ট্রেশন করা আছে। একই তথ্য দিয়ে দ্বিতীয়বার রেজিস্ট্রেশন করা যাবে না।" });
        }
        const id = registerStudent_(body);
        return jsonOut_({ ok: true, data: { id } });
      }

      case "checkStatus": {
        const reg = findRegistrationByContact_(body.phone, body.email);
        if (!reg) return jsonOut_({ ok: false, message: "কোনো রেজিস্ট্রেশন পাওয়া যায়নি।" });
        return jsonOut_({
          ok: true,
          data: {
            name: reg.name,
            className: reg.className,
            school: reg.school,
            division: reg.division,
            status: reg.status,
            note: reg.note,
          },
        });
      }

      case "adminLogin": {
        const token = adminLogin_(body.username, body.password);
        if (!token) return jsonOut_({ ok: false, message: "ভুল ইউজারনেম বা পাসওয়ার্ড।" });
        return jsonOut_({ ok: true, data: { token } });
      }

      case "adminListRegistrations": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        return jsonOut_({ ok: true, data: sheetToObjects_(getSheet_("Registrations")) });
      }

      case "adminUpdateRegistrationStatus": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        const sheet = getSheet_("Registrations");
        const rowIdx = findRowIndexById_(sheet, body.id);
        if (rowIdx === -1) return jsonOut_({ ok: false, message: "রেজিস্ট্রেশন পাওয়া যায়নি" });
        sheet.getRange(rowIdx, REGISTRATION_HEADERS.indexOf("status") + 1).setValue(body.status);
        return jsonOut_({ ok: true });
      }

      case "adminUpdateSettings": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        setSettingsObj_(body);
        return jsonOut_({ ok: true });
      }

      /* ---------- স্টুডেন্ট লগইন ও পোর্টাল ---------- */

      case "studentLogin": {
        const result = studentLogin_(body.email, body.password);
        if (!result) return jsonOut_({ ok: false, message: "ভুল ইমেইল বা পাসওয়ার্ড।" });
        const headers = result.headers;
        const row = result.row;
        const get = (key) => row[headers.indexOf(key)];
        return jsonOut_({
          ok: true,
          data: {
            token: result.token,
            profile: {
              name: get("name"),
              className: get("className"),
              school: get("school"),
              division: get("division"),
              status: get("status"),
            },
          },
        });
      }

      case "studentMe": {
        const reg = findRegistrationByStudentToken_(body.token);
        if (!reg) return jsonOut_({ ok: false, message: "Unauthorized" });
        return jsonOut_({
          ok: true,
          data: {
            name: reg.name,
            className: reg.className,
            school: reg.school,
            division: reg.division,
            status: reg.status,
          },
        });
      }

      case "studentNotices": {
        const reg = findRegistrationByStudentToken_(body.token);
        if (!reg) return jsonOut_({ ok: false, message: "Unauthorized" });
        return jsonOut_({ ok: true, data: listActiveNotices_() });
      }

      /* ---------- অ্যাডমিন: নোটিশ ---------- */

      case "adminAddNotice": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        if (!body.message) return jsonOut_({ ok: false, message: "নোটিশের লেখা দিন।" });
        const id = addNotice_(body.message);
        return jsonOut_({ ok: true, data: { id } });
      }

      case "adminListNotices": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        return jsonOut_({ ok: true, data: sheetToObjects_(getSheet_("Notices")) });
      }

      case "adminDeleteNotice": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        const sheet = getSheet_("Notices");
        const rowIdx = findRowIndexById_(sheet, body.id);
        if (rowIdx === -1) return jsonOut_({ ok: false, message: "নোটিশ পাওয়া যায়নি" });
        sheet.deleteRow(rowIdx);
        return jsonOut_({ ok: true });
      }

      /* ---------- যোগাযোগ ফর্ম ---------- */

      case "submitContact": {
        if (!body.email || !body.message) return jsonOut_({ ok: false, message: "ইমেইল ও মেসেজ দিন।" });
        const id = addContact_(body);
        return jsonOut_({ ok: true, data: { id } });
      }

      case "adminListContacts": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        const rows = sheetToObjects_(getSheet_("Contacts")).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return jsonOut_({ ok: true, data: rows });
      }

      case "adminMarkContactDone": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        const sheet = getSheet_("Contacts");
        const rowIdx = findRowIndexById_(sheet, body.id);
        if (rowIdx === -1) return jsonOut_({ ok: false, message: "পাওয়া যায়নি" });
        sheet.getRange(rowIdx, CONTACT_HEADERS.indexOf("status") + 1).setValue(body.status || "done");
        return jsonOut_({ ok: true });
      }

      /* ---------- লাইভ পরীক্ষার সময় ---------- */

      case "liveExamStatus": {
        let regId = "";
        if (body.token) {
          const reg = findRegistrationByStudentToken_(body.token);
          if (reg) regId = reg.id;
        }
        return jsonOut_({ ok: true, data: { exams: liveExamsWithStatus_(regId) } });
      }

      /* ---------- স্টুডেন্ট: লিখিত পরীক্ষা ---------- */

      case "startWrittenExam": {
        const reg = findRegistrationByStudentToken_(body.token);
        if (!reg) return jsonOut_({ ok: false, message: "Unauthorized — আবার লগইন করুন।" });
        if (reg.status !== "confirmed") return jsonOut_({ ok: false, message: "আপনার রেজিস্ট্রেশন এখনও কনফার্ম হয়নি।" });
        const examType = body.examType === "live" ? "live" : "mock";
        let minutes = getWrittenMinutes_();
        let liveExamId = "";
        if (examType === "live") {
          const live = findLiveExam_(body.liveExamId);
          if (!live) return jsonOut_({ ok: false, message: "এই লাইভ পরীক্ষাটি পাওয়া যায়নি।" });
          const now = new Date();
          if (now < new Date(live.start)) return jsonOut_({ ok: false, message: "\"" + live.title + "\" এখনো শুরু হয়নি।" });
          if (now > new Date(live.end)) return jsonOut_({ ok: false, message: "\"" + live.title + "\"-এর সময় শেষ হয়ে গেছে।" });
          if (participatedLiveExamIds_(reg.id).has(live.id)) {
            return jsonOut_({ ok: false, message: "আপনি ইতিমধ্যে \"" + live.title + "\"-এ অংশ নিয়েছেন। একটা লাইভ পরীক্ষায় একবারই অংশ নেওয়া যায়।" });
          }
          minutes = live.minutes;
          liveExamId = live.id;
        }
        const sets = getWrittenSets_(examType, reg.id, liveExamId);
        if (sets.length === 0 || sets.every((s) => (s.subQuestions || []).length === 0)) {
          return jsonOut_({ ok: false, message: "এখনো কোনো প্রশ্ন প্রকাশ করা হয়নি। পরে আবার চেষ্টা করুন।" });
        }
        return jsonOut_({ ok: true, data: { sessionId: Utilities.getUuid(), sets, minutes, liveExamId } });
      }

      case "submitWrittenAnswer": {
        const reg = findRegistrationByStudentToken_(body.token);
        if (!reg) return jsonOut_({ ok: false, message: "Unauthorized — আবার লগইন করুন।" });
        if (!body.imageBase64) return jsonOut_({ ok: false, message: "ছবি পাওয়া যায়নি।" });
        if (body.examType === "live") {
          if (!body.liveExamId) return jsonOut_({ ok: false, message: "লাইভ পরীক্ষার তথ্য পাওয়া যায়নি।" });
          const priorSession = sheetToObjects_(getSheet_("WrittenAttempts")).find(
            (a) =>
              String(a.registrationId) === String(reg.id) &&
              a.examType === "live" &&
              String(a.liveExamId) === String(body.liveExamId) &&
              String(a.sessionId) !== String(body.sessionId)
          );
          if (priorSession) return jsonOut_({ ok: false, message: "আপনি এই লাইভ পরীক্ষায় ইতিমধ্যে অংশ নিয়েছেন।" });
        }
        const imageUrl = uploadImageToDrive_(body.imageBase64, body.mimeType, "answer_" + Utilities.getUuid() + ".jpg");
        const id = saveWrittenAttempt_({
          registrationId: reg.id,
          phone: reg.phone,
          email: reg.email,
          examType: body.examType || "mock",
          kind: "written",
          sessionId: body.sessionId,
          writtenQuestionId: body.writtenQuestionId,
          subQuestionId: body.subQuestionId,
          subQuestionText: body.subQuestionText,
          subQuestionImageUrl: body.subQuestionImageUrl,
          liveExamId: body.liveExamId,
          points: body.points,
          imageUrl,
        });
        return jsonOut_({ ok: true, data: { id, imageUrl } });
      }

      /** একটা উদ্দীপকের সবগুলো প্রশ্নের উত্তর একটামাত্র ছবিতে — ছবি একবারই Drive-এ আপলোড হয়,
       *  তারপর প্রতিটা প্রশ্নের জন্য আলাদা WrittenAttempts সারি তৈরি হয় (সবগুলো একই ছবির লিংক
       *  শেয়ার করে), যাতে প্রতিটা প্রশ্ন আলাদাভাবে মূল্যায়ন করা যায়। */
      case "submitWrittenAnswersBatch": {
        const reg = findRegistrationByStudentToken_(body.token);
        if (!reg) return jsonOut_({ ok: false, message: "Unauthorized — আবার লগইন করুন।" });
        if (!body.imageBase64) return jsonOut_({ ok: false, message: "ছবি পাওয়া যায়নি।" });
        if (!body.items || body.items.length === 0) return jsonOut_({ ok: false, message: "কোনো প্রশ্ন পাওয়া যায়নি।" });
        if (body.examType === "live") {
          if (!body.liveExamId) return jsonOut_({ ok: false, message: "লাইভ পরীক্ষার তথ্য পাওয়া যায়নি।" });
          const priorSession = sheetToObjects_(getSheet_("WrittenAttempts")).find(
            (a) =>
              String(a.registrationId) === String(reg.id) &&
              a.examType === "live" &&
              String(a.liveExamId) === String(body.liveExamId) &&
              String(a.sessionId) !== String(body.sessionId)
          );
          if (priorSession) return jsonOut_({ ok: false, message: "আপনি এই লাইভ পরীক্ষায় ইতিমধ্যে অংশ নিয়েছেন।" });
        }
        const imageUrl = uploadImageToDrive_(body.imageBase64, body.mimeType, "answer_" + Utilities.getUuid() + ".jpg");
        const ids = body.items.map((item) =>
          saveWrittenAttempt_({
            registrationId: reg.id,
            phone: reg.phone,
            email: reg.email,
            examType: body.examType || "mock",
            kind: "written",
            sessionId: body.sessionId,
            writtenQuestionId: item.writtenQuestionId,
            subQuestionId: item.subQuestionId,
            subQuestionText: item.subQuestionText,
            subQuestionImageUrl: item.subQuestionImageUrl,
            liveExamId: body.liveExamId,
            points: item.points,
            imageUrl,
          })
        );
        return jsonOut_({ ok: true, data: { ids, imageUrl } });
      }

      case "studentWrittenAttempts": {
        const reg = findRegistrationByStudentToken_(body.token);
        if (!reg) return jsonOut_({ ok: false, message: "Unauthorized" });
        return jsonOut_({ ok: true, data: listWrittenAttemptsForStudent_(reg.id) });
      }

      case "leaderboard": {
        const examType = body.examType === "live" ? "live" : "mock";
        return jsonOut_({ ok: true, data: getLeaderboard_(examType, body.liveExamId) });
      }

      /* ---------- অ্যাডমিন: লিখিত প্রশ্ন ব্যাংক ---------- */

      case "adminAddWrittenQuestion": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        const invalid = validateWrittenQuestion_(body);
        if (invalid) return jsonOut_({ ok: false, message: invalid });
        const id = addWrittenQuestion_(body);
        return jsonOut_({ ok: true, data: { id } });
      }

      case "adminUpdateWrittenQuestion": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        if (!body.id) return jsonOut_({ ok: false, message: "আইডি পাওয়া যায়নি" });
        const invalidEdit = validateWrittenQuestion_(body);
        if (invalidEdit) return jsonOut_({ ok: false, message: invalidEdit });
        const okUpdated = updateWrittenQuestion_(body.id, body);
        if (!okUpdated) return jsonOut_({ ok: false, message: "প্রশ্ন পাওয়া যায়নি" });
        return jsonOut_({ ok: true });
      }

      case "adminListWrittenQuestions": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        return jsonOut_({ ok: true, data: parsedWrittenQuestions_() });
      }

      case "adminDeleteWrittenQuestion": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        const sheet = getSheet_("WrittenQuestions");
        const rowIdx = findRowIndexById_(sheet, body.id);
        if (rowIdx === -1) return jsonOut_({ ok: false, message: "প্রশ্ন পাওয়া যায়নি" });
        sheet.deleteRow(rowIdx);
        return jsonOut_({ ok: true });
      }

      /* ---------- অ্যাডমিন: খাতা মূল্যায়ন ---------- */

      case "adminListPendingWritten": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        return jsonOut_({ ok: true, data: listPendingWrittenAttempts_() });
      }

      case "adminGradeWritten": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        let annotatedImageUrl = "";
        if (body.annotatedImageBase64) {
          annotatedImageUrl = uploadImageToDrive_(body.annotatedImageBase64, "image/jpeg", "graded_" + Utilities.getUuid() + ".jpg");
        }
        const okGraded = gradeWrittenAttempt_(body.id, body.score, annotatedImageUrl, body.adminComment);
        if (!okGraded) return jsonOut_({ ok: false, message: "পাওয়া যায়নি" });
        return jsonOut_({ ok: true });
      }

      case "adminGradeWrittenBatch": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        if (!body.items || body.items.length === 0) return jsonOut_({ ok: false, message: "কোনো আইটেম পাওয়া যায়নি" });
        let annotatedImageUrl = "";
        if (body.annotatedImageBase64) {
          annotatedImageUrl = uploadImageToDrive_(body.annotatedImageBase64, "image/jpeg", "graded_" + Utilities.getUuid() + ".jpg");
        }
        const count = gradeWrittenAttemptsBatch_(body.items, annotatedImageUrl, body.adminComment);
        return jsonOut_({ ok: true, data: { count } });
      }

      /* ---------- অ্যাডমিন: লাইভ পরীক্ষা তৈরি/এডিট/মোছা ---------- */

      case "adminListLiveExams": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        return jsonOut_({ ok: true, data: listLiveExams_() });
      }

      case "adminSaveLiveExam": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        const start = toIso_(body.start);
        const end = toIso_(body.end);
        if (!start || !end) return jsonOut_({ ok: false, message: "শুরু ও শেষের তারিখ-সময় দিন।" });
        if (new Date(end) <= new Date(start)) return jsonOut_({ ok: false, message: "শেষের সময় শুরুর সময়ের পরে হতে হবে।" });
        const minutes = Math.round(Number(body.minutes));
        if (!(minutes > 0)) return jsonOut_({ ok: false, message: "পরীক্ষার সময়কাল (মিনিট) দিন।" });
        const title = String(body.title || "").trim() || "লাইভ পরীক্ষা";
        const sheet = getSheet_("LiveExams");
        if (body.id) {
          const rowIdx = findRowIndexById_(sheet, body.id);
          if (rowIdx === -1) return jsonOut_({ ok: false, message: "লাইভ পরীক্ষা পাওয়া যায়নি" });
          const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
          const col = (n) => headerRow.indexOf(n) + 1;
          sheet.getRange(rowIdx, col("title")).setValue(title);
          sheet.getRange(rowIdx, col("start")).setValue(start);
          sheet.getRange(rowIdx, col("end")).setValue(end);
          sheet.getRange(rowIdx, col("minutes")).setValue(minutes);
          return jsonOut_({ ok: true, data: { id: body.id } });
        }
        const id = Utilities.getUuid();
        appendRowByHeaders_(sheet, { id, title, start, end, minutes, createdAt: new Date() });
        return jsonOut_({ ok: true, data: { id } });
      }

      case "adminDeleteLiveExam": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        const sheet = getSheet_("LiveExams");
        const rowIdx = findRowIndexById_(sheet, body.id);
        if (rowIdx === -1) return jsonOut_({ ok: false, message: "লাইভ পরীক্ষা পাওয়া যায়নি" });
        sheet.deleteRow(rowIdx);
        return jsonOut_({ ok: true });
      }

      /* ---------- অ্যাডমিন: লাইভ ফলাফল ---------- */

      case "adminLiveResults": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        return jsonOut_({ ok: true, data: getLeaderboard_("live", body.liveExamId) });
      }

      /* ---------- অ্যাডমিন: অফলাইন প্রশ্নপত্র (PDF) ---------- */

      case "adminGenerateOfflineWritten": {
        if (!checkAdminToken_(body.token)) return jsonOut_({ ok: false, message: "Unauthorized" });
        try {
          return jsonOut_({ ok: true, data: buildOfflineWrittenPdf_() });
        } catch (err) {
          return jsonOut_({ ok: false, message: "PDF তৈরি করা যায়নি: " + String(err) });
        }
      }

      default:
        return jsonOut_({ ok: false, message: "অজানা action" });
    }
  } catch (err) {
    return jsonOut_({ ok: false, message: String(err) });
  }
}