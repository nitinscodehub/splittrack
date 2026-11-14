# SplitTrack

Simple shared bill tracker for friend groups. Next.js 14 + TypeScript + Prisma + PostgreSQL + Gmail SMTP.
<img width="1907" height="892" alt="image" src="https://github.com/user-attachments/assets/80091210-e28c-4506-8c0f-17bb892f305d" />


**Live:** https://splittrack-green.vercel.app

## Sirf 8 steps

### 1. Neon database banao
1. https://neon.tech kholo → **Sign up** → **Create project**.
2. Project kholo → **Dashboard** → **Connection Details**.
3. **Pooled connection** string copy karo (`...-pooler...`). Isi ko setup me `DATABASE_URL` ke roop me paste karna hai.
4. `DIRECT_URL` setup khud bana lega (pooled host se `-pooler` hata kar).

### 2. Gmail App Password (production ke liye)
Local testing me iski zarurat nahi. Local me OTP screen par dikhega.

Production email ke liye:
1. https://myaccount.google.com/security kholo.
2. **2-Step Verification** ON karo.
3. https://myaccount.google.com/apppasswords kholo.
4. App name me `SplitTrack` likho → **Create**.
5. 16-character App Password copy karo. Gmail ka normal password use nahi hoga.

### 3. Project install + setup
```bash
cd splittrack
npm install
npm run setup
```

`npm run setup` sirf 3 cheezein puchega:
- `DATABASE_URL` — Neon pooled URL (local me Enter)
- `SMTP_USER` — tumhara Gmail address
- `SMTP_APP_PASSWORD` — 16-character App Password, **ya bas Enter** = local OTP test mode

**Sabse easy local setup:** Gmail App Password prompt par bas `Enter` dabao. Phir OTP email par nahi jayega, seedha verify screen par dikhega. Baad me production ke liye asli App Password daal sakte ho.

Ye script khud:
- `.env` banata hai
- `NEXTAUTH_SECRET` aur `CRON_SECRET` generate karta hai
- `DIRECT_URL` banata hai
- database connection test karta hai
- Gmail se test email bhejta hai (ya local OTP mode on karta hai)
- Prisma migration chalata hai
- chaaho to demo data seed karta hai

### 4. Local app chalao
```bash
npm run dev
```

Open: **http://localhost:3000**

Demo login:
```text
aarav@splittrack.demo
Password123!
```
Baaki demo users: `bhavya`, `chirag`, `diya` (same email pattern + same password).

Real signup karo:
- **Local OTP mode**: OTP verify screen par hi dikhega, email ki zarurat nahi.
- **Gmail mode**: OTP Gmail par aayega. Na aaye to **Spam** dekho aur Step 2 dobara check karo.

### 5. GitHub par push karo
```bash
git init
git add .
git commit -m "SplitTrack production ready"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/splittrack.git
git push -u origin main
```

`.env` git me nahi jayega. `.env.example` safe hai.

### 6. Vercel par deploy karo
Sabse aasan tareeka — CLI se env auto-push + deploy:
```bash
npx vercel login
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Script production URL puchega. Pehle check karega ki hosted database URL aur asli Gmail App Password set hain — local values hue to deploy nahi karega. Phir `.env` ke saare variables Vercel me daalega, `NEXTAUTH_URL` aur `NEXT_PUBLIC_APP_URL` ko production URL se replace karega, aur `vercel --prod` chalayega.

Alternative: Vercel dashboard → **Add New Project** → GitHub repo import → Environment Variables me `.env` ki values paste → Deploy.

### 7. Post-deploy migration + seed
Build ke time migration automatic chalti hai (`npm run build` me `prisma migrate deploy` hai).

Demo data production me chahiye to local se:
```bash
DATABASE_URL="your-neon-url" DIRECT_URL="your-neon-direct-url" npm run seed
```
Normal real app ke liye seed mat chalao.

### 8. Final checklist
- [ ] Signup karke Gmail par 6-digit OTP receive hua
- [ ] OTP verify hoke dashboard khula
- [ ] Friend add / invite link kaam kar raha hai
- [ ] Bill add karke Payments page par balance dikha
- [ ] Payment mark + doosre person ka confirm kaam kar raha hai
- [ ] `https://YOUR_APP/api/cron/reminders` ko `Authorization: Bearer YOUR_CRON_SECRET` ke saath call karke 200 response aaya
- [ ] Vercel Cron daily **03:30 UTC = 09:00 AM IST** par set hai (`vercel.json`)
- [ ] Signup OTP, reset password OTP aur reminder email Spam me nahi ja rahe

Cron test:
```bash
curl -i https://YOUR_APP.vercel.app/api/cron/reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Common problems

**OTP nahi aa raha**
- Gmail App Password use karo, normal password nahi.
- Gmail account par 2-Step Verification ON hona chahiye.
- `SMTP_USER` aur `EMAIL_FROM` me same Gmail address rakho.
- `npm run setup` dobara chalao, phir `npm run dev` restart karo.
- Gmail ke **Spam** folder me check karo.
- Vercel par `SMTP_USER`, `SMTP_APP_PASSWORD`, `EMAIL_FROM` environment variables check karo.

**Database error**
- Neon URL pooled hona chahiye.
- Migration ke liye direct URL chahiye; setup ye auto banata hai.
- `npm run build` se pehle database accessible hona chahiye.

**Cron 401**
- `CRON_SECRET` Vercel environment me set hona chahiye.
- Header exact `Authorization: Bearer <secret>` hona chahiye.

## Commands

```bash
npm run dev       # local development
npm run build     # generate + migrate + production build
npm start         # production server
npm test          # money math tests
npm run lint      # ESLint
npm run setup     # one-time env/db/email setup
npm run seed      # demo data
npm run deploy    # push env + deploy to Vercel
```

Made By Nitin Dhurve 😎
