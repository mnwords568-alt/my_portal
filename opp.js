const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

let tempCodes = {}; 

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

// --- 黑白極簡科技風格 ---
const style = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { 
            background-color: #000; 
            height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-family: 'Courier New', Courier, monospace; 
            margin: 0;
            color: #fff;
        }
        .card { 
            background: #000; 
            border: 2px solid #fff; 
            border-radius: 0px; /* 方正邊角更有工業感 */
            padding: 40px; 
            box-shadow: 10px 10px 0px #fff; /* 復古科技感陰影 */
            width: 100%; 
            max-width: 480px; 
        }
        .btn-primary { 
            background: #fff; 
            border: none; 
            color: #000;
            padding: 12px; 
            border-radius: 0px; 
            font-weight: bold; 
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: 0.3s;
        }
        .btn-primary:hover { 
            background: #ccc; 
            color: #000;
            transform: translate(-2px, -2px);
            box-shadow: 4px 4px 0px #888;
        }
        .form-control, .form-select { 
            background: #000;
            border: 1px solid #fff;
            color: #fff;
            border-radius: 0px; 
            padding: 12px; 
        }
        .form-control:focus, .form-select:focus {
            background: #111;
            color: #fff;
            border-color: #fff;
            box-shadow: 0 0 10px #fff;
        }
        .logo { 
            font-size: 24px; 
            font-weight: bold; 
            text-align: center; 
            text-transform: uppercase;
            letter-spacing: 5px;
            margin-bottom: 30px;
            border-bottom: 2px solid #fff;
            padding-bottom: 10px;
        }
        .label-sm { font-size: 0.75rem; color: #fff; text-transform: uppercase; margin-bottom: 5px; }
        .back-link { color: #888; text-decoration: none; font-size: 0.8rem; text-transform: uppercase; background: none; border: none; }
        .back-link:hover { color: #fff; text-decoration: underline; }
        ::placeholder { color: #444 !important; }
        hr { border-top: 1px solid #fff; opacity: 1; }
    </style>
`;

// 1. 首頁
app.get('/', (req, res) => {
    res.send(`${style}<div class="card"><div class="logo">LOGIN_REQUIRED</div><form action="/login" method="POST"><div class="mb-3"><input type="email" name="email" class="form-control" placeholder="USER_ID" required></div><div class="mb-4"><input type="password" name="password" class="form-control" placeholder="PASSWORD" required></div><button type="submit" class="btn btn-primary w-100 mb-3">EXECUTE_LOGIN</button></form><div class="text-center"><a href="/register-page" class="back-link mx-2">NEW_IDENTITY</a> | <a href="/forgot-page" class="back-link mx-2">RECOVERY</a></div></div>`);
});

// 2. 註冊頁面
app.get('/register-page', (req, res) => {
    res.send(`
        ${style}
        <div class="card">
            <div class="logo">ID_GENERATION</div>
            <form action="/send-verify" method="POST">
                <input type="hidden" name="type" value="註冊">
                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <div class="label-sm">Name</div>
                        <input type="text" name="username" class="form-control" placeholder="NAME" required>
                    </div>
                    <div class="col-6">
                        <div class="label-sm">Birth</div>
                        <input type="date" name="birthday" class="form-control" required style="color-scheme: dark;">
                    </div>
                </div>
                <div class="mb-3">
                    <div class="label-sm">Set Password</div>
                    <input type="password" name="password" class="form-control" placeholder="SECRET_KEY" required>
                </div>
                <div class="mb-4">
                    <div class="label-sm">Email Address</div>
                    <input type="email" name="email" class="form-control" placeholder="EMAIL" required>
                </div>
                <button type="submit" class="btn btn-primary w-100 mb-3">GENERATE_OTP</button>
            </form>
            <div class="text-center"><button onclick="history.back()" class="back-link">← ABORT</button></div>
        </div>
    `);
});

// 3. 寄送與驗證 (包含 502 排查與環境變數引用)
app.post('/send-verify', (req, res) => {
    const { email, type, username, birthday, password } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000);
    tempCodes[email] = { code: code, userData: { username: username || 'USER', birthday, password } };

    const mailOptions = {
        from: GMAIL_USER, // 請確保 Render Environment Variables 已設定
        to: email,
        subject: `[SYSTEM] OTP_CODE: ${code}`,
        text: `Your verification code is: ${code}`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) return res.send(`SYSTEM_ERROR: ${err.message}`);
        res.send(`${style}<div class="card"><div class="logo">VERIFICATION</div><p class="text-center small">CODE_DISPATCHED_TO: ${email}</p><form action="/check-verify" method="POST"><input type="hidden" name="email" value="${email}"><div class="mb-4"><input type="text" name="userCode" class="form-control text-center" style="font-size:2rem; letter-spacing:10px;" maxlength="6" required></div><button type="submit" class="btn btn-primary w-100 mb-3">VALIDATE</button></form></div>`);
    });
});

app.post('/check-verify', (req, res) => {
    const { email, userCode } = req.body;
    const record = tempCodes[email];
    if (record && record.code.toString() === userCode) {
        const user = record.userData;
        delete tempCodes[email];
        res.send(`${style}<div class="card text-center"><div class="logo">AUTHORIZED</div><p>WELCOME_AGENT: ${user.username}</p><p class="small">ID: ${email}<br>STATUS: VERIFIED</p><hr><a href="/" class="btn btn-primary w-100">ENTER_DASHBOARD</a></div>`);
    } else {
        res.send(`${style}<div class="card text-center"><div class="logo" style="border-color: #800;">DENIED</div><p>INVALID_CREDENTIALS</p><button onclick="history.back()" class="btn btn-primary w-100">RETRY</button></div>`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SYSTEM_ONLINE_PORT_${PORT}`));