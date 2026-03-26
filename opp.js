const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

let tempCodes = {}; // 暫存資料

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

// --- 科技黑金風格 ---
const style = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #000; height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; margin: 0; color: #fff; }
        .card { 
            background: rgba(20, 20, 20, 0.9); 
            border: 1px solid #00c6ff; 
            border-radius: 20px; 
            padding: 40px; 
            box-shadow: 0 0 20px rgba(0, 198, 255, 0.3); 
            width: 100%; max-width: 480px; 
        }
        .btn-primary { background: linear-gradient(90deg, #00c6ff, #0072ff); border: none; padding: 12px; border-radius: 10px; font-weight: bold; }
        .form-control, .form-select { background: #111; border: 1px solid #333; color: #fff; border-radius: 10px; padding: 12px; }
        .form-control:focus { background: #111; border-color: #00c6ff; color: #fff; box-shadow: none; }
        .logo { font-size: 24px; font-weight: bold; color: #00c6ff; margin-bottom: 25px; text-align: center; letter-spacing: 2px; }
        .label-sm { font-size: 0.8rem; color: #888; margin-bottom: 5px; margin-left: 5px; }
        .back-link { color: #555; text-decoration: none; font-size: 0.9rem; background: none; border: none; cursor: pointer; }
        .back-link:hover { color: #00c6ff; }
    </style>
`;

// 1. 登入頁
app.get('/', (req, res) => {
    res.send(`${style}<div class="card"><div class="logo">TERMINAL LOGIN</div><form action="/login" method="POST"><div class="mb-3"><input type="email" name="email" class="form-control" placeholder="ID (Email)" required></div><div class="mb-4"><input type="password" name="password" class="form-control" placeholder="PASSWORD" required></div><button type="submit" class="btn btn-primary w-100 mb-3">ACCESS SYSTEM</button></form><div class="text-center"><a href="/register-page" class="back-link mx-2">CREATE IDENTITY</a></div></div>`);
});

// 2. 註冊頁面 (新增密碼欄位)
app.get('/register-page', (req, res) => {
    res.send(`
        ${style}
        <div class="card">
            <div class="logo">NEW IDENTITY</div>
            <form action="/send-verify" method="POST">
                <input type="hidden" name="type" value="註冊">
                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <div class="label-sm">姓名</div>
                        <input type="text" name="username" class="form-control" placeholder="Name" required>
                    </div>
                    <div class="col-6">
                        <div class="label-sm">生日</div>
                        <input type="date" name="birthday" class="form-control" required>
                    </div>
                </div>
                <div class="mb-3">
                    <div class="label-sm">自訂密碼</div>
                    <input type="password" name="password" class="form-control" placeholder="設定登入密碼" required>
                </div>
                <div class="mb-4">
                    <div class="label-sm">電子信箱</div>
                    <input type="email" name="email" class="form-control" placeholder="Email" required>
                </div>
                <button type="submit" class="btn btn-primary w-100 mb-3">SEND OTP CODE</button>
            </form>
            <div class="text-center"><button onclick="history.back()" class="back-link">← RETURN</button></div>
        </div>
    `);
});

// 3. 寄送驗證碼 (暫存密碼)
app.post('/send-verify', (req, res) => {
    const { email, type, username, birthday, password } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000);
    
    // 將使用者設定的密碼也存進去
    tempCodes[email] = { 
        code: code, 
        userData: { username, birthday, password } 
    };

    const mailOptions = {
        from: GMAIL_USER,
        to: email,
        subject: `[SECURE] Verification Code: ${code}`,
        text: `您好 ${username}，您的驗證碼是：${code}。驗證成功後，您設定的密碼即可生效。`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) return res.send(`發送失敗: ${err.message}`);
        res.send(`${style}<div class="card"><div class="logo">VERIFYING...</div><p class="text-center text-muted small">CODE SENT TO ${email}</p><form action="/check-verify" method="POST"><input type="hidden" name="email" value="${email}"><div class="mb-4"><input type="text" name="userCode" class="form-control text-center" style="font-size:2rem; letter-spacing:10px; color:#00c6ff;" maxlength="6" required></div><button type="submit" class="btn btn-primary w-100 mb-3">CONFIRM</button></form></div>`);
    });
});

// 4. 驗證成功 (顯示設定好的帳密)
app.post('/check-verify', (req, res) => {
    const { email, userCode } = req.body;
    const record = tempCodes[email];
    if (record && record.code.toString() === userCode) {
        const user = record.userData;
        delete tempCodes[email];
        res.send(`${style}<div class="card text-center"><div class="logo" style="color:#00ff88;">SUCCESS</div><p>身分已確認</p><p class="text-muted small">帳號：${email}<br>密碼：${user.password}</p><hr><a href="/" class="btn btn-primary w-100">GO TO LOGIN</a></div>`);
    } else {
        res.send(`${style}<div class="card text-center"><div class="logo" style="color:#ff4b2b;">FAILED</div><p>代碼錯誤</p><button onclick="history.back()" class="btn btn-outline-info w-100">RETRY</button></div>`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Online: ${PORT}`));