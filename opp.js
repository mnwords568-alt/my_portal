const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

// 暫時儲存驗證資料 (包含代碼與用戶填寫的表單資料)
let tempCodes = {}; 

// --- Gmail 郵件設定 (Render 環境變數) ---
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

// 共同 CSS 樣式
const style = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; margin: 0; }
        .card { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border-radius: 20px; padding: 40px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); width: 100%; max-width: 480px; border: none; }
        .btn-primary { background: #764ba2; border: none; padding: 12px; border-radius: 10px; font-weight: bold; }
        .btn-primary:hover { background: #667eea; }
        .form-control, .form-select { border-radius: 10px; padding: 12px; border: 1px solid #ddd; }
        .logo { font-size: 24px; font-weight: bold; color: #764ba2; margin-bottom: 25px; text-align: center; }
        .back-link { color: #764ba2; text-decoration: none; font-size: 0.9rem; cursor: pointer; background: none; border: none; }
        .label-sm { font-size: 0.85rem; color: #666; margin-bottom: 5px; margin-left: 5px; }
    </style>
`;

// 1. 首頁 (登入)
app.get('/', (req, res) => {
    res.send(`${style}<div class="card"><div class="logo">🚀 歡迎回來</div><form action="/login" method="POST"><div class="mb-3"><input type="email" name="email" class="form-control" placeholder="Email" required></div><div class="mb-4"><input type="password" name="password" class="form-control" placeholder="密碼" required></div><button type="submit" class="btn btn-primary w-100 mb-3">立即登入</button></form><div class="text-center"><a href="/register-page" class="back-link mx-2">註冊帳號</a> | <a href="/forgot-page" class="back-link mx-2">忘記密碼</a></div></div>`);
});

// 2. 註冊頁面 (多欄位表單)
app.get('/register-page', (req, res) => {
    res.send(`
        ${style}
        <div class="card">
            <div class="logo">✨ 建立帳號</div>
            <form action="/send-verify" method="POST">
                <input type="hidden" name="type" value="註冊">
                <div class="row g-2 mb-3">
                    <div class="col-md-6">
                        <div class="label-sm">姓名</div>
                        <input type="text" name="username" class="form-control" placeholder="您的姓名" required>
                    </div>
                    <div class="col-md-6">
                        <div class="label-sm">生日</div>
                        <input type="date" name="birthday" class="form-control" required>
                    </div>
                </div>
                <div class="mb-3">
                    <div class="label-sm">年收入</div>
                    <select name="income" class="form-select">
                        <option value="50萬以下">50萬以下</option>
                        <option value="50-100萬">50-100萬</option>
                        <option value="100-200萬">100-200萬</option>
                        <option value="200萬以上">200萬以上</option>
                    </select>
                </div>
                <div class="mb-4">
                    <div class="label-sm">電子信箱</div>
                    <input type="email" name="email" class="form-control" placeholder="example@gmail.com" required>
                </div>
                <button type="submit" class="btn btn-primary w-100 mb-3">發送驗證碼</button>
            </form>
            <div class="text-center"><button onclick="history.back()" class="back-link">← 回到上一頁</button></div>
        </div>
    `);
});

// 3. 忘記密碼頁面
app.get('/forgot-page', (req, res) => {
    res.send(`${style}<div class="card"><div class="logo">🔑 重設密碼</div><p class="text-center text-muted mb-4 small">請輸入信箱以發送重設代碼</p><form action="/send-verify" method="POST"><input type="hidden" name="type" value="重設密碼"><div class="mb-4"><input type="email" name="email" class="form-control" placeholder="您的 Email" required></div><button type="submit" class="btn btn-primary w-100 mb-3">提交</button></form><div class="text-center"><button onclick="history.back()" class="back-link">← 回到上一頁</button></div></div>`);
});

// 4. 寄送驗證碼邏輯
app.post('/send-verify', (req, res) => {
    const { email, type, username, birthday, income } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000);
    
    // 整合存儲驗證碼與使用者資料
    tempCodes[email] = { 
        code: code, 
        userData: { username: username || '用戶', birthday, income } 
    };

    const mailOptions = {
        from: GMAIL_USER,
        to: email,
        subject: `【驗證碼】您的${type}要求`,
        text: `您好！您的${type}驗證碼是：${code}。請在網頁輸入以完成操作。`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) return res.send(`發送失敗: ${err.message}`);
        res.send(`${style}<div class="card"><div class="logo">📩 已寄送</div><p class="text-center text-muted">代碼已寄至 <b>${email}</b></p><form action="/check-verify" method="POST"><input type="hidden" name="email" value="${email}"><div class="mb-4"><input type="text" name="userCode" class="form-control text-center" style="font-size:2rem; letter-spacing:10px;" maxlength="6" required></div><button type="submit" class="btn btn-primary w-100 mb-3">驗證代碼</button></form><div class="text-center"><button onclick="history.back()" class="back-link">← 返回重填</button></div></div>`);
    });
});

// 5. 檢查驗證碼邏輯
app.post('/check-verify', (req, res) => {
    const { email, userCode } = req.body;
    const record = tempCodes[email];

    if (record && record.code.toString() === userCode) {
        const user = record.userData;
        delete tempCodes[email]; // 驗證完即刪除
        res.send(`${style}<div class="card text-center"><div class="logo" style="color:green;">✔️ 驗證成功</div><p class="mb-2"><b>${user.username}</b>，歡迎加入！</p><p class="text-muted small">生日：${user.birthday || '未設定'}<br>年收區間：${user.income || '未設定'}</p><hr><a href="/" class="btn btn-primary w-100">返回登入頁面</a></div>`);
    } else {
        res.send(`${style}<div class="card text-center"><div class="logo" style="color:red;">❌ 驗證失敗</div><p class="mb-4">代碼錯誤或已過期，請重新檢查。</p><button onclick="history.back()" class="btn btn-outline-secondary w-100">返回重新輸入</button></div>`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`伺服器運作中：${PORT}`));