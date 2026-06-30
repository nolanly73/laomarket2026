// @ts-nocheck
import { useState, useEffect } from "react";

// ─── SUPABASE CONFIG ─────────────────────────────────────────────────────────
// Remplace ces valeurs par tes vraies clés Supabase
const SUPABASE_URL = "https://lqfyjrjhtpxqfgstyfan.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZnlqcmpodHB4cWZnc3R5ZmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTQ3ODcsImV4cCI6MjA5ODEzMDc4N30.lHqwzKI2t_YmJ0SCnYmhYJ-fJ5Oz4vUVDE3gUvATGOo";

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function translateProductName(text, fromLang) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Translate this product name to Lao, English, and Chinese. The original is in ${fromLang}. Product name: "${text}". Respond ONLY with JSON, no markdown, no preamble, in this exact format: {"lo":"...","en":"...","zh":"..."}`
        }]
      })
    });
    const data = await res.json();
    const raw = data.content.map(c => c.text || "").join("");
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
}


//
// create table sellers (
//   id uuid default gen_random_uuid() primary key,
//   name text not null,
//   phone text not null,
//   password text not null,
//   whatsapp text,
//   village text,
//   shipper text,
//   qr_label text,
//   qr_image text,
//   category text,
//   created_at timestamptz default now()
// );
//
// create table products (
//   id uuid default gen_random_uuid() primary key,
//   seller_id uuid references sellers(id),
//   seller_name text,
//   name_lo text, name_en text, name_zh text,
//   price integer not null,
//   category text not null,
//   emoji text default '📦',
//   image text,
//   description text,
//   badge text,
//   created_at timestamptz default now()
// );
//
// create table buyers (
//   id uuid default gen_random_uuid() primary key,
//   name text,
//   phone text,
//   village text,
//   created_at timestamptz default now()
// );
//
// create table orders (
//   id uuid default gen_random_uuid() primary key,
//   buyer_id uuid references buyers(id),
//   seller_id uuid references sellers(id),
//   seller_name text,
//   items jsonb,
//   total integer,
//   village text,
//   shipper text,
//   created_at timestamptz default now()
// );
//
// alter table sellers enable row level security;
// alter table products enable row level security;
// alter table buyers enable row level security;
// alter table orders enable row level security;
// create policy "Public read" on sellers for select using (true);
// create policy "Public insert" on sellers for insert with check (true);
// create policy "Public read" on products for select using (true);
// create policy "Public insert" on products for insert with check (true);
// create policy "Public delete" on products for delete using (true);
// create policy "Public read" on buyers for select using (true);
// create policy "Public insert" on buyers for insert with check (true);
// create policy "Public read" on orders for select using (true);
// create policy "Public insert" on orders for insert with check (true);

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",         icon: "🏪", lo: "ທັງໝົດ",        en: "All",         zh: "全部" },
  { id: "fashion",     icon: "👗", lo: "ເສື້ອຜ້າ",      en: "Fashion",     zh: "时尚" },
  { id: "electronics", icon: "📱", lo: "ເອເລັກໂຕຣນິກ",  en: "Electronics", zh: "电子" },
  { id: "beauty",      icon: "💄", lo: "ຄວາມງາມ",       en: "Beauty",      zh: "美妆" },
  { id: "food",        icon: "🍜", lo: "ອາຫານ",         en: "Food",        zh: "食品" },
  { id: "home",        icon: "🏠", lo: "ເຄື່ອງເຮືອນ",   en: "Home",        zh: "家居" },
  { id: "auto",        icon: "🚗", lo: "ອາໄຫຼ່ລົດ",      en: "Auto Parts",  zh: "汽车配件" },
  { id: "health",      icon: "💊", lo: "ສຸຂະພາບ",        en: "Health",      zh: "健康" },
];

const SHIPPERS = ["Anousith", "HAL Express", "Mixay Express"];

const DEMO_PRODUCTS = [
  { id: "d1", category: "fashion",     name_lo: "ເສື້ອຜ້າລາວໃໝ່",   name_en: "Lao Silk Dress",    name_zh: "老挝丝绸裙",  price: 85000,   emoji: "👗", seller_name: "ຮ້ານ ນາງຟ້າ",    rating: 4.8, sold: 124, badge: "🔥" },
  { id: "d2", category: "electronics", name_lo: "ໂທລະສັບ Samsung",   name_en: "Samsung A55",       name_zh: "三星A55",     price: 3200000, emoji: "📱", seller_name: "Tech Vientiane",  rating: 4.9, sold: 89,  badge: "✅" },
  { id: "d3", category: "beauty",      name_lo: "ຄຣີມຫນ້າໃສ",       name_en: "Whitening Cream",   name_zh: "美白霜",      price: 120000,  emoji: "💄", seller_name: "Beauty House",    rating: 4.7, sold: 310, badge: "🔥" },
  { id: "d4", category: "food",        name_lo: "ກາເຟລາວ",           name_en: "Lao Coffee 500g",   name_zh: "老挝咖啡",    price: 65000,   emoji: "☕", seller_name: "ກາເຟ ບໍລິຄຳໄຊ", rating: 5.0, sold: 502, badge: "⭐" },
  { id: "d5", category: "home",        name_lo: "ໂຄມໄຟ LED",         name_en: "LED Lamp Set",      name_zh: "LED灯组",     price: 95000,   emoji: "💡", seller_name: "Home Plus",       rating: 4.6, sold: 67,  badge: "" },
  { id: "d6", category: "beauty",      name_lo: "ນ້ຳຫອມ Dior",       name_en: "Dior Perfume 50ml", name_zh: "迪奥香水",    price: 850000,  emoji: "🌸", seller_name: "Luxe Laos",       rating: 5.0, sold: 28,  badge: "⭐" },
];

const L = {
  lo: { search:"ຄົ້ນຫາສິນຄ້າ...", cart:"ກະຕ່າ", buy:"ຊື້ດຽວນີ້", msg:"ສົ່ງຂໍ້ຄວາມ", sold:"ຂາຍແລ້ວ", shipper:"ເລືອກຂົນສົ່ງ", add:"ເພີ່ມໃສ່ກະຕ່າ", total:"ລວມ", checkout:"ຊຳລະ", empty:"ກະຕ່າຫວ່າງ", close:"ປິດ", pay:"ວິທີຊຳລະ", qr:"ສະແກນ QR ຊຳລະ", home:"ໜ້າຫຼັກ", sell:"ຂາຍ", dashboard:"ຈັດການ", save:"ບັນທຶກ", cancel:"ຍົກເລີກ", products:"ສິນຄ້າ", addProduct:"ເພີ່ມສິນຄ້າ", sellerReg:"ລົງທະບຽນຂາຍ", storeName:"ຊື່ຮ້ານ", phone:"ເບີໂທ", whatsapp:"WhatsApp", village:"ບ້ານ / ສາຂາ", mainCategory:"ໝວດຫຼັກ", qrLabel:"ຊື່ QR ໂອນເງິນ", price:"ລາຄາ (₭)", emoji:"Icon", productName:"ຊື່ສິນຄ້າ", desc:"ລາຍລະອຽດ", register:"ລົງທະບຽນ", myShop:"ຮ້ານຂອງຂ້ອຍ", orders:"ຄຳສັ່ງ", loading:"ກຳລັງໂຫຼດ...", login:"ເຂົ້າສູ່ລະບົບ", logout:"ອອກຈາກລະບົບ", password:"ລະຫັດຜ່ານ", loginTitle:"ເຂົ້າສູ່ລະບົບຮ້ານຄ້າ", noAccount:"ຍັງບໍ່ມີຮ້ານ?", createAccount:"ລົງທະບຽນຮ້ານໃໝ່", wrongLogin:"ເບີໂທ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ", productPhoto:"ຮູບສິນຄ້າ", uploadPhoto:"ກົດເພື່ອອັບໂຫຼດຮູບ", translating:"ກຳລັງແປ...", nameOneOnly:"ຂຽນຊື່ສິນຄ້າພາສາໃດກໍໄດ້ ລະບົບຈະແປໃຫ້ອັດຕະໂນມັດ" },
  en: { search:"Search products...", cart:"Cart", buy:"Buy Now", msg:"Message", sold:"sold", shipper:"Choose Shipper", add:"Add to Cart", total:"Total", checkout:"Checkout", empty:"Cart is empty", close:"Close", pay:"Payment", qr:"Scan QR to Pay", home:"Home", sell:"Sell", dashboard:"Manage", save:"Save", cancel:"Cancel", products:"Products", addProduct:"Add Product", sellerReg:"Become a Seller", storeName:"Store Name", phone:"Phone", whatsapp:"WhatsApp", village:"Village / Branch", mainCategory:"Main Category", qrLabel:"QR Payment Name", price:"Price (₭)", emoji:"Icon", productName:"Product Name", desc:"Description", register:"Register", myShop:"My Shop", orders:"Orders", loading:"Loading...", login:"Login", logout:"Logout", password:"Password", loginTitle:"Seller Login", noAccount:"No shop yet?", createAccount:"Register a new shop", wrongLogin:"Wrong phone or password", productPhoto:"Product Photo", uploadPhoto:"Tap to upload photo", translating:"Translating...", nameOneOnly:"Write the product name in any language — we'll auto-translate it" },
  zh: { search:"搜索商品...", cart:"购物车", buy:"立即购买", msg:"发消息", sold:"已售", shipper:"选择快递", add:"加入购物车", total:"合计", checkout:"结算", empty:"购物车为空", close:"关闭", pay:"付款方式", qr:"扫码支付", home:"首页", sell:"卖货", dashboard:"管理", save:"保存", cancel:"取消", products:"商品", addProduct:"添加商品", sellerReg:"成为卖家", storeName:"店铺名称", phone:"电话", whatsapp:"WhatsApp", village:"村/分支", mainCategory:"主要类别", qrLabel:"QR收款名称", price:"价格 (₭)", emoji:"图标", productName:"商品名称", desc:"描述", register:"注册", myShop:"我的店", orders:"订单", loading:"加载中...", login:"登录", logout:"退出登录", password:"密码", loginTitle:"卖家登录", noAccount:"还没有店铺？", createAccount:"注册新店铺", wrongLogin:"电话或密码错误", productPhoto:"商品照片", uploadPhoto:"点击上传照片", translating:"翻译中...", nameOneOnly:"用任意语言输入商品名称，系统会自动翻译" },
};

const fmt = (n) => n >= 1000000 ? (n/1000000).toFixed(1)+"M ₭" : n >= 1000 ? (n/1000).toFixed(0)+"K ₭" : n+" ₭";
const EMOJIS = ["👗","👜","👟","👒","💄","💅","🌸","💍","📱","💻","🎧","📷","🖥️","☕","🍜","🥜","🧃","🍱","💡","🛏️","🪴","🧹","🏠","🎁","📦"];

// ─── STYLES ──────────────────────────────────────────────────────────────────
const btn = (bg="#e8401c", color="#fff", extra={}) => ({
  background: bg, color, border:"none", borderRadius:12, padding:"12px 0",
  fontWeight:800, fontSize:14, cursor:"pointer", width:"100%", ...extra
});
const input = (extra={}) => ({
  width:"100%", padding:"10px 14px", borderRadius:10, border:"1.5px solid #e8e8e8",
  fontSize:13, outline:"none", boxSizing:"border-box", background:"#fafafa", ...extra
});
const label = { fontSize:11, color:"#888", marginBottom:4, display:"block", fontWeight:600 };

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ p, lang, onAdd, onDetail }) {
  const t = L[lang];
  const name = p[`name_${lang}`] || p.name_en || p.name_lo;
  return (
    <div onClick={() => onDetail(p)} style={{
      background:"#fff", borderRadius:16, overflow:"hidden",
      boxShadow:"0 2px 12px rgba(0,0,0,0.07)", cursor:"pointer",
      transition:"transform .15s", display:"flex", flexDirection:"column"
    }}
    onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"}
    onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}
    >
      <div style={{ background:"linear-gradient(135deg,#fff8f0,#fff0f8)", fontSize:52, textAlign:"center", padding: p.image?0:"22px 0", position:"relative", overflow:"hidden", height: p.image?120:"auto" }}>
        {p.image
          ? <img src={p.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          : (p.emoji || "📦")
        }
        {p.badge && <span style={{ position:"absolute", top:8, right:8, background:"#ff4d4d", color:"#fff", borderRadius:20, fontSize:10, padding:"2px 7px", fontWeight:700 }}>{p.badge}</span>}
      </div>
      <div style={{ padding:"12px 14px", flex:1, display:"flex", flexDirection:"column", gap:3 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", lineHeight:1.3 }}>{name}</div>
        <div style={{ fontSize:11, color:"#999" }}>🏪 {p.seller_name || "—"}</div>
        {p.rating && <div style={{ fontSize:11, color:"#f5a623" }}>{"★".repeat(Math.floor(p.rating))} <span style={{color:"#bbb"}}>{p.sold} {t.sold}</span></div>}
        <div style={{ fontWeight:800, color:"#e8401c", fontSize:15, marginTop:4 }}>{fmt(p.price)}</div>
        <button onClick={e=>{e.stopPropagation();onAdd(p);}} style={{ ...btn("linear-gradient(90deg,#ff6b35,#e8401c)"), marginTop:8, padding:"8px 0", fontSize:12 }}>{t.add}</button>
      </div>
    </div>
  );
}

// ─── CART DRAWER ─────────────────────────────────────────────────────────────
function CartDrawer({ cart, lang, onClose, onQty }) {
  const t = L[lang];
  const [shipper, setShipper] = useState("");
  const [village, setVillage] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [qrIndex, setQrIndex] = useState(0);

  // group cart items by seller
  const groups = cart.reduce((acc, item) => {
    const key = item.seller_id || item.seller_name || "unknown";
    if (!acc[key]) acc[key] = { seller_name: item.seller_name || "—", qr_image: item.qr_image || null, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {});
  const sellerGroups = Object.values(groups);
  const grandTotal = cart.reduce((s,i) => s+i.price*i.qty, 0);

  const isMultiSeller = sellerGroups.length > 1;
  const currentGroup = sellerGroups[qrIndex];
  const currentGroupTotal = currentGroup ? currentGroup.items.reduce((s,i)=>s+i.price*i.qty,0) : 0;

  const txt = {
    village: lang==="lo"?"ບ້ານທີ່ຈະຮັບເຄື່ອງ":lang==="en"?"Delivery village":"收货村庄",
    villagePh: lang==="lo"?"ປ້ອນຊື່ບ້ານ...":lang==="en"?"Enter your village...":"输入村庄名称...",
    payFrom: lang==="lo"?"ຊຳລະຮ້ານທີ":lang==="en"?"Pay seller":"支付卖家",
    of: lang==="lo"?"ໃນ":lang==="en"?"of":"/",
    next: lang==="lo"?"ຮ້ານຕໍ່ໄປ":lang==="en"?"Next seller":"下一个卖家",
    done: lang==="lo"?"ສຳເລັດ":lang==="en"?"Done":"完成",
    subtotal: lang==="lo"?"ລວມຍ່ອຍ":lang==="en"?"Subtotal":"小计",
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex" }}>
      <div onClick={onClose} style={{ flex:1, background:"rgba(0,0,0,0.45)" }}/>
      <div style={{ width:340, background:"#fff", display:"flex", flexDirection:"column", boxShadow:"-4px 0 24px rgba(0,0,0,0.15)" }}>
        <div style={{ padding:"18px 20px", background:"linear-gradient(90deg,#ff6b35,#e8401c)", color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontWeight:800, fontSize:18 }}>🛒 {t.cart}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#fff", fontSize:24, cursor:"pointer" }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:16 }}>
          {cart.length === 0
            ? <div style={{ textAlign:"center", color:"#bbb", marginTop:60 }}>🛒<br/><span style={{fontSize:13}}>{t.empty}</span></div>
            : sellerGroups.map((group, gi) => {
              const subtotal = group.items.reduce((s,i)=>s+i.price*i.qty,0);
              return (
                <div key={gi} style={{ border:"1.5px solid #f0f0f0", borderRadius:14, overflow:"hidden" }}>
                  <div style={{ background:"#fff5f3", padding:"8px 12px", display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{fontSize:13}}>🏪</span>
                    <span style={{fontSize:12,fontWeight:700,color:"#e8401c"}}>{group.seller_name}</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8, padding:10 }}>
                    {group.items.map(item => {
                      const name = item[`name_${lang}`] || item.name_en || item.name_lo;
                      return (
                        <div key={item.id} style={{ display:"flex", gap:10, alignItems:"center", background:"#fafafa", borderRadius:12, padding:8 }}>
                          <span style={{fontSize:26}}>{item.emoji||"📦"}</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,fontWeight:600}}>{name}</div>
                            <div style={{fontSize:12,color:"#e8401c",fontWeight:700}}>{fmt(item.price)}</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <button onClick={()=>onQty(item.id,-1)} style={{width:24,height:24,borderRadius:7,border:"1.5px solid #e0e0e0",background:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>−</button>
                            <span style={{fontSize:12,fontWeight:700,minWidth:18,textAlign:"center"}}>{item.qty}</span>
                            <button onClick={()=>onQty(item.id,1)} style={{width:24,height:24,borderRadius:7,border:"1.5px solid #e0e0e0",background:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding:"8px 12px", borderTop:"1px dashed #eee", display:"flex", justifyContent:"space-between" }}>
                    <span style={{fontSize:11,color:"#888",fontWeight:600}}>{txt.subtotal}</span>
                    <span style={{fontSize:13,fontWeight:800,color:"#e8401c"}}>{fmt(subtotal)}</span>
                  </div>
                </div>
              );
            })
          }
        </div>
        {cart.length > 0 && (
          <div style={{ padding:16, borderTop:"1px solid #f0f0f0" }}>
            <div style={{fontSize:11,color:"#888",marginBottom:6}}>{txt.village}</div>
            <input value={village} onChange={e=>setVillage(e.target.value)} placeholder={txt.villagePh} style={{
              width:"100%", padding:"9px 12px", borderRadius:10, border:"1.5px solid #e8e8e8",
              fontSize:12, outline:"none", boxSizing:"border-box", background:"#fafafa", marginBottom:14
            }}/>
            <div style={{fontSize:11,color:"#888",marginBottom:8}}>{t.shipper}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
              {SHIPPERS.map(s=>(
                <button key={s} onClick={()=>setShipper(s)} style={{ padding:"5px 10px", borderRadius:8, fontSize:11, cursor:"pointer", border:shipper===s?"2px solid #e8401c":"1.5px solid #e0e0e0", background:shipper===s?"#fff5f3":"#fff", color:shipper===s?"#e8401c":"#555", fontWeight:shipper===s?700:400 }}>{s}</button>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontWeight:600,color:"#555"}}>{t.total}</span>
              <span style={{fontWeight:800,color:"#e8401c",fontSize:18}}>{fmt(grandTotal)}</span>
            </div>
            <button onClick={()=>{setQrIndex(0);setShowQR(true);}} style={btn("linear-gradient(90deg,#ff6b35,#e8401c)")}>{t.checkout} →</button>
          </div>
        )}
      </div>
      {showQR && currentGroup && (
        <div style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div style={{ background:"#fff",borderRadius:20,padding:32,textAlign:"center",maxWidth:300,width:"90%",boxShadow:"0 8px 40px rgba(0,0,0,0.2)" }}>
            {isMultiSeller && (
              <div style={{fontSize:11,color:"#aaa",fontWeight:700,marginBottom:8}}>{qrIndex+1} {txt.of} {sellerGroups.length}</div>
            )}
            <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>💳 {txt.payFrom}</div>
            <div style={{fontSize:13,color:"#e8401c",fontWeight:700,marginBottom:16}}>🏪 {currentGroup.seller_name}</div>
            {currentGroup.qr_image
              ? <img src={currentGroup.qr_image} alt="QR" style={{width:180,height:180,objectFit:"contain",margin:"0 auto 20px",display:"block",borderRadius:12,border:"1px solid #f0f0f0"}}/>
              : <div style={{ width:160,height:160,margin:"0 auto 20px",background:"linear-gradient(135deg,#1a1a2e,#16213e)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:60 }}>📲</div>
            }
            <div style={{fontWeight:800,color:"#e8401c",fontSize:24,marginBottom:4}}>{fmt(currentGroupTotal)}</div>
            {shipper && <div style={{fontSize:12,color:"#888"}}>📦 {shipper}{village?` · ${village}`:""}</div>}
            <div style={{marginTop:16}}>
              {isMultiSeller && qrIndex < sellerGroups.length - 1
                ? <button onClick={()=>setQrIndex(i=>i+1)} style={btn("linear-gradient(90deg,#ff6b35,#e8401c)")}>{txt.next} →</button>
                : <button onClick={()=>{setShowQR(false);onClose();}} style={btn()}>{txt.done} ✓</button>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function DetailModal({ p, lang, onClose, onAdd }) {
  const t = L[lang];
  const name = p[`name_${lang}`] || p.name_en || p.name_lo;
  const [shipper, setShipper] = useState("");
  return (
    <div style={{ position:"fixed",inset:0,zIndex:90,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:"24px 24px 0 0",padding:24,width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto" }}>
        <div style={{fontSize:80,textAlign:"center",background:"linear-gradient(135deg,#fff8f0,#fff0f8)",borderRadius:16,padding: p.image?0:"20px 0",marginBottom:16,overflow:"hidden",height: p.image?220:"auto"}}>
          {p.image
            ? <img src={p.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            : (p.emoji||"📦")
          }
        </div>
        <div style={{fontWeight:800,fontSize:20,marginBottom:4}}>{name}</div>
        <div style={{fontSize:13,color:"#888",marginBottom:8}}>🏪 {p.seller_name||"—"}</div>
        {p.description && <div style={{fontSize:13,color:"#555",marginBottom:12,lineHeight:1.5}}>{p.description}</div>}
        {p.rating && <div style={{color:"#f5a623",fontSize:14,marginBottom:12}}>{"★".repeat(Math.floor(p.rating))} {p.rating} · {p.sold} {t.sold}</div>}
        <div style={{fontWeight:800,color:"#e8401c",fontSize:28,marginBottom:16}}>{fmt(p.price)}</div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,color:"#888",marginBottom:8}}>{t.shipper}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {SHIPPERS.map(s=>(
              <button key={s} onClick={()=>setShipper(s)} style={{ padding:"6px 12px",borderRadius:10,fontSize:11,cursor:"pointer", border:shipper===s?"2px solid #e8401c":"1.5px solid #e0e0e0", background:shipper===s?"#fff5f3":"#fff", color:shipper===s?"#e8401c":"#555",fontWeight:shipper===s?700:400 }}>{s}</button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>{onAdd(p);onClose();}} style={btn("linear-gradient(90deg,#ff6b35,#e8401c)",undefined,{flex:1})}>{t.buy}</button>
          <button onClick={onClose} style={btn("#fff","#555",{flex:"0 0 auto",padding:"12px 18px",border:"1.5px solid #e0e0e0",width:"auto"})}>{t.msg} 💬</button>
        </div>
      </div>
    </div>
  );
}

// ─── SELLER REGISTRATION ──────────────────────────────────────────────────────
// ─── SELLER LOGIN ─────────────────────────────────────────────────────────────
function SellerLoginModal({ lang, onClose, onSuccess, onGoRegister }) {
  const t = L[lang];
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!phone || !password) { setError(t.wrongLogin); return; }
    setLoading(true); setError("");
    try {
      const data = await sbFetch(`sellers?phone=eq.${encodeURIComponent(phone)}&password=eq.${encodeURIComponent(password)}`);
      if (data && data.length > 0) {
        onSuccess(data[0]);
      } else {
        setError(t.wrongLogin);
      }
    } catch(e) {
      setError(t.wrongLogin);
    }
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:150,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:380 }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontWeight:900,fontSize:18}}>🔐 {t.loginTitle}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#999"}}>×</button>
        </div>
        {error && <div style={{background:"#fff0f0",color:"#e8401c",borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12}}>{error}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <span style={label}>{t.phone}</span>
            <input style={input()} placeholder="020 XXXX XXXX" value={phone} onChange={e=>setPhone(e.target.value)}/>
          </div>
          <div>
            <span style={label}>{t.password}</span>
            <input style={input()} type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
          <button onClick={submit} disabled={loading} style={btn(loading?"#ccc":"linear-gradient(90deg,#ff6b35,#e8401c)")}>
            {loading ? t.loading : `🔓 ${t.login}`}
          </button>
          <div style={{textAlign:"center",fontSize:12,color:"#888"}}>
            {t.noAccount} <span onClick={onGoRegister} style={{color:"#e8401c",fontWeight:700,cursor:"pointer"}}>{t.createAccount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SellerRegModal({ lang, onClose, onSuccess }) {
  const t = L[lang];
  const [form, setForm] = useState({ name:"", phone:"", password:"", whatsapp:"", village:"", shipper:"Anousith", qr_label:"", qr_image:"", category:"fashion" });
  const [qrPreview, setQrPreview] = useState("");

  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setQrPreview(ev.target.result);
      set("qr_image", ev.target.result);
    };
    reader.readAsDataURL(file);
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    if (!form.name || !form.phone || !form.password) { setError("ຊື່ຮ້ານ + ເບີໂທ + ລະຫັດຜ່ານ ຈຳເປັນ / Store name + phone + password required"); return; }
    setLoading(true); setError("");
    try {
      const data = await sbFetch("sellers", { method:"POST", body: JSON.stringify(form) });
      onSuccess(data[0]);
    } catch(e) {
      // Demo mode if Supabase not configured
      onSuccess({ ...form, id: "demo-" + Date.now() });
    }
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:150,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontWeight:900,fontSize:18}}>🏪 {t.sellerReg}</div>
            <div style={{fontSize:11,color:"#888",marginTop:2}}>0% commission · 3 ເດືອນທຳອິດ</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#999"}}>×</button>
        </div>

        {error && <div style={{background:"#fff0f0",color:"#e8401c",borderRadius:10,padding:"8px 12px",fontSize:12,marginBottom:12}}>{error}</div>}

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <span style={label}>{t.storeName} *</span>
            <input style={input()} placeholder="ຮ້ານ ນາງຟ້າ / Beauty House" value={form.name} onChange={e=>set("name",e.target.value)}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <span style={label}>{t.phone} *</span>
              <input style={input()} placeholder="020 XXXX XXXX" value={form.phone} onChange={e=>set("phone",e.target.value)}/>
            </div>
            <div>
              <span style={label}>{t.password} *</span>
              <input style={input()} type="password" placeholder="••••••••" value={form.password} onChange={e=>set("password",e.target.value)}/>
            </div>
          </div>
          <div>
            <span style={label}>{t.whatsapp}</span>
            <input style={input()} placeholder="020 XXXX XXXX" value={form.whatsapp} onChange={e=>set("whatsapp",e.target.value)}/>
          </div>
          <div>
            <span style={label}>{t.village}</span>
            <input style={input()} placeholder="ບ້ານ ໂພນຕ້ອງ, ວຽງຈັນ" value={form.village} onChange={e=>set("village",e.target.value)}/>
          </div>
          <div>
            <span style={label}>{t.mainCategory}</span>
            <select style={{...input(),appearance:"none"}} value={form.category} onChange={e=>set("category",e.target.value)}>
              {CATEGORIES.filter(c=>c.id!=="all").map(c=>(
                <option key={c.id} value={c.id}>{c.icon} {c[lang]}</option>
              ))}
            </select>
          </div>
          <div>
            <span style={label}>{t.shipper}</span>
            <div style={{display:"flex",gap:8}}>
              {SHIPPERS.map(s=>(
                <button key={s} onClick={()=>set("shipper",s)} style={{ flex:1,padding:"8px 4px",borderRadius:10,fontSize:11,cursor:"pointer",fontWeight:600, border:form.shipper===s?"2px solid #e8401c":"1.5px solid #e0e0e0", background:form.shipper===s?"#fff5f3":"#fff", color:form.shipper===s?"#e8401c":"#555" }}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <span style={label}>{t.qrLabel}</span>
            <input style={input()} placeholder="ຊື່ທີ່ສະແດງໃນ QR / Your payment name" value={form.qr_label} onChange={e=>set("qr_label",e.target.value)}/>
          </div>
          <div>
            <span style={label}>📸 {lang==="lo"?"ຮູບ QR ຊຳລະເງິນ":lang==="en"?"QR Payment Photo":"收款二维码图片"}</span>
            <label style={{
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              border:"2px dashed #e8e8e8", borderRadius:14, padding:"16px 0", cursor:"pointer",
              background: qrPreview?"#fff":"#fafafa", gap:8, transition:"border .2s",
              minHeight: qrPreview ? "auto" : 100
            }}>
              {qrPreview
                ? <img src={qrPreview} alt="QR" style={{width:160,height:160,objectFit:"contain",borderRadius:10}}/>
                : <>
                    <span style={{fontSize:36}}>📲</span>
                    <span style={{fontSize:12,color:"#aaa"}}>{lang==="lo"?"ກົດເພື່ອອັບໂຫຼດ QR":lang==="en"?"Tap to upload QR photo":"点击上传二维码"}</span>
                  </>
              }
              <input type="file" accept="image/*" onChange={handleQrUpload} style={{display:"none"}}/>
            </label>
            {qrPreview && (
              <button onClick={()=>{setQrPreview("");set("qr_image","");}} style={{marginTop:6,background:"none",border:"1.5px solid #ffd0d0",color:"#e8401c",borderRadius:8,padding:"4px 12px",cursor:"pointer",fontSize:11,fontWeight:600}}>
                ✕ {lang==="lo"?"ລຶບຮູບ":lang==="en"?"Remove":"删除"}
              </button>
            )}
          </div>

          <div style={{background:"#f0fff4",borderRadius:12,padding:"12px 14px",fontSize:12,color:"#2d6a4f",marginTop:4}}>
            ✅ 0% commission 3 ເດືອນທຳອິດ<br/>
            ✅ ໂປຣໄຟລ໌ຂອງທ່ານຈະຖືກສ້າງທັນທີ<br/>
            ✅ ສາມາດເພີ່ມສິນຄ້າໄດ້ທຸກຊະນິດ
          </div>

          <button onClick={submit} disabled={loading} style={btn(loading?"#ccc":"linear-gradient(90deg,#ff6b35,#e8401c)")}>
            {loading ? t.loading : `🚀 ${t.register}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SELLER DASHBOARD ─────────────────────────────────────────────────────────
function SellerDashboard({ seller, lang, onClose }) {
  const t = L[lang];
  const [products, setProducts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [form, setForm] = useState({ name_input:"", name_lo:"", name_en:"", name_zh:"", price:"", category:"fashion", emoji:"📦", image:"", description:"", badge:"" });
  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setF("image", ev.target.result);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await sbFetch(`products?seller_id=eq.${seller.id}&order=created_at.desc`);
        setProducts(data || []);
      } catch { setProducts([]); }
      setLoading(false);
    };
    load();
  }, [seller.id]);

  const addProduct = async () => {
    if (!form.name_input.trim()) return;
    setTranslating(true);
    let names = { lo: form.name_input, en: form.name_input, zh: form.name_input };
    const translated = await translateProductName(form.name_input, lang);
    if (translated) names = translated;
    setTranslating(false);

    const payload = {
      name_lo: names.lo, name_en: names.en, name_zh: names.zh,
      price: parseInt(form.price)||0, category: form.category, emoji: form.emoji,
      image: form.image, description: form.description, badge: form.badge,
      seller_id: seller.id, seller_name: seller.name
    };
    try {
      const data = await sbFetch("products", { method:"POST", body: JSON.stringify(payload) });
      setProducts(p => [data[0], ...p]);
    } catch {
      // Demo mode
      setProducts(p => [{ ...payload, id:"demo-"+Date.now() }, ...p]);
    }
    setForm({ name_input:"", name_lo:"", name_en:"", name_zh:"", price:"", category:"fashion", emoji:"📦", image:"", description:"", badge:"" });
    setShowAdd(false);
  };

  const deleteProduct = async (id) => {
    try { await sbFetch(`products?id=eq.${id}`, { method:"DELETE" }); } catch {}
    setProducts(p => p.filter(x => x.id !== id));
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:140,background:"#f7f7f9",overflowY:"auto" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(90deg,#ff6b35,#e8401c)",padding:"16px 20px",color:"#fff",position:"sticky",top:0,zIndex:10 }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:900,fontSize:17}}>🏪 {seller.name}</div>
            <div style={{fontSize:11,opacity:.8}}>📞 {seller.phone} · 📦 {seller.shipper}</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:10,padding:"8px 14px",cursor:"pointer",fontWeight:700}}>← {t.home}</button>
        </div>
      </div>

      <div style={{padding:16,maxWidth:600,margin:"0 auto"}}>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
          {[
            { icon:"📦", label:t.products, value:products.length },
            { icon:"💰", label:"Revenue", value:"—" },
            { icon:"⭐", label:"Rating", value:"5.0" },
          ].map((s,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:14,padding:"14px 12px",textAlign:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <div style={{fontSize:24}}>{s.icon}</div>
              <div style={{fontWeight:800,fontSize:20,color:"#1a1a1a"}}>{s.value}</div>
              <div style={{fontSize:11,color:"#888"}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* QR Info */}
        {(seller.qr_label || seller.qr_image) && (
          <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",display:"flex",alignItems:"center",gap:16}}>
            {seller.qr_image
              ? <img src={seller.qr_image} alt="QR" style={{width:70,height:70,objectFit:"contain",borderRadius:10,border:"1px solid #f0f0f0"}}/>
              : <div style={{width:60,height:60,background:"linear-gradient(135deg,#1a1a2e,#16213e)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>📲</div>
            }
            <div>
              <div style={{fontWeight:700,fontSize:14}}>{seller.qr_label||"QR Payment"}</div>
              <div style={{fontSize:12,color:"#888"}}>QR ໂອນເງິນ · {seller.village||"Vientiane"}</div>
            </div>
          </div>
        )}

        {/* Add Product */}
        <button onClick={()=>setShowAdd(s=>!s)} style={{...btn("linear-gradient(90deg,#ff6b35,#e8401c)",undefined,{marginBottom:16})}}>
          {showAdd ? `✕ ${t.cancel}` : `+ ${t.addProduct}`}
        </button>

        {showAdd && (
          <div style={{background:"#fff",borderRadius:16,padding:20,marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
            <div style={{fontWeight:800,fontSize:15,marginBottom:16}}>➕ {t.addProduct}</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <span style={label}>📸 {t.productPhoto}</span>
                <label style={{
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  border:"2px dashed #e8e8e8", borderRadius:14, padding:"16px 0", cursor:"pointer",
                  background: form.image?"#fff":"#fafafa", gap:8, minHeight: form.image ? "auto" : 90
                }}>
                  {form.image
                    ? <img src={form.image} alt="product" style={{width:140,height:140,objectFit:"cover",borderRadius:10}}/>
                    : <><span style={{fontSize:32}}>📷</span><span style={{fontSize:12,color:"#aaa"}}>{t.uploadPhoto}</span></>
                  }
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{display:"none"}}/>
                </label>
                {form.image && (
                  <button onClick={()=>setF("image","")} style={{marginTop:6,background:"none",border:"1.5px solid #ffd0d0",color:"#e8401c",borderRadius:8,padding:"4px 12px",cursor:"pointer",fontSize:11,fontWeight:600}}>
                    ✕ {lang==="lo"?"ລຶບຮູບ":lang==="en"?"Remove":"删除"}
                  </button>
                )}
              </div>
              <div>
                <span style={label}>{t.emoji}</span>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {EMOJIS.map(e=>(
                    <button key={e} onClick={()=>setF("emoji",e)} style={{ fontSize:20,width:38,height:38,borderRadius:10,cursor:"pointer", border:form.emoji===e?"2px solid #e8401c":"1.5px solid #e8e8e8", background:form.emoji===e?"#fff5f3":"#fafafa" }}>{e}</button>
                  ))}
                </div>
              </div>
              <div>
                <span style={label}>{t.productName}</span>
                <input style={input()} placeholder={lang==="lo"?"ຊື່ສິນຄ້າ...":lang==="en"?"Product name...":"商品名称..."} value={form.name_input} onChange={e=>setF("name_input",e.target.value)}/>
                <div style={{fontSize:10,color:"#aaa",marginTop:4}}>✨ {t.nameOneOnly}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <span style={label}>{t.price}</span>
                  <input style={input()} type="number" placeholder="85000" value={form.price} onChange={e=>setF("price",e.target.value)}/>
                </div>
                <div>
                  <span style={label}>{t.mainCategory}</span>
                  <select style={{...input(),appearance:"none"}} value={form.category} onChange={e=>setF("category",e.target.value)}>
                    {CATEGORIES.filter(c=>c.id!=="all").map(c=>(
                      <option key={c.id} value={c.id}>{c.icon} {c[lang]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <span style={label}>{t.desc}</span>
                <textarea style={{...input(),height:70,resize:"none"}} placeholder="ລາຍລະອຽດສິນຄ້າ..." value={form.description} onChange={e=>setF("description",e.target.value)}/>
              </div>
              <div>
                <span style={label}>Badge (🔥 ⭐ ✅ ຫຼື ປ່ອຍຫວ່າງ)</span>
                <div style={{display:"flex",gap:8}}>
                  {["","🔥","⭐","✅"].map(b=>(
                    <button key={b} onClick={()=>setF("badge",b)} style={{ flex:1,padding:"8px 4px",borderRadius:10,fontSize:16,cursor:"pointer", border:form.badge===b?"2px solid #e8401c":"1.5px solid #e0e0e0", background:form.badge===b?"#fff5f3":"#fff" }}>{b||"—"}</button>
                  ))}
                </div>
              </div>
              <button onClick={addProduct} disabled={translating} style={btn(translating?"#ccc":"linear-gradient(90deg,#ff6b35,#e8401c)")}>
                {translating ? `🌐 ${t.translating}` : `${t.save} ✓`}
              </button>
            </div>
          </div>
        )}

        {/* Products list */}
        <div style={{fontWeight:800,fontSize:15,marginBottom:10}}>📦 {t.products} ({products.length})</div>
        {loading
          ? <div style={{textAlign:"center",color:"#bbb",padding:40}}>{t.loading}</div>
          : products.length === 0
            ? <div style={{textAlign:"center",color:"#bbb",padding:40,background:"#fff",borderRadius:16}}>
                <div style={{fontSize:40}}>📭</div>
                <div style={{fontSize:13,marginTop:8}}>ຍັງບໍ່ມີສິນຄ້າ · No products yet</div>
              </div>
            : <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {products.map(p=>(
                  <div key={p.id} style={{background:"#fff",borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                    <span style={{fontSize:36}}>{p.emoji||"📦"}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13}}>{p[`name_${lang}`]||p.name_en||p.name_lo}</div>
                      <div style={{fontSize:12,color:"#e8401c",fontWeight:700}}>{fmt(p.price)}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>{CATEGORIES.find(c=>c.id===p.category)?.[lang]||p.category}</div>
                    </div>
                    {p.badge && <span>{p.badge}</span>}
                    <button onClick={()=>deleteProduct(p.id)} style={{background:"none",border:"1.5px solid #ffd0d0",color:"#e8401c",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:12,fontWeight:600}}>✕</button>
                  </div>
                ))}
              </div>
        }
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang]             = useState("lo");
  const [cat, setCat]               = useState("all");
  const [search, setSearch]         = useState("");
  const [cart, setCart]             = useState([]);
  const [showCart, setShowCart]     = useState(false);
  const [detail, setDetail]         = useState(null);
  const [showSellerReg, setShowSellerReg] = useState(false);
  const [showSellerLogin, setShowSellerLogin] = useState(false);
  const [currentSeller, setCurrentSeller] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [activeTab, setActiveTab]   = useState("home"); // home | sell

  const t = L[lang];

  useEffect(() => {
    const load = async () => {
      try {
        const data = await sbFetch("products?order=created_at.desc&limit=50");
        if (data && data.length > 0) setDbProducts(data);
      } catch {}
    };
    load();
  }, []);

  const allProducts = [...dbProducts, ...DEMO_PRODUCTS];
  const filtered = allProducts.filter(p =>
    (cat === "all" || p.category === cat) &&
    (search === "" || [p.name_lo,p.name_en,p.name_zh].some(n=>n&&n.toLowerCase().includes(search.toLowerCase())))
  );

  const addToCart = (p) => {
    setCart(prev => {
      const ex = prev.find(i=>i.id===p.id);
      if (ex) return prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i);
      return [...prev, {...p, qty:1}];
    });
  };
  const updateQty = (id,delta) => setCart(prev=>prev.map(i=>i.id===id?{...i,qty:i.qty+delta}:i).filter(i=>i.qty>0));
  const cartCount = cart.reduce((s,i)=>s+i.qty,0);

  if (currentSeller && activeTab === "sell") {
    return <SellerDashboard seller={currentSeller} lang={lang} onClose={()=>{ setActiveTab("home"); }}/>;
  }

  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif", background:"#f7f7f9", minHeight:"100vh" }}>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(90deg,#ff6b35,#e8401c)", padding:"14px 16px", position:"sticky", top:0, zIndex:50, boxShadow:"0 2px 12px rgba(232,64,28,0.25)" }}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{color:"#fff",fontWeight:900,fontSize:22,letterSpacing:-0.5}}>
              🛒 <span style={{background:"rgba(255,255,255,0.2)",borderRadius:8,padding:"2px 10px"}}>LAO MARKET</span>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {["lo","en","zh"].map(l=>(
                <button key={l} onClick={()=>setLang(l)} style={{ padding:"4px 9px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:11, background:lang===l?"#fff":"rgba(255,255,255,0.2)", color:lang===l?"#e8401c":"#fff" }}>{l.toUpperCase()}</button>
              ))}
              {currentSeller
                ? <button onClick={()=>{setCurrentSeller(null);setActiveTab("home");}} style={{ background:"rgba(255,255,255,0.2)",border:"none",borderRadius:12,padding:"8px 10px",cursor:"pointer",fontWeight:700,color:"#fff",fontSize:11 }}>🔓 {t.logout}</button>
                : <button onClick={()=>setShowSellerLogin(true)} style={{ background:"rgba(255,255,255,0.2)",border:"none",borderRadius:12,padding:"8px 10px",cursor:"pointer",fontWeight:700,color:"#fff",fontSize:11 }}>👤 {t.login}</button>
              }
              <button onClick={()=>setShowCart(true)} style={{ background:"#fff",border:"none",borderRadius:12,padding:"8px 12px",cursor:"pointer",fontWeight:800,color:"#e8401c",display:"flex",alignItems:"center",gap:4 }}>
                🛒{cartCount>0&&<span style={{background:"#e8401c",color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800}}>{cartCount}</span>}
              </button>
            </div>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search} style={{width:"100%",padding:"10px 16px",borderRadius:12,border:"none",fontSize:14,outline:"none",boxSizing:"border-box",boxShadow:"0 2px 8px rgba(0,0,0,0.1)"}}/>
        </div>
      </div>

      {/* CATEGORIES */}
      <div style={{background:"#fff",borderBottom:"1px solid #f0f0f0",overflowX:"auto",whiteSpace:"nowrap"}}>
        <div style={{padding:"10px 16px",display:"inline-flex",gap:8}}>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>setCat(c.id)} style={{ padding:"7px 16px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:600,fontSize:13,whiteSpace:"nowrap", background:cat===c.id?"linear-gradient(90deg,#ff6b35,#e8401c)":"#f5f5f5", color:cat===c.id?"#fff":"#555", boxShadow:cat===c.id?"0 2px 8px rgba(232,64,28,0.3)":"none" }}>
              {c.icon} {c[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* BANNER */}
      <div style={{maxWidth:900,margin:"16px auto",padding:"0 16px"}}>
        <div style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",borderRadius:20,padding:"22px 24px",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center",overflow:"hidden",position:"relative" }}>
          <div style={{position:"absolute",right:-10,top:-10,fontSize:110,opacity:.07}}>🛒</div>
          <div>
            <div style={{fontSize:10,color:"#ff6b35",fontWeight:700,marginBottom:4,letterSpacing:2}}>
              {lang==="lo"?"ຕະຫຼາດອອນລາຍ #1 ລາວ":lang==="en"?"LAOS #1 ONLINE MARKET":"老挝第一网购平台"}
            </div>
            <div style={{fontSize:20,fontWeight:900,lineHeight:1.2}}>
              {lang==="lo"?"ຊື້ງ່າຍ ສົ່ງໄວ":lang==="en"?"Buy Easy, Ship Fast":"轻松购物，快速配送"}
            </div>
            <div style={{fontSize:11,color:"#aaa",marginTop:6}}>Anousith · HAL · Mixay Express</div>
          </div>
          <div style={{fontSize:56}}>🚀</div>
        </div>
      </div>

      {/* SELL BANNER */}
      {!currentSeller && (
        <div style={{maxWidth:900,margin:"0 16px 16px",padding:"0"}}>
          <div onClick={()=>setShowSellerReg(true)} style={{ background:"linear-gradient(135deg,#f0fff4,#e8f5e9)",borderRadius:16,padding:"16px 20px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",border:"1.5px dashed #52c41a" }}>
            <div>
              <div style={{fontWeight:800,color:"#2d6a4f",fontSize:14}}>🏪 {t.sellerReg}</div>
              <div style={{fontSize:12,color:"#52c41a",marginTop:2}}>0% commission · ລົງທະບຽນຟຣີ</div>
            </div>
            <span style={{fontSize:28}}>→</span>
          </div>
        </div>
      )}

      {/* PRODUCTS */}
      <div style={{maxWidth:900,margin:"0 auto",padding:"0 16px 100px"}}>
        <div style={{fontSize:13,color:"#888",marginBottom:12}}>{filtered.length} {lang==="lo"?"ສິນຄ້າ":lang==="en"?"products":"商品"}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(158px,1fr))",gap:14}}>
          {filtered.map(p=>(
            <ProductCard key={p.id} p={p} lang={lang} onAdd={addToCart} onDetail={setDetail}/>
          ))}
        </div>
        {filtered.length===0&&(
          <div style={{textAlign:"center",color:"#bbb",padding:"60px 0",fontSize:40}}>
            🔍<br/><span style={{fontSize:14}}>{lang==="lo"?"ບໍ່ພົບສິນຄ້າ":lang==="en"?"No products found":"未找到商品"}</span>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #f0f0f0",display:"flex",justifyContent:"space-around",padding:"10px 0",boxShadow:"0 -2px 12px rgba(0,0,0,0.07)"}}>
        {[
          { icon:"🏠", label:t.home, tab:"home" },
          { icon:"🔍", label:lang==="lo"?"ຄົ້ນຫາ":lang==="en"?"Search":"搜索", tab:"search" },
          { icon:"🛒", label:t.cart, action:()=>setShowCart(true), badge:cartCount },
          { icon:"🏪", label:t.sell, action:()=>{ currentSeller?setActiveTab("sell"):setShowSellerReg(true); } },
        ].map((item,i)=>(
          <button key={i} onClick={item.action||(()=>setActiveTab(item.tab))} style={{ background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,position:"relative",padding:"4px 12px" }}>
            <span style={{fontSize:22,opacity:activeTab===item.tab?1:0.7}}>{item.icon}</span>
            <span style={{fontSize:10,color:activeTab===item.tab?"#e8401c":"#888",fontWeight:activeTab===item.tab?700:400}}>{item.label}</span>
            {item.badge>0&&<span style={{position:"absolute",top:0,right:6,background:"#e8401c",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{item.badge}</span>}
          </button>
        ))}
      </div>

      {showCart&&<CartDrawer cart={cart} lang={lang} onClose={()=>setShowCart(false)} onQty={updateQty}/>}
      {detail&&<DetailModal p={detail} lang={lang} onClose={()=>setDetail(null)} onAdd={addToCart}/>}
      {showSellerReg&&<SellerRegModal lang={lang} onClose={()=>setShowSellerReg(false)} onSuccess={seller=>{setCurrentSeller(seller);setShowSellerReg(false);setActiveTab("sell");}}/>}
      {showSellerLogin&&<SellerLoginModal lang={lang} onClose={()=>setShowSellerLogin(false)} onSuccess={seller=>{setCurrentSeller(seller);setShowSellerLogin(false);setActiveTab("sell");}} onGoRegister={()=>{setShowSellerLogin(false);setShowSellerReg(true);}}/>}
    </div>
  );
}
