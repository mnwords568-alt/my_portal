const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

// --- Gmail 郵件設定 ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'mnwords568@gmail.com', // 填入你的 Gmail
    pass: '1357 2468 1357 2468'  // 填入 16 位應用程式密碼
  }
});

// --- 路由設定 ---

// 1. 首頁 (登入)
app.get('/', (req, res) => {
  res.send(`
    <style>body{font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; background:#eee;}</style>
    <div style="background:white; padding:2rem; border-radius:8px; shadow:0 2px 10px rgba(0,0,0,0.1)">
      <h2>登入入口</h2>
      <form action="/login" method="POST">
        <input type="email" name="email" placeholder="Email" required><br><br>
        <input type="password" name="password" placeholder="密碼" required><br><br>
        <button type="submit">登入</button>
      </form>
      <a href="/register-page">註冊帳號</a> | <a href="/forgot-page">忘記密碼</a>
    </div>
  `);
});

// 2. 註冊頁面
app.get('/register-page', (req, res) => {
  res.send(`
    <div style="text-align:center; margin-top:50px;">
      <h2>註冊新帳號</h2>
      <form action="/send-verify" method="POST">
        <input type="email" name="email" placeholder="輸入 Gmail" required>
        <button type="submit">寄送驗證碼</button>
      </form>
    </div>
  `);
});

// 3. 寄送驗證碼邏輯
app.post('/send-verify', (req, res) => {
  const { email } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000);
  
  const mailOptions = {
    from: '你的Email@gmail.com',
    to: email,
    subject: '您的入口網站驗證碼',
    text: `您的驗證碼是：${code}`
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) return res.send("寄送失敗：" + err);
    res.send(`驗證碼已寄至 ${email}！<br>您的代碼是 ${code} (測試用)`);
  });
});

// 4. 忘記密碼頁面
app.get('/forgot-page', (req, res) => {
  res.send('<h2>忘記密碼</h2><p>請輸入 Email 以重設</p><form action="/send-verify" method="POST"><input type="email" name="email"><button>提交</button></form>');
});

app.listen(3000, () => console.log('網站跑起來了：http://localhost:3000'));