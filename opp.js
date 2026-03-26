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

// --- 明亮極簡科技風格 (白底黑字) ---
const style = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { 
            background-color: #f4f4f4; /* 淡淡的灰，讓白色卡片更凸顯 */
            height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-family: 'Courier New', monospace; 
            margin: 0;
            color: #1a1a1a; /* 深灰色文字，比純黑柔和 */
        }
        .card { 
            background: #ffffff; 
            border: 2px solid #000000; 
            border-radius: 0px; /* 方正邊角更有工業感 */
            padding: 30px; 
            box-shadow: 8px 8px 0px #000000; /* 俐落的黑色實心陰影 */
            width: 100%; 
            max-width: 500px; 
        }
        .btn-primary { 
            background: #000000; 
            border: none; 
            color: #ffffff;
            padding: 10px; 
            border-radius: 0px; 
            font-weight: bold; 
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: 0.2s;
        }
        .btn-primary:hover { 
            background: #333333; 
            transform: translate(-2px, -2px);
            box-shadow: 4px 4px 0px #666666;
        }
        .btn-primary:disabled { 
            background: #cccccc; 
            color: #888888; 
            cursor: not-allowed; 
            box-shadow: none; 
        }
        .form-control, .form-select { 
            background: #ffffff;
            border: 1px solid #1a1a1a;
            color: #1a1a1a;
            border-radius: 0px; 
            padding: 10px; 
            font-size: 0.9rem;
        }
        .form-control:focus, .form-select:focus {
            background: #ffffff;
            color: #1a1a1a;
            border-color: #000000;
            box-shadow: 0 0 5px rgba(0,0,0,0.1);
        }
        .logo { 
            font-size: 22px; 
            font-weight: bold; 
            text-align: center; 
            text-transform: uppercase;
            letter-spacing: 4px;
            margin-bottom: 25px;
            border-bottom: 2px solid #000000;
            padding-bottom: 10px;
        }
        .label-sm { font-size: 0.75rem; color: #555555; text-transform: uppercase; margin-bottom: 4px; display: block; }
        .back-link { color: #888888; text-decoration: none; font-size: 0.8rem; text-transform: uppercase; background: none; border: none; }
        .back-link:hover { color: #000000; text-decoration: underline; }
        ::placeholder { color: #bbbbbb !important; }
        hr { border-top: 1px solid #1a1a1a; opacity: 1; }
    </style>
`;

// 1. 首頁 (登入)
app.get('/', (req, res) => {
    res.send(`${style}<div class="card"><div class="logo">USER_LOGIN</div><form action="/login" method="POST"><div class="mb-3"><input type="email" name="email" class="form-control" placeholder="USER_ID" required></div><div class="mb-4"><input type="password" name="password" class="form-control" placeholder="PASSWORD" required></div><button type="submit" class="btn btn-primary w-100 mb-3">EXECUTE_LOGIN</button></form><div class="text-center"><a href="/register-page" class="back-link mx-2">NEW_IDENTITY</a> | <a href="/forgot-page" class="back-link mx-2">RECOVERY</a></div></div>`);
});

// 2. 註冊頁面 (含嚴格驗證與拆分姓名)
app.get('/register-page', (req, res) => {
    res.send(`
        ${style}
        <div class="card">
            <div class="logo">ID_GENERATION</div>
            <form action="/send-verify" method="POST" id="regForm">
                <input type="hidden" name="type" value="註冊">
                
                <div class="row g-2 mb-2">
                    <div class="col-4">
                        <span class="label-sm">姓氏</span>
                        <input type="text" name="lastName" id="lastName" class="form-control" placeholder="SURNAME" required>
                    </div>
                    <div class="col-8">
                        <span class="label-sm">名字</span>
                        <input type="text" name="firstName" id="firstName" class="form-control" placeholder="GIVEN_NAME" required>
                    </div>
                </div>

                <div class="mb-2">
                    <span class="label-sm">生日</span>
                    <input type="date" name="birthday" id="birthday" class="form-control" required style="color-scheme: light;">
                </div>

                <div class="mb-2">
                    <span class="label-sm">電子信箱</span>
                    <input type="email" name="email" id="email" class="form-control" placeholder="EMAIL_ADDRESS" required>
                </div>

                <div class="row g-2 mb-4">
                    <div class="col-6">
                        <span class="label-sm">設定密碼</span>
                        <input type="password" name="password" id="password" class="form-control" placeholder="PASSWORD" required>
                    </div>
                    <div class="col-6">
                        <span class="label-sm">確認密碼</span>
                        <input type="password" id="confirmPassword" class="form-control" placeholder="RE-ENTER" required>
                    </div>
                </div>

                <button type="submit" id="submitBtn" class="btn btn-primary w-100 mb-2" disabled>SEND_VALIDATION</button>
            </form>
            <div class="text-center"><button onclick="history.back()" class="back-link">← ABORT_MISSION</button></div>
        </div>

        <script>
            const form = document.getElementById('regForm');
            const btn = document.getElementById('submitBtn');
            const inputs = form.querySelectorAll('input[required]');
            const pwd = document.getElementById('password');
            const cpwd = document.getElementById('confirmPassword');

            function validate() {
                let allFilled = true;
                inputs.forEach(i => { if(!i.value) allFilled = false; });
                const pwdMatch = pwd.value === cpwd.value;
                btn.disabled = !(allFilled && pwdMatch);
            }
            form.addEventListener('input', validate);
        </script>
    `);
});

// 3. 寄送與驗證 (包含密碼暫存)
app.post('/send-verify', (req, res) => {
    const { email, firstName, lastName, birthday, password } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000);
    tempCodes[email] = { code: code, userData: { name: lastName + firstName, birthday, password } };

    const mailOptions = {
        from: GMAIL_USER, // 請確保 Render Environment Variables 已設定，並且 GMAIL_PASS 是 16 位密碼
        to: email,
        subject: `[SYSTEM] OTP_CODE: ${code}`,
        text: `Your verification code is: ${code}`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) return res.send(`SYSTEM_ERROR: ${err.message}`);
        res.send(`${style}<div class="card"><div class="logo">VALIDATION</div><p class="text-center small">CODE_SENT_TO: ${email}</p><form action="/check-verify" method="POST"><input type="hidden" name="email" value="${email}"><div class="mb-4"><input type="text" name="userCode" class="form-control text-center" style="font-size:2rem; letter-spacing:10px;" maxlength="6" required></div><button type="submit" class="btn btn-primary w-100 mb-2">AUTHORIZE</button></form></div>`);
    });
});

app.post('/check-verify', (req, res) => {
    const { email, userCode } = req.body;
    const record = tempCodes[email];
    if (record && record.code.toString() === userCode) {
        delete tempCodes[email];
        res.send(`${style}<div class="card text-center"><div class="logo">AUTHORIZED</div><p>ACCOUNT_ACTIVATED</p><p class="small">ID: ${email}</p><hr><a href="/" class="btn btn-primary w-100">LOG_IN</a></div>`);
    } else {
        res.send(`${style}<div class="card text-center"><div class="logo">DENIED</div><p>INVALID_CODE</p><button onclick="history.back()" class="btn btn-primary w-100">RETRY</button></div>`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SYSTEM_ONLINE_PORT_${PORT}`));