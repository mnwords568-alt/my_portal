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

// --- 統一明亮工業風 CSS ---
const style = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background-color: #f4f4f4; height: 100vh; display: flex; align-items: center; justify-content: center; font-family: 'Courier New', monospace; margin: 0; color: #1a1a1a; }
        .card { background: #ffffff; border: 2px solid #000000; padding: 30px; box-shadow: 8px 8px 0px #000000; width: 100%; max-width: 500px; }
        .btn-primary { background: #000000; border: none; color: #ffffff; padding: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; transition: 0.2s; width: 100%; }
        .btn-primary:disabled { background: #cccccc; color: #888888; cursor: not-allowed; box-shadow: none; }
        .form-control { background: #ffffff; border: 1px solid #1a1a1a; color: #1a1a1a; border-radius: 0px; padding: 10px; font-size: 0.9rem; }
        .logo { font-size: 22px; font-weight: bold; text-align: center; letter-spacing: 4px; margin-bottom: 20px; border-bottom: 2px solid #000000; padding-bottom: 10px; }
        .label-sm { font-size: 0.75rem; color: #555555; text-transform: uppercase; margin-bottom: 4px; display: block; }
        .captcha-container { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
        #captchaCanvas { border: 1px solid #000; background: #fff; cursor: pointer; }
        .back-link { color: #888888; text-decoration: none; font-size: 0.8rem; }
    </style>
`;

// 圖形驗證碼生成腳本 (可複用)
const captchaScript = `
    let currentCaptcha = "";
    function drawCaptcha(canvasId, inputId, btnId, extraCheck = () => true) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        const input = document.getElementById(inputId);
        const btn = document.getElementById(btnId);

        function generate() {
            currentCaptcha = Math.random().toString(36).substring(2, 6).toUpperCase();
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, 120, 40);
            // 畫線
            for (let i = 0; i < 6; i++) {
                ctx.strokeStyle = "rgba(0,0,0," + Math.random() + ")";
                ctx.beginPath();
                ctx.moveTo(Math.random()*120, Math.random()*40);
                ctx.lineTo(Math.random()*120, Math.random()*40);
                ctx.stroke();
            }
            // 畫字
            ctx.font = "bold 24px 'Courier New'";
            ctx.fillStyle = "#000";
            ctx.fillText(currentCaptcha, 25, 28);
        }

        canvas.addEventListener('click', generate);
        generate();

        const validate = () => {
            const isCaptchaMatch = input.value.toUpperCase() === currentCaptcha;
            btn.disabled = !(isCaptchaMatch && extraCheck());
        };

        input.addEventListener('input', validate);
        return validate; // 回傳以供外部表單監聽調用
    }
`;

// 1. 首頁 (登入) - 加入驗證碼
app.get('/', (req, res) => {
    res.send(`
        ${style}
        <div class="card">
            <div class="logo">SYSTEM_LOGIN</div>
            <form action="/login" method="POST" id="loginForm">
                <div class="mb-3">
                    <span class="label-sm">帳號</span>
                    <input type="email" name="email" id="loginEmail" class="form-control" placeholder="USER_ID" required>
                </div>
                <div class="mb-3">
                    <span class="label-sm">密碼</span>
                    <input type="password" name="password" id="loginPwd" class="form-control" placeholder="PASSWORD" required>
                </div>
                <div class="label-sm">驗證碼 (點擊刷新)</div>
                <div class="captcha-container">
                    <canvas id="loginCaptchaCanvas" width="120" height="40"></canvas>
                    <input type="text" id="loginCaptchaInput" class="form-control" placeholder="CODE" required>
                </div>
                <button type="submit" id="loginBtn" class="btn btn-primary mb-3" disabled>EXECUTE_LOGIN</button>
            </form>
            <div class="text-center"><a href="/register-page" class="back-link">NEW_IDENTITY</a></div>
        </div>
        <script>
            ${captchaScript}
            const loginEmail = document.getElementById('loginEmail');
            const loginPwd = document.getElementById('loginPwd');
            drawCaptcha('loginCaptchaCanvas', 'loginCaptchaInput', 'loginBtn', () => {
                return loginEmail.value !== "" && loginPwd.value !== "";
            });
            document.getElementById('loginForm').addEventListener('input', () => {
                const input = document.getElementById('loginCaptchaInput');
                input.dispatchEvent(new Event('input')); // 觸發驗證
            });
        </script>
    `);
});

// 2. 註冊頁面 - 加入驗證碼與密碼檢查
app.get('/register-page', (req, res) => {
    res.send(`
        ${style}
        <div class="card">
            <div class="logo">ID_GENERATION</div>
            <form action="/send-verify" method="POST" id="regForm">
                <div class="row g-2 mb-2">
                    <div class="col-4">
                        <span class="label-sm">姓氏</span>
                        <input type="text" name="lastName" class="form-control" required>
                    </div>
                    <div class="col-8">
                        <span class="label-sm">名字</span>
                        <input type="text" name="firstName" class="form-control" required>
                    </div>
                </div>
                <div class="mb-2">
                    <span class="label-sm">生日</span>
                    <input type="date" name="birthday" class="form-control" required>
                </div>
                <div class="mb-2">
                    <span class="label-sm">電子信箱</span>
                    <input type="email" name="email" id="regEmail" class="form-control" required>
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <span class="label-sm">設定密碼</span>
                        <input type="password" name="password" id="password" class="form-control" required>
                    </div>
                    <div class="col-6">
                        <span class="label-sm">確認密碼</span>
                        <input type="password" id="confirmPassword" class="form-control" required>
                    </div>
                </div>
                <div class="label-sm">驗證碼 (點擊刷新)</div>
                <div class="captcha-container">
                    <canvas id="regCaptchaCanvas" width="120" height="40"></canvas>
                    <input type="text" id="regCaptchaInput" class="form-control" placeholder="CODE" required>
                </div>
                <button type="submit" id="regBtn" class="btn btn-primary mb-2" disabled>SEND_VALIDATION</button>
            </form>
            <div class="text-center"><button onclick="history.back()" class="back-link" style="border:none;background:none;">← ABORT</button></div>
        </div>
        <script>
            ${captchaScript}
            const pwd = document.getElementById('password');
            const cpwd = document.getElementById('confirmPassword');
            const formInputs = document.querySelectorAll('#regForm input[required]');
            
            const extraCheck = () => {
                let allFilled = true;
                formInputs.forEach(i => { if(!i.value) allFilled = false; });
                return allFilled && (pwd.value === cpwd.value);
            };

            drawCaptcha('regCaptchaCanvas', 'regCaptchaInput', 'regBtn', extraCheck);
            
            document.getElementById('regForm').addEventListener('input', () => {
                document.getElementById('regCaptchaInput').dispatchEvent(new Event('input'));
            });
        </script>
    `);
});

// 3. 後端邏輯 (維持原樣)
app.post('/send-verify', (req, res) => {
    const { email, firstName, lastName, birthday, password } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000);
    tempCodes[email] = { code, userData: { name: lastName + firstName, birthday, password } };

    const mailOptions = {
        from: GMAIL_USER,
        to: email,
        subject: `[SYSTEM] OTP_CODE: ${code}`,
        text: `Your code is: ${code}`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) return res.send(`SYSTEM_ERROR: ${err.message}`);
        res.send(`${style}<div class="card"><div class="logo">VALIDATION</div><p class="text-center small">CODE_SENT_TO: ${email}</p><form action="/check-verify" method="POST"><input type="hidden" name="email" value="${email}"><div class="mb-4"><input type="text" name="userCode" class="form-control text-center" style="font-size:2rem; letter-spacing:10px;" maxlength="6" required></div><button type="submit" class="btn btn-primary">AUTHORIZE</button></form></div>`);
    });
});

app.post('/check-verify', (req, res) => {
    const { email, userCode } = req.body;
    const record = tempCodes[email];
    if (record && record.code.toString() === userCode) {
        delete tempCodes[email];
        res.send(`${style}<div class="card text-center"><div class="logo">AUTHORIZED</div><p>ACCOUNT_ACTIVATED</p><hr><a href="/" class="btn btn-primary">LOG_IN</a></div>`);
    } else {
        res.send(`${style}<div class="card text-center"><div class="logo">DENIED</div><button onclick="history.back()" class="btn btn-primary">RETRY</button></div>`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SYSTEM_ONLINE_PORT_${PORT}`));