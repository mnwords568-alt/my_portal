const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

// --- Gmail 郵件設定 (Render 環境變數) ---
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS
    }
});

// 共同的 CSS 樣式 (讓代碼乾淨一點)
const style = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; margin: 0; }
        .card { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border-radius: 20px; padding: 40px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); width: 100%; max-width: 400px; border: none; }
        .btn-primary { background: #764ba2; border: none; padding: 12px; border-radius: 10px; font-weight: bold; }
        .btn-primary:hover { background: #667eea; }
        .form-control { border-radius: 10px; padding: 12px; }
        .logo { font-size: 24px; font-weight: bold; color: #764ba2; margin-bottom: 25px; text-align: center; }
        a { color: #764ba2; text-decoration: none; font-size: 0.9rem; }
    </style>
`;

// 1. 首頁 (登入頁面)
app.get('/', (req, res) => {
    res.send(`
        ${style}
        <div class="card">
            <div class="logo">🚀 歡迎回來</div>
            <form action="/login" method="POST">
                <div class="mb-3"><input type="email" name="email" class="form-control" placeholder="Email" required></div>
                <div class="mb-4"><input type="password" name="password" class="form-control" placeholder="密碼" required></div>
                <button type="submit" class="btn btn-primary w-100 mb-3">立即登入</button>
            </form>
            <div class="text-center">
                <a href="/register-page">註冊帳號</a> | <a href="/forgot-page">忘記密碼</a>
            </div>
        </div>
    `);
});

// 2. 註冊頁面
app.get('/register-page', (req, res) => {
    res.send(`
        ${style}
        <div class="card">
            <div class="logo">✨ 建立帳號</div>
            <form action="/send-verify" method="POST">
                <div class="mb-4"><input type="email" name="email" class="form-control" placeholder="輸入你的 Gmail" required></div>
                <button type="submit" class="btn btn-primary w-100 mb-3">寄送驗證碼</button>
            </form>
            <div class="text-center"><a href="/">返回登入</a></div>
        </div>
    `);
});

// 3. 忘記密碼頁面
app.get('/forgot-page', (req, res) => {
    res.send(`
        ${style}
        <div class="card">
            <div class="logo">🔑 重設密碼</div>
            <p class="text-muted text-center mb-4">請輸入 Email，我們將寄送代碼給您</p>
            <form action="/send-verify" method="POST">
                <div class="mb-4"><input type="email" name="email" class="form-control" placeholder="Email" required></div>
                <button type="submit" class="btn btn-primary w-100 mb-3">提交</button>
            </form>
            <div class="text-center"><a href="/">返回登入</a></div>
        </div>
    `);
});

// 4. 寄送驗證碼邏輯
app.post('/send-verify', (req, res) => {
    const { email } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000);
    
    const mailOptions = {
        from: GMAIL_USER, // 自動使用你的 Email
        to: email,
        subject: '您的網站驗證碼',
        text: `您好！您的驗證碼是：${code}。請回到網頁完成驗證。`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) return res.send(`發送失敗，請檢查 Render 環境變數設定。錯誤：${err}`);
        res.send(`
            ${style}
            <div class="card text-center">
                <div class="logo">✅ 郵件已寄出</div>
                <p>驗證碼已寄至：<b>${email}</b></p>
                <p>您的測試代碼是：<span class="badge bg-secondary">${code}</span></p>
                <hr>
                <a href="/" class="btn btn-outline-primary btn-sm">回首頁</a>
            </div>
        `);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`網站運作中：http://localhost:${PORT}`));