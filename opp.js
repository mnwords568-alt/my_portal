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
    </style>
`;

// 1. 首頁
app.get('/', (req, res) => {
    res.send(`${style}<div class="card"><div class="logo">🚀 登入</div><form action="/login" method="POST"><div class="mb-3"><input type="email" name="email" class="form-control" placeholder="Email" required></div><div class="mb-4"><input type="password" name="password" class="form-control" placeholder="密碼" required></div><button type="submit" class="btn btn-primary w-100 mb-3">登入</button></form><div class="text-center"><a href="/register-page">註冊帳號</a> | <a href="/forgot-page">忘記密碼</a></div></div>`);
});

// 2. 註冊頁面
app.get('/register-page', (req, res) => {
    res.send(`${style}<div class="card"><div class="logo">✨ 註冊帳號</div><form action="/send-verify" method="POST"><input type="hidden" name="type" value="註冊"><div class="mb-4"><input type="email" name="email" class="form-control" placeholder="輸入 Gmail" required></div><button type="submit" class="btn btn-primary w-100">寄送註冊驗證碼</button></form></div>`);
});

// 3. 忘記密碼頁面
app.get('/forgot-page', (req, res) => {
    res.send(`${style}<div class="card"><div class="logo">🔑 重設密碼</div><form action="/send-verify" method="POST"><input type="hidden" name="type" value="重設密碼"><div class="mb-4"><input type="email" name="email" class="form-control" placeholder="輸入你的 Email" required></div><button type="submit" class="btn btn-primary w-100">發送重設代碼</button></form></div>`);
});

// 4. 寄送驗證碼邏輯
app.post('/send-verify', (req, res) => {
    const { email, type } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000);
    
    // 把代碼存起來，等一下比對
    tempCodes[email] = code;

    const mailOptions = {
        from: GMAIL_USER,
        to: email,
        subject: `【驗證碼】您的${type}要求`,
        text: `您好，您正在進行${type}。您的驗證碼是：${code}。請在網頁輸入此代碼。`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) return res.send("發送失敗: " + err);
        // 跳轉到「輸入驗證碼」的頁面
        res.send(`${style}<div class="card"><div class="logo">📩 已寄送</div><p class="text-center">請輸入寄至 <b>${email}</b> 的 6 位數代碼</p><form action="/check-verify" method="POST"><input type="hidden" name="email" value="${email}"><div class="mb-4"><input type="text" name="userCode" class="form-control text-center" style="font-size:2rem; letter-spacing:10px;" maxlength="6" required></div><button type="submit" class="btn btn-primary w-100">驗證代碼</button></form></div>`);
    });
});

// 5. 檢查驗證碼是否正確
app.post('/check-verify', (req, res) => {
    const { email, userCode } = req.body;
    
    if (tempCodes[email] && tempCodes[email].toString() === userCode) {
        delete tempCodes[email]; // 驗證成功就刪掉，避免重複使用
        res.send(`${style}<div class="card text-center"><div class="logo" style="color:green;">✔️ 驗證成功</div><p>身分確認完成！現在您可以繼續下一步。</p><a href="/" class="btn btn-primary">返回首頁</a></div>`);
    } else {
        res.send(`${style}<div class="card text-center"><div class="logo" style="color:red;">❌ 驗證失敗</div><p>代碼錯誤或已過期。</p><a href="javascript:history.back()" class="btn btn-outline-secondary">重新輸入</a></div>`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`網站已啟動：${PORT}`));