const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

// 暫時儲存驗證碼 (實際開發建議用資料庫)
let tempCodes = {}; 

// --- Gmail 郵件設定 ---
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

const style = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; margin: 0; }
        .card { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border-radius: 20px; padding: 40px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); width: 100%; max-width: 400px; border: none; }
        .btn-primary { background: #764ba2; border: none; padding: 12px; border-radius: 10px; font-weight: bold; }
        .form-control { border-radius: 10px; padding: 12px; }
        .logo { font-size: 24px; font-weight: bold; color: #764ba2; margin-bottom: 25px; text-align: center; }
        .back-link { color: #764ba2; text-decoration: none; font-size: 0.9rem; cursor: pointer; background: none; border: none; }
        .back-link:hover { text-decoration: underline; }
    </style>
`;

// 1. 首頁
app.get('/', (req, res) => {
    res.send(`${style}<div class="card"><div class="logo">🚀 登入</div><form action="/login" method="POST"><div class="mb-3"><input type="email" name="email" class="form-control" placeholder="Email" required></div><div class="mb-4"><input type="password" name="password" class="form-control" placeholder="密碼" required></div><button type="submit" class="btn btn-primary w-100 mb-3">登入</button></form><div class="text-center"><a href="/register-page" class="mx-2">註冊帳號</a> | <a href="/forgot-page" class="mx-2">忘記密碼</a></div></div>`);
});

// 2. 註冊頁面
app.get('/register-page', (req, res) => {
    res.send(`${style}<div class="card"><div class="logo">✨ 註冊帳號</div><form action="/send-verify" method="POST"><input type="hidden" name="type" value="註冊"><div class="mb-4"><input type="email" name="email" class="form-control" placeholder="輸入 Gmail" required></div><button type="submit" class="btn btn-primary w-100 mb-3">寄送註冊驗證碼</button></form><div class="text-center"><button onclick="history.back()" class="back-link">← 回到上一頁</button></div></div>`);
});

// 3. 忘記密碼頁面
app.get('/forgot-page', (req, res) =>