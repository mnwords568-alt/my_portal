const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

// 暫時儲存驗證資料
let tempCodes = {}; 

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

// --- 統一科技感風格 (深色背景 + 藍色霓虹) ---
const style = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { 
            background: radial-gradient(circle at center, #0a0a12 0%, #000000 100%); 
            height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-family: 'Orbitron', sans-serif; 
            margin: 0;
            color: #00d4ff;
        }
        .card { 
            background: rgba(10, 10, 15, 0.9); 
            backdrop-filter: blur(20px); 
            border-radius: 20px; 
            padding: 40px; 
            box-shadow: 0 0 30px rgba(0, 212, 255, 0.2); 
            width: 100%; 
            max-width: 480px; 
            border: 1px solid rgba(0, 212, 255, 0.3); 
        }
        .btn-primary { 
            background: linear-gradient(90deg, #00d4ff 0%, #0072ff 100%); 
            border: none; 
            padding: 12px; 
            border-radius: 10px; 
            font-weight: bold; 
            color: #000;
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.4);
        }
        .btn-primary:hover { 
            transform: translateY(-2px);
            box-shadow: 0 0 25px rgba(0, 212, 255, 0.6);
            color: #fff;
        }
        .form-control, .form-select { 
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(0, 212, 255, 0.2);
            color: #fff;
            border-radius: 10px; 
            padding: 12px; 
        }
        .form-control:focus, .form-select:focus {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            border-color: #00d4ff;
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        }
        .logo { 
            font-size: 28px; 
            font-weight: bold; 
            text-align: center; 
            text-transform: uppercase;
            letter-spacing: 4px;
            margin-bottom: 30px;
            text-shadow: 0 0 10px #00d4ff;
        }
        .label-sm { font-size: 0.8rem; color: #888; margin-bottom: 5px; margin-left: 5px; }
        .back-link { color: #555; text-decoration: none; font-size: 0.9rem; transition: 0.3s; background: none; border: none; }
        .back-link:hover { color: #00d4ff; text-shadow: 0 0 5px #00d4ff; }
        ::placeholder { color: #444 !important; }
    </style>
`;

// 1. 首頁 (登入)
app.get('/', (req, res) => {
    res.send(`${style}<div class="card"><div class="logo">System Access</div><form action="/login" method="POST"><div class="mb-3"><input type="email" name="email" class="form-control" placeholder="User ID" required></div><div class="mb-4"><input type="password" name="password" class="form-control" placeholder="Password" required></div><button type="submit" class="btn btn-primary w-100 mb-3">Initialize Login</button></form><div class="text-center"><a href="/register-page" class="back-link mx-2">New Identity</a> | <a href="/forgot-page" class="back-link mx-2">Recover Access</a></div></div>`);
});

// 2. 註冊頁面 (含自訂密碼)
app.get('/register-page', (req, res) => {
    res.send(`
        ${style}
        <div class="card">
            <div class="logo">Register Identity</div>
            <form action="/send-verify" method="POST">
                <input type="hidden" name="type" value="註冊">
                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <div class="label-sm">姓名</div>
                        <input type="text" name="username" class="form-control" placeholder="Name" required>
                    </div>
                    <div class="col-6">
                        <div class="label-sm">生日</div>
                        <input type="date" name="birthday" class="form-control" required style="color-scheme: dark;">
                    </div>
                </div>
                <div class="mb-3">
                    <div class="label-sm">設定登入密碼</div>
                    <input type="password" name="password" class="form-control" placeholder="Password" required>
                </div>
                <div class="mb-4">
                    <div class="label-sm">電子信箱</div>
                    <input type="email" name="email" class="form-control" placeholder="Email" required>
                </div>
                <button type="submit" class="btn btn-primary w-100 mb-3">Generate Auth Code</button>
            </form>
            <div class="text-center"><button onclick="history.back()" class="back-link">← Abort Mission</button></div>
        </div>
    `);
});

// 3. 忘記密碼頁面
app.get('/forgot-page', (req, res) => {
    res.send(`${style}<div class="card"><div class="logo">Access Recovery</div><p class="text-center text-muted mb-4 small">Enter ID to receive security code</p><form action="/send-verify" method="POST"><input type="hidden" name="type" value="重設密碼"><div class="mb-4"><input type="email" name="email" class="form-control" placeholder="Registered Email" required></div><button type="submit" class="btn btn-primary w-100 mb-3">Request Code</button></form><div class="text-center"><button onclick="history.back()" class="back-link">← Return</button></div></div>`);
});

// 4. 寄送與驗證邏輯 (包含密碼暫存)
app.post('/send-verify', (req, res) => {
    const { email, type, username, birthday, password } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000);
    tempCodes[email] = { code: code, userData: { username: username || 'Agent', birthday, password } };

    const mailOptions = {
        from: GMAIL_USER,
        to: email,
        subject: `[SECURITY] Auth Code: ${code}`,
        text: `Auth Code: ${code}`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) return res.send(`Encryption Error: ${err.message}`);
        res.send(`${style}<div class="card"><div class="logo">Verification</div><p class="text-center text-muted small">Code dispatched to ${email}</p><form action="/check-verify" method="POST"><input type="hidden" name="email" value="${email}"><div class="mb-4"><input type="text" name="userCode" class="form-control text-center" style="font-size:2rem; letter-spacing:10px; color:#00d4ff;" maxlength="6" required></div><button type="submit" class="btn btn-primary w-100 mb-3">Verify Identity</button></form></div>`);
    });
});

app.post('/check-verify', (req, res) => {
    const { email, userCode } = req.body;
    const record = tempCodes[email];
    if (record && record.code.toString() === userCode) {
        const user = record.userData;
        delete tempCodes[email];
        res.send(`${style}<div class="card text-center"><div class="logo" style="color:#00ff88;">Authorized</div><p>Welcome back, ${user.username}</p><p class="text-muted small">ID: ${email}<br>Security: Confirmed</p><hr><a href="/" class="btn btn-primary w-100">Enter Terminal</a></div>`);
    } else {
        res.send(`${style}<div class="card text-center"><div class="logo" style="color:#ff4b2b;">Denied</div><p>Invalid Authentication Code</p><button onclick="history.back()" class="btn btn-outline-info w-100">Retry</button></div>`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Cyber System Active on Port ${PORT}`));