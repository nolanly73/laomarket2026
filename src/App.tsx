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

// Upload image to Supabase Storage — returns public URL
async function uploadImage(file, folder="products") {
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/images/${filename}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": file.type || "image/jpeg",
    },
    body: file,
  });
  if (!res.ok) throw new Error(await res.text());
  return `${SUPABASE_URL}/storage/v1/object/public/images/${filename}`;
}

// Upload multiple images, return array of URLs
async function uploadImages(files, folder="products") {
  const urls = await Promise.all(files.map(f => uploadImage(f, folder)));
  return urls;
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
//
// create table conversations (
//   id uuid default gen_random_uuid() primary key,
//   seller_id uuid references sellers(id),
//   seller_name text,
//   buyer_phone text,
//   buyer_name text,
//   village text,
//   shipper text,
//   items jsonb,
//   total integer,
//   created_at timestamptz default now()
// );
//
// create table messages (
//   id uuid default gen_random_uuid() primary key,
//   conversation_id uuid references conversations(id),
//   sender text, -- 'buyer' or 'seller'
//   text text,
//   image text,
//   created_at timestamptz default now()
// );
//
// alter table conversations enable row level security;
// alter table messages enable row level security;
// create policy "Public read" on conversations for select using (true);
// create policy "Public insert" on conversations for insert with check (true);
// create policy "Public read" on messages for select using (true);
// create policy "Public insert" on messages for insert with check (true);

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

const DEMO_PRODUCTS = [];

const L = {
  lo: { search:"ຄົ້ນຫາສິນຄ້າ...", cart:"ກະຕ່າ", buy:"ຊື້ດຽວນີ້", msg:"ສົ່ງຂໍ້ຄວາມ", sold:"ຂາຍແລ້ວ", shipper:"ເລືອກຂົນສົ່ງ", add:"ເພີ່ມໃສ່ກະຕ່າ", total:"ລວມ", checkout:"ຊຳລະ", empty:"ກະຕ່າຫວ່າງ", close:"ປິດ", pay:"ວິທີຊຳລະ", qr:"ສະແກນ QR ຊຳລະ", home:"ໜ້າຫຼັກ", sell:"ຂາຍ", dashboard:"ຈັດການ", save:"ບັນທຶກ", cancel:"ຍົກເລີກ", products:"ສິນຄ້າ", addProduct:"ເພີ່ມສິນຄ້າ", sellerReg:"ລົງທະບຽນຂາຍ", storeName:"ຊື່ຮ້ານ", phone:"ເບີໂທ", whatsapp:"WhatsApp", village:"ບ້ານ / ສາຂາ", mainCategory:"ໝວດຫຼັກ", qrLabel:"ຊື່ QR ໂອນເງິນ", price:"ລາຄາ (₭)", emoji:"Icon", productName:"ຊື່ສິນຄ້າ", desc:"ລາຍລະອຽດ", register:"ລົງທະບຽນ", myShop:"ຮ້ານຂອງຂ້ອຍ", orders:"ຄຳສັ່ງ", loading:"ກຳລັງໂຫຼດ...", login:"ເຂົ້າສູ່ລະບົບ", logout:"ອອກຈາກລະບົບ", password:"ລະຫັດຜ່ານ", loginTitle:"ເຂົ້າສູ່ລະບົບຮ້ານຄ້າ", noAccount:"ຍັງບໍ່ມີຮ້ານ?", createAccount:"ລົງທະບຽນຮ້ານໃໝ່", wrongLogin:"ເບີໂທ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ", productPhoto:"ຮູບສິນຄ້າ", uploadPhoto:"ກົດເພື່ອອັບໂຫຼດຮູບ", translating:"ກຳລັງແປ...", nameOneOnly:"ຂຽນຊື່ສິນຄ້າພາສາໃດກໍໄດ້ ລະບົບຈະແປໃຫ້ອັດຕະໂນມັດ", messages:"ຂໍ້ຄວາມ", welcomeMsg:"ຍິນດີຕ້ອນຮັບ! ຂອບໃຈສຳລັບການສັ່ງຊື້", orderSummary:"ສະຫຼຸບຄຳສັ່ງຊື້", deliveryTo:"ສົ່ງໄປທີ່", proofRequest:"ກະລຸນາສົ່ງຫຼັກຖານການໂອນເງິນ (ຮູບພາບ) ມາທີ່ນີ້", typeMessage:"ພິມຂໍ້ຄວາມ...", sendProof:"ສົ່ງຫຼັກຖານ", noConversations:"ຍັງບໍ່ມີຂໍ້ຄວາມ", yourBuyerName:"ຊື່ຂອງທ່ານ", yourBuyerPhone:"ເບີໂທຂອງທ່ານ", startChat:"ເລີ່ມສົນທະນາ" },
  en: { search:"Search products...", cart:"Cart", buy:"Buy Now", msg:"Message", sold:"sold", shipper:"Choose Shipper", add:"Add to Cart", total:"Total", checkout:"Checkout", empty:"Cart is empty", close:"Close", pay:"Payment", qr:"Scan QR to Pay", home:"Home", sell:"Sell", dashboard:"Manage", save:"Save", cancel:"Cancel", products:"Products", addProduct:"Add Product", sellerReg:"Become a Seller", storeName:"Store Name", phone:"Phone", whatsapp:"WhatsApp", village:"Village / Branch", mainCategory:"Main Category", qrLabel:"QR Payment Name", price:"Price (₭)", emoji:"Icon", productName:"Product Name", desc:"Description", register:"Register", myShop:"My Shop", orders:"Orders", loading:"Loading...", login:"Login", logout:"Logout", password:"Password", loginTitle:"Seller Login", noAccount:"No shop yet?", createAccount:"Register a new shop", wrongLogin:"Wrong phone or password", productPhoto:"Product Photo", uploadPhoto:"Tap to upload photo", translating:"Translating...", nameOneOnly:"Write the product name in any language — we'll auto-translate it", messages:"Messages", welcomeMsg:"Welcome! Thanks for your order", orderSummary:"Order Summary", deliveryTo:"Deliver to", proofRequest:"Please send your payment proof (photo) here", typeMessage:"Type a message...", sendProof:"Send proof", noConversations:"No conversations yet", yourBuyerName:"Your name", yourBuyerPhone:"Your phone", startChat:"Start conversation" },
  zh: { search:"搜索商品...", cart:"购物车", buy:"立即购买", msg:"发消息", sold:"已售", shipper:"选择快递", add:"加入购物车", total:"合计", checkout:"结算", empty:"购物车为空", close:"关闭", pay:"付款方式", qr:"扫码支付", home:"首页", sell:"卖货", dashboard:"管理", save:"保存", cancel:"取消", products:"商品", addProduct:"添加商品", sellerReg:"成为卖家", storeName:"店铺名称", phone:"电话", whatsapp:"WhatsApp", village:"村/分支", mainCategory:"主要类别", qrLabel:"QR收款名称", price:"价格 (₭)", emoji:"图标", productName:"商品名称", desc:"描述", register:"注册", myShop:"我的店", orders:"订单", loading:"加载中...", login:"登录", logout:"退出登录", password:"密码", loginTitle:"卖家登录", noAccount:"还没有店铺？", createAccount:"注册新店铺", wrongLogin:"电话或密码错误", productPhoto:"商品照片", uploadPhoto:"点击上传照片", translating:"翻译中...", nameOneOnly:"用任意语言输入商品名称，系统会自动翻译", messages:"消息", welcomeMsg:"欢迎！感谢您的订单", orderSummary:"订单摘要", deliveryTo:"送货至", proofRequest:"请在此发送付款凭证（照片）", typeMessage:"输入消息...", sendProof:"发送凭证", noConversations:"暂无对话", yourBuyerName:"您的姓名", yourBuyerPhone:"您的电话", startChat:"开始对话" },
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
      <div style={{ background:"linear-gradient(135deg,#fff8f0,#fff0f8)", fontSize:52, textAlign:"center", position:"relative", overflow:"hidden", aspectRatio:"1/1", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {p.images && p.images[0]
          ? <img src={p.images[0]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
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
function CartDrawer({ cart, lang, onClose, onQty, onOpenChat }) {
  const t = L[lang];
  const [shipper, setShipper] = useState("");
  const [village, setVillage] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [qrIndex, setQrIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  const [conversations, setConversations] = useState([]); // created per seller group

  // group cart items by seller
  const groups = cart.reduce((acc, item) => {
    const key = item.seller_id || item.seller_name || "unknown";
    if (!acc[key]) acc[key] = { seller_id: item.seller_id||null, seller_name: item.seller_name || "—", qr_image: item.qr_image || null, items: [] };
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
    viewChat: lang==="lo"?"ໄປທີ່ການສົນທະນາ":lang==="en"?"Go to chat":"前往聊天",
  };

  const startCheckout = async () => {
    setCreating(true);
    const created = [];
    for (const group of sellerGroups) {
      const payload = {
        seller_id: group.seller_id, seller_name: group.seller_name,
        buyer_phone: buyerPhone, buyer_name: buyerName,
        village, shipper, items: group.items, total: group.items.reduce((s,i)=>s+i.price*i.qty,0)
      };
      try {
        const data = await sbFetch("conversations", { method:"POST", body: JSON.stringify(payload) });
        created.push(data[0]);
      } catch {
        created.push({ ...payload, id:"demo-"+Date.now()+Math.random() });
      }
    }
    setConversations(created);
    setCreating(false);
    setQrIndex(0);
    setShowQR(true);
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
                          <div style={{width:44,height:44,borderRadius:10,overflow:"hidden",flexShrink:0,background:"#fff0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                            {item.images&&item.images[0]
                              ? <img src={item.images[0]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                              : (item.emoji||"📦")
                            }
                          </div>
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
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <input value={buyerName} onChange={e=>setBuyerName(e.target.value)} placeholder={t.yourBuyerName} style={{
                padding:"9px 10px", borderRadius:10, border:"1.5px solid #e8e8e8", fontSize:12, outline:"none", background:"#fafafa"
              }}/>
              <input value={buyerPhone} onChange={e=>setBuyerPhone(e.target.value)} placeholder={t.yourBuyerPhone} style={{
                padding:"9px 10px", borderRadius:10, border:"1.5px solid #e8e8e8", fontSize:12, outline:"none", background:"#fafafa"
              }}/>
            </div>
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
            <button onClick={startCheckout} disabled={creating} style={btn(creating?"#ccc":"linear-gradient(90deg,#ff6b35,#e8401c)")}>
              {creating ? t.loading : `${t.checkout} →`}
            </button>
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
            <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={()=>onOpenChat(conversations[qrIndex])} style={btn("#fff","#e8401c",{border:"1.5px solid #e8401c"})}>💬 {txt.viewChat}</button>
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
// ─── CHAT MODAL ───────────────────────────────────────────────────────────────
// ─── SELLER SHOP MODAL ────────────────────────────────────────────────────────
function SellerShopModal({ sellerId, sellerName, lang, onClose, onAdd }) {
  const t = L[lang];
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await sbFetch(`products?seller_id=eq.${sellerId}&order=created_at.desc`);
        setProducts(data || []);
      } catch { setProducts([]); }
      setLoading(false);
    };
    load();
  }, [sellerId]);

  return (
    <div style={{ position:"fixed",inset:0,zIndex:95,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#f7f7f9",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:500,maxHeight:"85vh",display:"flex",flexDirection:"column" }}>
        <div style={{background:"linear-gradient(90deg,#ff6b35,#e8401c)",padding:"16px 20px",color:"#fff",borderRadius:"24px 24px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:900,fontSize:16}}>🏪 {sellerName}</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:10,padding:"6px 12px",cursor:"pointer",fontWeight:700}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:16}}>
          {loading && <div style={{textAlign:"center",color:"#bbb",padding:40}}>{t.loading}</div>}
          {!loading && products.length===0 && <div style={{textAlign:"center",color:"#bbb",padding:40}}>📭</div>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
            {products.map(p=>{
              const name = p[`name_${lang}`]||p.name_en||p.name_lo;
              return (
                <div key={p.id} style={{background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
                  <div style={{aspectRatio:"1/1",background:"linear-gradient(135deg,#fff8f0,#fff0f8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,overflow:"hidden"}}>
                    {p.images&&p.images[0]?<img src={p.images[0]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(p.emoji||"📦")}
                  </div>
                  <div style={{padding:"10px 12px"}}>
                    <div style={{fontSize:12,fontWeight:600,marginBottom:4}}>{name}</div>
                    <div style={{fontSize:13,fontWeight:800,color:"#e8401c",marginBottom:8}}>{fmt(p.price)}</div>
                    <button onClick={()=>{onAdd(p);onClose();}} style={btn("linear-gradient(90deg,#ff6b35,#e8401c)",undefined,{padding:"7px 0",fontSize:11})}>{t.add}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatModal({ conversation, lang, onClose }) {
  const t = L[lang];
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(conversation.payment_confirmed || false);
  const [rating, setRating] = useState(0);
  const [ratingDone, setRatingDone] = useState(false);
  const bottomRef = { current: null };

  const loadMessages = async () => {
    try {
      const data = await sbFetch(`messages?conversation_id=eq.${conversation.id}&order=created_at.asc`);
      setMessages(data || []);
      // Check if already confirmed
      const convData = await sbFetch(`conversations?id=eq.${conversation.id}`);
      if (convData && convData[0]?.payment_confirmed) setConfirmed(true);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    // Point 7: auto-send proof request message on first open
    const init = async () => {
      await loadMessages();
    };
    init();
  }, [conversation.id]);

  const send = async (msgText, image, sender="buyer") => {
    if (!msgText && !image) return;
    const payload = { conversation_id: conversation.id, sender, text: msgText||"", image: image||"" };
    let newMsg = { ...payload, id:"demo-"+Date.now() };
    try {
      const data = await sbFetch("messages", { method:"POST", body: JSON.stringify(payload) });
      newMsg = data[0];
    } catch {}
    setMessages(m => [...m, newMsg]);

    // Point 4: if buyer sends photo → auto-confirm payment
    if (image && sender==="buyer" && !confirmed) {
      setConfirmed(true);
      try {
        await sbFetch(`conversations?id=eq.${conversation.id}`, { method:"PATCH", prefer:"return=minimal", body: JSON.stringify({ payment_confirmed: true }) });
      } catch {}
      // Auto system message confirming payment
      const sysMsg = lang==="lo"?"✅ ຮັບເງິນສຳເລັດ — ຂອບໃຈ!":lang==="en"?"✅ Payment received — Thank you!":"✅ 收款成功 — 谢谢！";
      const sysPayload = { conversation_id: conversation.id, sender:"seller", text: sysMsg, image:"" };
      let sysNew = { ...sysPayload, id:"sys-"+Date.now() };
      try {
        const sd = await sbFetch("messages", { method:"POST", body: JSON.stringify(sysPayload) });
        sysNew = sd[0];
      } catch {}
      setTimeout(() => {
        setMessages(m => [...m, sysNew]);
      }, 800);
    }
  };

  const handleSend = () => {
    if (!text.trim()) return;
    send(text.trim());
    setText("");
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, "proofs");
      send("", url);
    } catch {
      // Fallback to base64
      const reader = new FileReader();
      reader.onload = (ev) => send("", ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const submitRating = async (stars) => {
    setRating(stars);
    setRatingDone(true);
    // Save rating on each product in conversation
    const ratingMsg = `${"⭐".repeat(stars)} ${lang==="lo"?"ຂອບໃຈ ທ່ານໄດ້ໃຫ້ຄະແນນ":lang==="en"?"Thanks! You rated":"谢谢！您评了"} ${stars}/5`;
    await send(ratingMsg);
    // Update product ratings
    try {
      for (const item of (conversation.items||[])) {
        if (item.id) {
          const prod = await sbFetch(`products?id=eq.${item.id}`);
          if (prod && prod[0]) {
            const oldRating = prod[0].rating || 5;
            const oldSold = prod[0].sold || 0;
            const newRating = ((oldRating * oldSold) + stars) / (oldSold + 1);
            await sbFetch(`products?id=eq.${item.id}`, { method:"PATCH", prefer:"return=minimal", body: JSON.stringify({ rating: Math.round(newRating*10)/10, sold: oldSold+item.qty }) });
          }
        }
      }
    } catch {}
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:160,background:"#f7f7f9",display:"flex",flexDirection:"column" }}>
      <div style={{ background:"linear-gradient(90deg,#ff6b35,#e8401c)",padding:"16px 20px",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div>
          <div style={{fontWeight:900,fontSize:16}}>🏪 {conversation.seller_name}</div>
          <div style={{fontSize:11,opacity:.8}}>📦 {conversation.shipper} · {conversation.village}</div>
        </div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:10,padding:"8px 14px",cursor:"pointer",fontWeight:700}}>×</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:10}}>
        {/* Welcome + order summary + proof request — always shown first */}
        <div style={{alignSelf:"flex-start",maxWidth:"85%",background:"#fff",borderRadius:"4px 16px 16px 16px",padding:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>👋 {t.welcomeMsg}, {conversation.buyer_name||""}!</div>
          <div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:4}}>{t.orderSummary}</div>
          <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:8}}>
            {(conversation.items||[]).map((it,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
                <div style={{width:32,height:32,borderRadius:8,overflow:"hidden",flexShrink:0,background:"#fafafa",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                  {it.images&&it.images[0]?<img src={it.images[0]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(it.emoji||"📦")}
                </div>
                <span style={{flex:1}}>{it[`name_${lang}`]||it.name_en||it.name_lo} ×{it.qty}</span>
                <span style={{fontWeight:700,color:"#e8401c"}}>{fmt(it.price*it.qty)}</span>
              </div>
            ))}
          </div>
          <div style={{borderTop:"1px dashed #eee",paddingTop:8,fontSize:12,display:"flex",justifyContent:"space-between",fontWeight:800}}>
            <span>{t.total}</span><span style={{color:"#e8401c"}}>{fmt(conversation.total)}</span>
          </div>
          <div style={{fontSize:11,color:"#888",marginTop:6}}>📍 {t.deliveryTo}: {conversation.village}</div>
          {/* Point 7: auto proof request shown immediately */}
          {!confirmed && (
            <div style={{marginTop:10,background:"#fff5f3",borderRadius:10,padding:"8px 10px",fontSize:11,color:"#e8401c",fontWeight:600}}>
              📸 {t.proofRequest}
            </div>
          )}
          {confirmed && (
            <div style={{marginTop:10,background:"#f0fff4",borderRadius:10,padding:"8px 10px",fontSize:11,color:"#2d6a4f",fontWeight:600}}>
              ✅ {lang==="lo"?"ຊຳລະແລ້ວ":lang==="en"?"Payment confirmed":"已付款"}
            </div>
          )}
        </div>

        {messages.map(m=>(
          <div key={m.id} style={{
            alignSelf: m.sender==="buyer" ? "flex-end" : "flex-start",
            maxWidth:"75%",
            background: m.sender==="buyer" ? "linear-gradient(90deg,#ff6b35,#e8401c)" : "#fff",
            color: m.sender==="buyer" ? "#fff" : "#1a1a1a",
            borderRadius: m.sender==="buyer" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
            padding:10, boxShadow:"0 2px 8px rgba(0,0,0,0.05)"
          }}>
            {m.image && <img src={m.image} alt="" style={{width:160,height:160,objectFit:"cover",borderRadius:10,marginBottom:m.text?6:0}}/>}
            {m.text && <div style={{fontSize:13}}>{m.text}</div>}
          </div>
        ))}

        {/* Point 5: Rating widget after payment confirmed */}
        {confirmed && !ratingDone && (
          <div style={{alignSelf:"flex-start",background:"#fff",borderRadius:"4px 16px 16px 16px",padding:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",maxWidth:"85%"}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>
              {lang==="lo"?"ໃຫ້ຄະແນນສິນຄ້ານີ້":lang==="en"?"Rate your purchase":"给这次购物评分"}
            </div>
            <div style={{display:"flex",gap:8}}>
              {[1,2,3,4,5].map(s=>(
                <button key={s} onClick={()=>submitRating(s)} style={{
                  fontSize:28,background:"none",border:"none",cursor:"pointer",
                  opacity: s<=rating ? 1 : 0.3, transition:"opacity .15s"
                }}>⭐</button>
              ))}
            </div>
          </div>
        )}
        {ratingDone && (
          <div style={{alignSelf:"flex-start",background:"#f0fff4",borderRadius:"4px 16px 16px 16px",padding:12,fontSize:12,color:"#2d6a4f",fontWeight:600}}>
            {"⭐".repeat(rating)} {lang==="lo"?"ຂອບໃຈສຳລັບຄະແນນ!":lang==="en"?"Thanks for your rating!":"感谢您的评分！"}
          </div>
        )}
      </div>

      <div style={{padding:12,background:"#fff",borderTop:"1px solid #f0f0f0",display:"flex",gap:8,alignItems:"center"}}>
        <label style={{ width:38,height:38,borderRadius:12,background:"#fff5f3",border:"1.5px solid #ffd0d0",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:18 }}>
          📷
          <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{display:"none"}}/>
        </label>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSend()}
          placeholder={confirmed ? (lang==="lo"?"ຂຽນຂໍ້ຄວາມ...":lang==="en"?"Write a message...":"写消息...") : t.typeMessage}
          style={{flex:1,padding:"10px 14px",borderRadius:20,border:"1.5px solid #eee",fontSize:13,outline:"none"}}/>
        <button onClick={handleSend} style={{ width:38,height:38,borderRadius:"50%",background:"linear-gradient(90deg,#ff6b35,#e8401c)",color:"#fff",border:"none",cursor:"pointer",fontSize:16,flexShrink:0 }}>➤</button>
      </div>
    </div>
  );
}

function DetailModal({ p, lang, onClose, onAdd, onViewShop }) {
  const t = L[lang];
  const name = p[`name_${lang}`] || p.name_en || p.name_lo;
  const [shipper, setShipper] = useState("");
  const [imgIdx, setImgIdx] = useState(0);
  const images = (p.images && p.images.length > 0) ? p.images : null;

  return (
    <div style={{ position:"fixed",inset:0,zIndex:90,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:"24px 24px 0 0",padding:24,width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto" }}>
        <div style={{position:"relative",background:"linear-gradient(135deg,#fff8f0,#fff0f8)",borderRadius:16,marginBottom:16,overflow:"hidden",aspectRatio:"1/1",display:"flex",alignItems:"center",justifyContent:"center",fontSize:80}}>
          {images
            ? <img src={images[imgIdx]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            : (p.emoji||"📦")
          }
          {images && images.length > 1 && (
            <>
              <button onClick={()=>setImgIdx(i=>i===0?images.length-1:i-1)} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,0.4)",color:"#fff",border:"none",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
              <button onClick={()=>setImgIdx(i=>i===images.length-1?0:i+1)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,0.4)",color:"#fff",border:"none",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
              <div style={{position:"absolute",bottom:10,left:0,right:0,display:"flex",justifyContent:"center",gap:5}}>
                {images.map((_,i)=>(
                  <span key={i} onClick={()=>setImgIdx(i)} style={{width:6,height:6,borderRadius:"50%",background:i===imgIdx?"#e8401c":"rgba(255,255,255,0.7)",cursor:"pointer"}}/>
                ))}
              </div>
            </>
          )}
        </div>
        {images && images.length > 1 && (
          <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
            {images.map((img,i)=>(
              <div key={i} onClick={()=>setImgIdx(i)} style={{ width:50,height:50,flexShrink:0,borderRadius:8,overflow:"hidden",cursor:"pointer", border: i===imgIdx?"2px solid #e8401c":"1.5px solid #eee" }}>
                <img src={img} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              </div>
            ))}
          </div>
        )}
        <div style={{fontWeight:800,fontSize:20,marginBottom:4}}>{name}</div>
        <div onClick={()=>p.seller_id&&onViewShop&&onViewShop(p)} style={{fontSize:13,color:"#e8401c",marginBottom:8,cursor:p.seller_id?"pointer":"default",fontWeight:600}}>🏪 {p.seller_name||"—"} {p.seller_id?"→":""}</div>
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

  const handleQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, "qr");
      setQrPreview(url);
      set("qr_image", url);
    } catch {
      // Fallback to base64
      const reader = new FileReader();
      reader.onload = (ev) => { setQrPreview(ev.target.result); set("qr_image", ev.target.result); };
      reader.readAsDataURL(file);
    }
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
  const [stats, setStats] = useState({ revenue: 0, sold: 0 });
  const [qrImage, setQrImage] = useState(seller.qr_image || "");
  const [shipperPrefs, setShipperPrefs] = useState(
    Array.isArray(seller.shippers) ? seller.shippers : seller.shipper ? [seller.shipper] : ["Anousith"]
  );
  const [form, setForm] = useState({ name_input:"", name_lo:"", name_en:"", name_zh:"", price:"", category:"fashion", emoji:"📦", images:[], description:"", badge:"" });
  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  const toggleShipper = (s) => setShipperPrefs(prev =>
    prev.includes(s) ? prev.filter(x=>x!==s) : [...prev, s]
  );

  const [uploading, setUploading] = useState(false);

  const handleImagesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 6 - form.images.length;
    const toAdd = files.slice(0, remaining);
    setUploading(true);
    try {
      const urls = await uploadImages(toAdd, "products");
      setForm(f => ({ ...f, images: [...f.images, ...urls].slice(0, 6) }));
    } catch {
      // Fallback to base64 if storage fails
      toAdd.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => setForm(f => f.images.length < 6 ? { ...f, images: [...f.images, ev.target.result] } : f);
        reader.readAsDataURL(file);
      });
    }
    setUploading(false);
  };
  const removeImage = (idx) => setForm(f => ({ ...f, images: f.images.filter((_,i)=>i!==idx) }));

  const handleQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, "qr");
      setQrImage(url);
      sbFetch(`sellers?id=eq.${seller.id}`, { method:"PATCH", prefer:"return=minimal", body: JSON.stringify({ qr_image: url }) }).catch(()=>{});
    } catch {
      // Fallback to base64
      const reader = new FileReader();
      reader.onload = (ev) => {
        setQrImage(ev.target.result);
        sbFetch(`sellers?id=eq.${seller.id}`, { method:"PATCH", prefer:"return=minimal", body: JSON.stringify({ qr_image: ev.target.result }) }).catch(()=>{});
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteQr = async () => {
    setQrImage("");
    try { await sbFetch(`sellers?id=eq.${seller.id}`, { method:"PATCH", prefer:"return=minimal", body: JSON.stringify({ qr_image: "" }) }); } catch {}
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await sbFetch(`products?seller_id=eq.${seller.id}&order=created_at.desc`);
        setProducts(data || []);
      } catch { setProducts([]); }
      // Load stats from confirmed conversations
      try {
        const convs = await sbFetch(`conversations?seller_id=eq.${seller.id}&payment_confirmed=eq.true`);
        if (convs && convs.length > 0) {
          const revenue = convs.reduce((s,c)=>s+(c.total||0), 0);
          const sold = convs.reduce((s,c)=>s+((c.items||[]).reduce((a,i)=>a+(i.qty||1),0)), 0);
          setStats({ revenue, sold });
        }
      } catch {}
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
      images: form.images, description: form.description, badge: form.badge,
      seller_id: seller.id, seller_name: seller.name
    };
    try {
      const data = await sbFetch("products", { method:"POST", body: JSON.stringify(payload) });
      setProducts(p => [data[0], ...p]);
    } catch {
      setProducts(p => [{ ...payload, id:"demo-"+Date.now() }, ...p]);
    }
    setForm({ name_input:"", name_lo:"", name_en:"", name_zh:"", price:"", category:"fashion", emoji:"📦", images:[], description:"", badge:"" });
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
            <div style={{fontSize:11,opacity:.8}}>📦 {shipperPrefs.join(" · ")}</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:10,padding:"8px 14px",cursor:"pointer",fontWeight:700}}>← {t.home}</button>
        </div>
      </div>

      <div style={{padding:16,maxWidth:600,margin:"0 auto"}}>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
          {[
            { icon:"📦", label:t.products, value:products.length },
            { icon:"💰", label:lang==="lo"?"ລາຍຮັບ":lang==="en"?"Revenue":"收入", value:fmt(stats.revenue) },
            { icon:"🛍️", label:lang==="lo"?"ຂາຍແລ້ວ":lang==="en"?"Items sold":"已售", value:stats.sold },
          ].map((s,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:14,padding:"14px 12px",textAlign:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <div style={{fontSize:24}}>{s.icon}</div>
              <div style={{fontWeight:800,fontSize:18,color:"#1a1a1a"}}>{s.value}</div>
              <div style={{fontSize:10,color:"#888"}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Shipper preferences */}
        <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>📦 {lang==="lo"?"ຜູ້ຂົນສົ່ງທີ່ຮັບ":lang==="en"?"Accepted shippers":"支持快递"}</div>
          <div style={{display:"flex",gap:8}}>
            {SHIPPERS.map(s=>(
              <button key={s} onClick={()=>toggleShipper(s)} style={{ flex:1,padding:"8px 4px",borderRadius:10,fontSize:11,cursor:"pointer",fontWeight:600, border:shipperPrefs.includes(s)?"2px solid #e8401c":"1.5px solid #e0e0e0", background:shipperPrefs.includes(s)?"#fff5f3":"#fff", color:shipperPrefs.includes(s)?"#e8401c":"#555" }}>
                {shipperPrefs.includes(s)?"✓ ":""}{s}
              </button>
            ))}
          </div>
        </div>

        {/* QR Payment */}
        <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>📲 QR {lang==="lo"?"ຊຳລະເງິນ":lang==="en"?"Payment":"收款"}</div>
          {qrImage
            ? <div style={{display:"flex",alignItems:"center",gap:14}}>
                <img src={qrImage} alt="QR" style={{width:80,height:80,objectFit:"contain",borderRadius:10,border:"1px solid #f0f0f0"}}/>
                <div>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>{seller.qr_label||"QR Payment"}</div>
                  <button onClick={deleteQr} style={{background:"none",border:"1.5px solid #ffd0d0",color:"#e8401c",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:11,fontWeight:600}}>
                    🗑️ {lang==="lo"?"ລຶບ QR":lang==="en"?"Delete QR":"删除"}
                  </button>
                </div>
              </div>
            : <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:"2px dashed #e8e8e8",borderRadius:12,padding:"16px 0",cursor:"pointer",gap:6}}>
                <span style={{fontSize:28}}>📷</span>
                <span style={{fontSize:12,color:"#aaa"}}>{lang==="lo"?"ອັບໂຫຼດ QR ໃໝ່":lang==="en"?"Upload new QR":"上传新QR"}</span>
                <input type="file" accept="image/*" onChange={handleQrUpload} style={{display:"none"}}/>
              </label>
          }
        </div>

        {/* Add Product */}
        <button onClick={()=>setShowAdd(s=>!s)} style={{...btn("linear-gradient(90deg,#ff6b35,#e8401c)",undefined,{marginBottom:16})}}>
          {showAdd ? `✕ ${t.cancel}` : `+ ${t.addProduct}`}
        </button>

        {showAdd && (
          <div style={{background:"#fff",borderRadius:16,padding:20,marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
            <div style={{fontWeight:800,fontSize:15,marginBottom:16}}>➕ {t.addProduct}</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <span style={label}>📸 {t.productPhoto} ({form.images.length}/6)</span>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {form.images.map((img,idx)=>(
                    <div key={idx} style={{position:"relative",aspectRatio:"1/1",borderRadius:12,overflow:"hidden",border:"1.5px solid #eee"}}>
                      <img src={img} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      <button onClick={()=>removeImage(idx)} style={{position:"absolute",top:4,right:4,width:20,height:20,borderRadius:"50%",background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                    </div>
                  ))}
                  {form.images.length < 6 && (
                    <label style={{
                      aspectRatio:"1/1", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      border:"2px dashed #e8e8e8", borderRadius:12, cursor:"pointer", background: uploading?"#fff5f3":"#fafafa", gap:4
                    }}>
                      <span style={{fontSize:22}}>{uploading?"⏳":"📷"}</span>
                      <span style={{fontSize:9,color:"#aaa",textAlign:"center",padding:"0 4px"}}>{uploading?(lang==="lo"?"ກຳລັງອັບໂຫຼດ...":lang==="en"?"Uploading...":"上传中..."):t.uploadPhoto}</span>
                      <input type="file" accept="image/*" multiple onChange={handleImagesUpload} disabled={uploading} style={{display:"none"}}/>
                    </label>
                  )}
                </div>
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
                    <div style={{width:44,height:44,borderRadius:10,overflow:"hidden",flexShrink:0,background:"#fafafa",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>
                      {p.images && p.images[0] ? <img src={p.images[0]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : (p.emoji||"📦")}
                    </div>
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
// ─── MESSAGES INBOX ───────────────────────────────────────────────────────────
function MessagesInbox({ lang, onClose, onOpenChat }) {
  const t = L[lang];
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!phone.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const data = await sbFetch(`conversations?buyer_phone=eq.${encodeURIComponent(phone.trim())}&order=created_at.desc`);
      setConversations(data || []);
    } catch { setConversations([]); }
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:140,background:"#f7f7f9",display:"flex",flexDirection:"column" }}>
      <div style={{ background:"linear-gradient(90deg,#ff6b35,#e8401c)",padding:"16px 20px",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div style={{fontWeight:900,fontSize:17}}>💬 {t.messages}</div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:10,padding:"8px 14px",cursor:"pointer",fontWeight:700}}>× {t.close}</button>
      </div>
      <div style={{padding:16}}>
        <div style={{display:"flex",gap:8}}>
          <input value={phone} onChange={e=>setPhone(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder={t.yourBuyerPhone} style={{
            flex:1, padding:"10px 14px", borderRadius:12, border:"1.5px solid #eee", fontSize:13, outline:"none"
          }}/>
          <button onClick={search} style={{ background:"linear-gradient(90deg,#ff6b35,#e8401c)",color:"#fff",border:"none",borderRadius:12,padding:"10px 18px",cursor:"pointer",fontWeight:700,fontSize:13 }}>🔍</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {loading && <div style={{textAlign:"center",color:"#bbb",marginTop:40}}>{t.loading}</div>}
        {!loading && searched && conversations.length===0 && (
          <div style={{textAlign:"center",color:"#bbb",marginTop:40}}>📭<br/><span style={{fontSize:13}}>{t.noConversations}</span></div>
        )}
        {conversations.map(c=>(
          <div key={c.id} onClick={()=>onOpenChat(c)} style={{ background:"#fff",borderRadius:14,padding:14,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.05)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <div style={{fontWeight:700,fontSize:13}}>🏪 {c.seller_name}</div>
              <div style={{fontSize:11,color:"#888",marginTop:2}}>📦 {c.shipper} · {c.village}</div>
            </div>
            <div style={{fontWeight:800,color:"#e8401c",fontSize:13}}>{fmt(c.total)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const [activeChat, setActiveChat] = useState(null);
  const [showInbox, setShowInbox]   = useState(false);
  const [myPhone, setMyPhone]       = useState("");
  const [viewShop, setViewShop]     = useState(null); // { seller_id, seller_name }

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
          { icon:"💬", label:t.messages, action:()=>setShowInbox(true) },
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

      {showCart&&<CartDrawer cart={cart} lang={lang} onClose={()=>setShowCart(false)} onQty={updateQty} onOpenChat={(conv)=>{setActiveChat(conv);setShowCart(false);}}/>}
      {detail&&<DetailModal p={detail} lang={lang} onClose={()=>setDetail(null)} onAdd={addToCart} onViewShop={(p)=>{setViewShop({seller_id:p.seller_id,seller_name:p.seller_name});setDetail(null);}}/>}
      {showSellerReg&&<SellerRegModal lang={lang} onClose={()=>setShowSellerReg(false)} onSuccess={seller=>{setCurrentSeller(seller);setShowSellerReg(false);setActiveTab("sell");}}/>}
      {showSellerLogin&&<SellerLoginModal lang={lang} onClose={()=>setShowSellerLogin(false)} onSuccess={seller=>{setCurrentSeller(seller);setShowSellerLogin(false);setActiveTab("sell");}} onGoRegister={()=>{setShowSellerLogin(false);setShowSellerReg(true);}}/>}
      {showInbox&&<MessagesInbox lang={lang} onClose={()=>setShowInbox(false)} onOpenChat={(conv)=>{setActiveChat(conv);setShowInbox(false);}}/>}
      {activeChat&&<ChatModal conversation={activeChat} lang={lang} onClose={()=>setActiveChat(null)}/>}
      {viewShop&&<SellerShopModal sellerId={viewShop.seller_id} sellerName={viewShop.seller_name} lang={lang} onClose={()=>setViewShop(null)} onAdd={addToCart}/>}
    </div>
  );
}
