const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

// 暫存驗證碼與使用者資料
let tempCodes = {}; 

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

// --- 統一明亮工業風 CSS (白底黑字、硬陰影) ---
const style = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background-color: #f4f4f4; height: 100vh; display: flex; align-items: center; justify-content: center; font-family: 'Courier New', monospace; margin: 0; color: #1a1a1a; }
        .card { background: #ffffff; border: 2px solid #000000; padding: 30px; box-shadow: 8px 8px 0px #000000; width: 100%; max-width: 500px; }
        .btn-primary { background: #000000; border: none; color: #ffffff; padding: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; transition: 0.2s; width: 100%; }
        .btn-primary:hover:not(:disabled) { background: #333333; transform: translate(-2px, -2px); box-shadow: 4px 4px 0px #666666; }
        .btn-primary:disabled { background: #cccccc; color: #888888; cursor: not-allowed; }
        .form-control { background: #ffffff; border: 1px solid #1a1a1a; color: #1a1a1a; border-radius: 0px; padding: 10px; font-size: 0.9rem; }
        .logo { font-size: 22px; font-weight: bold; text-align: center; letter-spacing: 4px; margin-bottom: 20px; border-bottom: 2px solid #000000; padding-bottom: 10px; }
        .label-sm { font-size: 0.75rem; color: #555555; text-transform: uppercase; margin-bottom: 4px; display: block; }
        .captcha-container { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
        #regCapCanvas { border: 1px solid #000; background: #fff; cursor: pointer; }
        .back-link { color: #888888; text-decoration: none; font-size: 0.8rem; background: none; border: none; }
        .back-link:hover { color: #000000; text-decoration: underline; }
    </style>
`;

// 1. 註冊頁面 (包含拆分姓名、年齡與密碼彈窗驗證)
app.get('/register-page', (req, res) => {
    res.send(`
        ${style}
        <div class="card">
            <div class="logo">ID_GENERATION</div>
            <form action="/send-verify" method="POST" id="regForm">
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
                    <span class="label-sm">生日 (須滿18歲)</span>
                    <input type="date" name="birthday" id="regBirthday" class="form-control" required style="color-scheme: light;">
                </div>

                <div class="mb-2">
                    <span class="label-sm">電子信箱</span>
                    <input type="email" name="email" id="regEmail" class="form-control" placeholder="EMAIL_ADDRESS" required>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <span class="label-sm">設定密碼</span>
                        <input type="password" name="password" id="password" class="form-control" placeholder="PASSWORD" required>
                    </div>
                    <div class="col-6">
                        <span class="label-sm">確認密碼</span>
                        <input type="password" id="confirmPassword" class="form-control" placeholder="RE-ENTER" required>
                    </div>
                </div>

                <div class="label-sm">圖形驗證碼 (點擊圖片可刷新)</div>
                <div class="captcha-container">
                    <canvas id="regCapCanvas" width="120" height="40"></canvas>
                    <input type="text" id="regCapInput" class="form-control" placeholder="CODE" maxlength="4" required>
                </div>

                <button type="submit" id="regBtn" class="btn btn-primary mb-2" disabled>SEND_VALIDATION</button>
            </form>
            <div class="text-center"><button onclick="history.back()" class="back-link">← ABORT_MISSION</button></div>
        </div>

        <script>
            // --- 圖形驗證碼邏輯 ---
            let currentCaptcha = "";
            const canvas = document.getElementById('regCapCanvas');
            const ctx = canvas.getContext('2d');
            function drawCaptcha() {
                currentCaptcha = Math.random().toString(36).substring(2, 6).toUpperCase();
                ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 120, 40);
                for (let i = 0; i < 8; i++) {
                    ctx.strokeStyle = "rgba(0,0,0," + (Math.random()*0.4) + ")";
                    ctx.beginPath(); ctx.moveTo(Math.random()*120, Math.random()*40);
                    ctx.lineTo(Math.random()*120, Math.random()*40); ctx.stroke();
                }
                ctx.font = "bold 24px 'Courier New'"; ctx.fillStyle = "#000";
                ctx.fillText(currentCaptcha, 25, 28);
            }
            canvas.addEventListener('click', drawCaptcha);
            drawCaptcha();

            // --- 即時監控：填完即開放點擊 ---
            const form = document.getElementById('regForm');
            const regBtn = document.getElementById('regBtn');
            const requiredInputs = form.querySelectorAll('input[required]');
            const capInput = document.getElementById('regCapInput');

            form.addEventListener('input', () => {
                let allFilled = true;
                requiredInputs.forEach(i => { if(!i.value) allFilled = false; });
                regBtn.disabled = !(allFilled && capInput.value.length === 4);
            });

            // --- 點擊提交時的嚴格驗證 (18歲 & 密碼一致) ---
            form.onsubmit = function(e) {
                const birthInput = document.getElementById('regBirthday');
                const pwd = document.getElementById('password');
                const cpwd = document.getElementById('confirmPassword');

                // 1. 年齡檢查
                const today = new Date();
                const birthDate = new Date(birthInput.value);
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

                if (age < 18) {
                    alert("⚠️ 錯誤：註冊者必須年滿 18 歲。");
                    return false;
                }

                // 2. 密碼一致性檢查
                if (pwd.value !== cpwd.value) {
                    alert("⚠️ 錯誤：確認密碼與設定密碼不一致。");
                    return false;
                }

                // 3. 驗證碼檢查
                if (capInput.value.toUpperCase() !== currentCaptcha) {
                    alert("⚠️ 錯誤：圖形驗證碼輸入錯誤。");
                    drawCaptcha();
                    capInput.value = "";
                    return false;
                }

                return true; 
            };
        </script>
    `);
});

// 2. 首頁 (登入頁面)
app.get('/', (req, res) => {
    res.send(`${style}<div class="card"><div class="logo">USER_LOGIN</div><form action="/login" method="POST"><div class="mb-3"><input type="email" name="email" class="form-control" placeholder="USER_ID" required></div><div class="mb-4"><input type="password" name="password" class="form-control" placeholder="PASSWORD" required></div><button type="submit" class="btn btn-primary mb-3">EXECUTE_LOGIN</button></form><div class="text-center"><a href="/register-page" class="back-link mx-2">NEW_IDENTITY</a> | <a href="/forgot-page" class="back-link mx-2">RECOVERY</a></div></div>`);
});

// 3. 寄送驗證碼
app.post('/send-verify', (req, res) => {
    const { email, firstName, lastName, birthday, password } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000);
    tempCodes[email] = { code, userData: { name: lastName + firstName, birthday, password } };

    const mailOptions = {
        from: GMAIL_USER,
        to: email,
        subject: `[SYSTEM] OTP_CODE: ${code}`,
        text: `Hello ${lastName}${firstName}, your code is: ${code}`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) return res.send(`SYSTEM_ERROR: ${err.message}`);
        res.send(`${style}<div class="card"><div class="logo">VALIDATION</div><p class="text-center small">CODE_SENT_TO: ${email}</p><form action="/check-verify" method="POST"><input type="hidden" name="email" value="${email}"><div class="mb-4"><input type="text" name="userCode" class="form-control text-center" style="font-size:2rem; letter-spacing:10px;" maxlength="6" required></div><button type="submit" class="btn btn-primary">AUTHORIZE</button></form></div>`);
    });
});

// 4. 驗證 OTP
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