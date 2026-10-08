import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
const app=express(); app.disable('x-powered-by'); app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:false})); app.use(express.json({limit:'128kb'})); app.use(cookieParser());
// Reject cross-site browser mutations using the Origin header, preserving same-site Railway deployments.
app.use('/api',(req,res,next)=>{
 if(!['POST','PUT','PATCH','DELETE'].includes(req.method))return next();
 const origin=req.get('origin');
 if(!origin)return next(); // Non-browser clients must authenticate separately.
 try { const supplied=new URL(origin); const expectedHost=req.get('x-forwarded-host')||req.get('host');
   if(supplied.protocol!=='https:'&&process.env.NODE_ENV==='production')return res.status(403).json({error:'HTTPS is required'});
   if(supplied.host!==expectedHost)return res.status(403).json({error:'Cross-origin mutation blocked'});
   return next();
 }catch {return res.status(403).json({error:'Invalid origin'});}
});
app.use('/api',rateLimit({windowMs:60*1000,limit:180,standardHeaders:'draft-7',legacyHeaders:false}));
const pool=mysql.createPool({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'rawas',waitForConnections:true,connectionLimit:8,decimalNumbers:true});
const secret=process.env.JWT_SECRET;
if(!secret||secret.length<32){console.error('JWT_SECRET must be configured (32+ characters).');process.exit(1)}
const query=async(sql,args=[])=>{const [rows]=await pool.execute(sql,args);return rows};
const safeUser=u=>({id:u.id,first_name:u.first_name,last_name:u.last_name,email:u.email,role:u.role,status:u.status,company_name:u.company_name,credit_balance:u.credit_balance,currency:u.currency});
const err=(res,e)=>{console.error('API error:',e.message);return res.status(500).json({error:'Server error. Check database configuration or logs.'})};
const auth=(roles=[])=>async(req,res,next)=>{try{const token=req.cookies.rawas_token;if(!token)return res.status(401).json({error:'Please log in'});const data=jwt.verify(token,secret);const rows=await query('SELECT id, first_name,last_name,email,role,status,company_name,credit_balance,currency FROM users WHERE id=? AND deleted_at IS NULL',[data.id]);if(!rows.length||rows[0].status!=='active')return res.status(401).json({error:'Account unavailable'});if(roles.length&&!roles.includes(rows[0].role))return res.status(403).json({error:'Access denied'});req.user=rows[0];next()}catch(e){return res.status(401).json({error:'Session expired or invalid'})}};
const loginLimiter=rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:'draft-7',legacyHeaders:false});
app.get('/api/health',async(req,res)=>{try{await query('SELECT 1');res.json({ok:true,database:'connected'})}catch(e){res.status(503).json({ok:false,database:'unavailable'})}});
app.post('/api/auth/login',loginLimiter,async(req,res)=>{try{const {email,password,area='client'}=req.body||{};if(typeof email!=='string'||typeof password!=='string'||email.length>254)return res.status(400).json({error:'Valid email and password required'});const rows=await query('SELECT * FROM users WHERE email=? AND deleted_at IS NULL LIMIT 1',[email.toLowerCase().trim()]);const user=rows[0];let match=false;if(user){if(user.password?.startsWith('$2y$'))match=await bcrypt.compare(password,'$2b$'+user.password.slice(4));else match=await bcrypt.compare(password,user.password||'')}if(!user||!match||user.status!=='active'||(area==='admin'?!['admin','staff'].includes(user.role):user.role!=='client'))return res.status(401).json({error:'Incorrect credentials or account access denied'});const token=jwt.sign({id:user.id},secret,{expiresIn:'12h'});res.cookie('rawas_token',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:12*3600000});await query('UPDATE users SET last_login_at=NOW() WHERE id=?',[user.id]);res.json({user:safeUser(user)})}catch(e){err(res,e)}});
app.post('/api/auth/register',loginLimiter,async(req,res)=>{try{const {first_name,last_name,email,password,phone='',company_name=''}=req.body||{};if(!first_name||!last_name||!/^\S+@\S+\.\S+$/.test(email||'')||String(password||'').length<8)return res.status(400).json({error:'Name, valid email, and password of at least 8 characters required'});if([first_name,last_name,email,phone,company_name].some(x=>typeof x!=='string'||x.length>255))return res.status(400).json({error:'Invalid field length'});const hash=await bcrypt.hash(password,12);const r=await query("INSERT INTO users (first_name,last_name,email,password,phone,company_name,role,status,created_at,updated_at) VALUES (?,?,?,?,?,?,'client','active',NOW(),NOW())",[first_name,last_name,email.toLowerCase().trim(),hash,phone,company_name]);res.status(201).json({id:r.insertId,message:'Account created. Please log in.'})}catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'Email already exists'});err(res,e)}});
app.post('/api/auth/logout',(req,res)=>{res.clearCookie('rawas_token',{path:'/'});res.json({ok:true})});
app.get('/api/me',auth(),(req,res)=>res.json({user:safeUser(req.user)}));
app.get('/api/dashboard',auth(),async(req,res)=>{try{const u=req.user;const admin=['admin','staff'].includes(u.role);if(admin){const [users]=await query('SELECT COUNT(*) count FROM users WHERE deleted_at IS NULL');const [bookings]=await query('SELECT COUNT(*) count FROM exam_bookings');const [orders]=await query("SELECT COUNT(*) count FROM credit_orders WHERE status='pending'");res.json({stats:[{name:'Users',value:users.count},{name:'Exam bookings',value:bookings.count},{name:'Pending credit orders',value:orders.count}]})}else{const [bookings]=await query('SELECT COUNT(*) count FROM exam_bookings WHERE user_id=?',[u.id]);const [credentials]=await query('SELECT COUNT(*) count FROM credentials WHERE user_id=?',[u.id]);res.json({stats:[{name:'Credit balance',value:u.credit_balance??0},{name:'Exam bookings',value:bookings.count},{name:'Credentials',value:credentials.count}]})}}catch(e){err(res,e)}});
const mappings={credentials:{table:'credentials',columns:'id,email,reference,name,passport,status,expires_at,created_at'},'exam-bookings':{table:'exam_bookings',columns:'id,booking_id,occupation,city,available_date,exam_language,exam_session,payment_status,amount,created_at'},'credit-orders':{table:'credit_orders',columns:'id,credits,amount,transaction_id,status,created_at'},'credit-transactions':{table:'credit_transactions',columns:'id,amount,balance_after,type,note,created_at'},sessions:{table:'exam_sessions',columns:'id,session,test_center_id,date,time,language,available_seats'},'credit-packages':{table:'credit_packages',columns:'id,name,credits,price,is_active'}};
app.get('/api/data/:resource',auth(),async(req,res)=>{try{const m=mappings[req.params.resource];if(!m)return res.status(404).json({error:'Unsupported resource'});const shared=['sessions','credit-packages'].includes(req.params.resource);const sql=`SELECT ${m.columns} FROM ${m.table} ${shared?'':'WHERE user_id=?'} ORDER BY id DESC LIMIT 200`;const rows=await query(sql,shared?[]:[req.user.id]);res.json({rows})}catch(e){err(res,e)}});
app.get('/api/admin/users',auth(['admin','staff']),async(req,res)=>{try{const rows=await query('SELECT id,first_name,last_name,email,company_name,role,status,credit_balance,created_at FROM users WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 200');res.json({rows})}catch(e){err(res,e)}});
// Additional client and administrator workflows. All mutations use database parameters and verified ownership.
const str=(v,n=255)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=n;
const numberId=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null;
app.get('/api/payment-gateways',auth(),async(req,res)=>{try{res.json({rows:await query('SELECT id,name,account_holder,instructions,is_active FROM payment_gateways WHERE is_active=1 ORDER BY sort_order,id')})}catch(e){err(res,e)}});
app.post('/api/client/credit-orders',auth(['client']),async(req,res)=>{try{
 const packageId=numberId(req.body?.package_id),gatewayId=numberId(req.body?.gateway_id),reference=req.body?.transaction_id;
 if(!packageId||!gatewayId||!str(reference,255))return res.status(400).json({error:'Select a package, payment gateway and provide a transaction reference'});
 const [[pkg],[gateway]]=await Promise.all([query('SELECT id,credits,price FROM credit_packages WHERE id=? AND is_active=1',[packageId]),query('SELECT id FROM payment_gateways WHERE id=? AND is_active=1',[gatewayId])]);
 if(!pkg||!gateway||pkg.credits<=0||pkg.price<0)return res.status(400).json({error:'Package or payment gateway is unavailable'});
 const result=await query("INSERT INTO credit_orders (user_id,payment_gateway_id,credit_package_id,credits,amount,transaction_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?,'pending',NOW(),NOW())",[req.user.id,gatewayId,packageId,pkg.credits,pkg.price,reference.trim()]);res.status(201).json({id:result.insertId,status:'pending',message:'Order submitted for manual review. No credits added yet.'})
 }catch(e){err(res,e)}});
app.get('/api/admin/orders',auth(['admin','staff']),async(req,res)=>{try{res.json({rows:await query('SELECT o.id,o.user_id,u.email,o.credits,o.amount,o.transaction_id,o.status,o.created_at FROM credit_orders o JOIN users u ON o.user_id=u.id ORDER BY o.id DESC LIMIT 200')})}catch(e){err(res,e)}});
app.patch('/api/admin/orders/:id',auth(['admin']),async(req,res)=>{
 const id=numberId(req.params.id),status=req.body?.status;if(!id||!['approved','rejected'].includes(status))return res.status(400).json({error:'Invalid order or status'});
 let conn;try{conn=await pool.getConnection();await conn.beginTransaction();const [[order]]=await conn.query('SELECT * FROM credit_orders WHERE id=? FOR UPDATE',[id]);if(!order){await conn.rollback();return res.status(404).json({error:'Order not found'})}if(order.status!=='pending'){await conn.rollback();return res.status(409).json({error:'Order already processed'})}
 if(status==='approved'){
 const [[user]]=await conn.query('SELECT id,credit_balance FROM users WHERE id=? FOR UPDATE',[order.user_id]);if(!user)throw Error('User not found');const balance=Number(user.credit_balance)+Number(order.credits);await conn.query('UPDATE users SET credit_balance=?,updated_at=NOW() WHERE id=?',[balance,user.id]);await conn.query('INSERT INTO credit_transactions (user_id,amount,balance_after,type,note,admin_id,created_at,updated_at) VALUES (?,?,?,?,?,?,NOW(),NOW())',[user.id,order.credits,balance,'credit',`Approved credit order #${id}`,req.user.id]);
 }
 await conn.query('UPDATE credit_orders SET status=?,approved_at=?,updated_at=NOW() WHERE id=?',[status,status==='approved'?new Date():null,id]);await conn.commit();res.json({ok:true,status});
 }catch(e){if(conn)await conn.rollback();err(res,e)}finally{if(conn)conn.release()}
});
app.get('/api/admin/packages',auth(['admin','staff']),async(req,res)=>{try{res.json({rows:await query('SELECT id,name,credits,price,is_active FROM credit_packages ORDER BY id DESC')})}catch(e){err(res,e)}});
app.post('/api/admin/packages',auth(['admin']),async(req,res)=>{try{const {name,credits,price}=req.body||{};if(!str(name,255)||!Number.isSafeInteger(Number(credits))||Number(credits)<1||Number(credits)>1000000||!Number.isFinite(Number(price))||Number(price)<0||Number(price)>10000000)return res.status(400).json({error:'Invalid package details'});const r=await query('INSERT INTO credit_packages (name,credits,price,is_active,created_at,updated_at) VALUES (?,?,?,1,NOW(),NOW())',[name.trim(),Number(credits),Number(price)]);res.status(201).json({id:r.insertId})}catch(e){err(res,e)}});
app.patch('/api/admin/packages/:id',auth(['admin']),async(req,res)=>{try{const id=numberId(req.params.id);const value=req.body?.is_active;if(!id||typeof value!=='boolean')return res.status(400).json({error:'Invalid package status'});const r=await query('UPDATE credit_packages SET is_active=?,updated_at=NOW() WHERE id=?',[value?1:0,id]);if(!r.affectedRows)return res.status(404).json({error:'Package not found'});res.json({ok:true})}catch(e){err(res,e)}});
app.patch('/api/admin/users/:id/status',auth(['admin']),async(req,res)=>{try{const id=numberId(req.params.id),status=req.body?.status;if(!id||!['active','inactive','suspended'].includes(status))return res.status(400).json({error:'Invalid user or status'});if(id===Number(req.user.id))return res.status(400).json({error:'Cannot change your own status'});const r=await query("UPDATE users SET status=?,updated_at=NOW() WHERE id=? AND role='client' AND deleted_at IS NULL",[status,id]);if(!r.affectedRows)return res.status(404).json({error:'Client not found'});res.json({ok:true})}catch(e){err(res,e)}});
app.get('/api/client/profile',auth(),(req,res)=>res.json({user:safeUser(req.user)}));
// IMPORTANT: No raw card PAN/CVV, third-party OTP, or automatic external exam booking endpoints are exposed.

app.use('/api',(req,res)=>res.status(404).json({error:'This endpoint has not yet been migrated'}));
const dir=path.dirname(fileURLToPath(import.meta.url));const dist = path.resolve(dir, 'dist');if(existsSync(dist)){app.use(express.static(dist));app.get('*',(req,res)=>res.sendFile(path.join(dist,'index.html')))}else app.get('/',(req,res)=>res.send('RAWAS API is running. Run npm run build to serve React.'));
const port=Number(process.env.PORT||3000);app.listen(port,'0.0.0.0',()=>console.log(`RAWAS listening on ${port}`));
