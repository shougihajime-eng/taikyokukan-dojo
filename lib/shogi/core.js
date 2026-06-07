"use strict";
/* =========================================================
   Kifu Vault — 将棋ルールの心臓部（完全ルール・外部依存なし）
   ブラウザ: globalThis.ShogiCore / Node(テスト): module.exports

   座標系: board[r][c]
     r = 0(一段目・上) .. 8(九段目・下)
     c = 0(９筋・左)   .. 8(１筋・右)
     筋 file = 9 - c ／ 段 rank = r + 1
     先手(sente)は上（rが減る方向）へ進む。

   実装している正式ルール:
     ・各駒の動き（成り駒含む）
     ・王手放置/自殺手の禁止（ピン＝釘付けも自動で正しくなる）
     ・二歩の禁止
     ・行き所のない駒の禁止（移動・打ち両方）
     ・打ち歩詰めの禁止
     ・詰み判定
   扱わないもの（検討アプリのため不要と判断・明記）:
     ・千日手/連続王手の千日手・持将棋の自動判定
   ========================================================= */
(function(){

const KANJI = { P:"歩", L:"香", N:"桂", S:"銀", G:"金", B:"角", R:"飛", K:"玉" };
const KIF_PROMO = { P:"と", L:"成香", N:"成桂", S:"成銀", B:"馬", R:"龍" };
const HAND_ORDER = ["R","B","G","S","N","L","P"];
const PROMOTABLE = { P:1, L:1, N:1, S:1, B:1, R:1 };
const HIRATE_SFEN = "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";

function opp(color){ return color==="sente" ? "gote" : "sente"; }
function inBoard(r,c){ return r>=0 && r<9 && c>=0 && c<9; }
function cloneState(s){ return JSON.parse(JSON.stringify(s)); }

function initialBoard(){
  const b = Array.from({length:9}, ()=>Array(9).fill(null));
  const back = ["L","N","S","G","K","G","S","N","L"];
  for(let c=0;c<9;c++){
    b[0][c] = {type:back[c], promoted:false, color:"gote"};
    b[8][c] = {type:back[c], promoted:false, color:"sente"};
    b[2][c] = {type:"P", promoted:false, color:"gote"};
    b[6][c] = {type:"P", promoted:false, color:"sente"};
  }
  b[1][1] = {type:"R", promoted:false, color:"gote"};
  b[1][7] = {type:"B", promoted:false, color:"gote"};
  b[7][7] = {type:"R", promoted:false, color:"sente"};
  b[7][1] = {type:"B", promoted:false, color:"sente"};
  return b;
}
function emptyHands(){ return { sente:{}, gote:{} }; }
function initialState(){ return { board:initialBoard(), hands:emptyHands(), turn:"sente", lastMove:null }; }

// --- 駒の動き定義 ---
function pieceMoves(p){
  const f = p.color==="sente" ? -1 : 1; // 前方向
  const gold = [[f,-1],[f,0],[f,1],[0,-1],[0,1],[-f,0]];
  if(p.promoted){
    if(p.type==="B") return {steps:[[1,0],[-1,0],[0,1],[0,-1]], slides:[[1,1],[1,-1],[-1,1],[-1,-1]]}; // 馬
    if(p.type==="R") return {steps:[[1,1],[1,-1],[-1,1],[-1,-1]], slides:[[1,0],[-1,0],[0,1],[0,-1]]}; // 龍
    return {steps:gold, slides:[]}; // と金・成香・成桂・成銀
  }
  switch(p.type){
    case "P": return {steps:[[f,0]], slides:[]};
    case "L": return {steps:[], slides:[[f,0]]};
    case "N": return {steps:[[2*f,-1],[2*f,1]], slides:[]};
    case "S": return {steps:[[f,-1],[f,0],[f,1],[-f,-1],[-f,1]], slides:[]};
    case "G": return {steps:gold, slides:[]};
    case "K": return {steps:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]], slides:[]};
    case "B": return {steps:[], slides:[[1,1],[1,-1],[-1,1],[-1,-1]]};
    case "R": return {steps:[], slides:[[1,0],[-1,0],[0,1],[0,-1]]};
  }
  return {steps:[], slides:[]};
}

// --- 疑似合法手（自玉の安全は見ない素の動き） ---
function pseudoMoveTargets(st,r,c){
  const p = st.board[r][c];
  if(!p) return [];
  const {steps,slides} = pieceMoves(p);
  const res = [];
  for(const [dr,dc] of steps){
    const nr=r+dr, nc=c+dc;
    if(!inBoard(nr,nc)) continue;
    const t = st.board[nr][nc];
    if(t && t.color===p.color) continue;
    res.push({r:nr,c:nc,cap:!!t});
  }
  for(const [dr,dc] of slides){
    let nr=r+dr, nc=c+dc;
    while(inBoard(nr,nc)){
      const t = st.board[nr][nc];
      if(!t){ res.push({r:nr,c:nc,cap:false}); }
      else { if(t.color!==p.color) res.push({r:nr,c:nc,cap:true}); break; }
      nr+=dr; nc+=dc;
    }
  }
  return res;
}
function pseudoDropTargets(st,type){
  const color = st.turn;
  const res = [];
  for(let r=0;r<9;r++){
    for(let c=0;c<9;c++){
      if(st.board[r][c]) continue;
      // 行き所のない駒
      if(type==="P" || type==="L"){
        if(color==="sente" && r===0) continue;
        if(color==="gote"  && r===8) continue;
      }
      if(type==="N"){
        if(color==="sente" && r<=1) continue;
        if(color==="gote"  && r>=7) continue;
      }
      // 二歩（成っていない自分の歩がいる筋は禁止）
      if(type==="P"){
        let nifu=false;
        for(let rr=0;rr<9;rr++){
          const q=st.board[rr][c];
          if(q && q.color===color && q.type==="P" && !q.promoted){ nifu=true; break; }
        }
        if(nifu) continue;
      }
      res.push({r,c,cap:false});
    }
  }
  return res;
}

// --- 王手の検出 ---
function findKing(st,color){
  for(let r=0;r<9;r++)for(let c=0;c<9;c++){
    const p=st.board[r][c];
    if(p && p.type==="K" && p.color===color) return {r,c};
  }
  return null;
}
function squareAttackedBy(st,r,c,byColor){
  for(let rr=0;rr<9;rr++)for(let cc=0;cc<9;cc++){
    const p=st.board[rr][cc];
    if(!p || p.color!==byColor) continue;
    const ts=pseudoMoveTargets(st,rr,cc);
    for(const t of ts){ if(t.r===r && t.c===c) return true; }
  }
  return false;
}
function inCheck(st,color){
  const k=findKing(st,color);
  if(!k) return false; // 玉が盤にない局面（詰将棋等）は王手なし扱い
  return squareAttackedBy(st,k.r,k.c,opp(color));
}

// --- 着手の適用（純粋関数・元のstateは変えない） ---
// mv = {from:{r,c}, to:{r,c}, promote:bool} または {drop:"P", to:{r,c}}
function applyMove(st,mv){
  const ns=cloneState(st);
  if(mv.drop){
    const color=ns.turn, type=mv.drop;
    if(!ns.hands[color][type]) return null;          // 持っていない駒は打てない
    if(ns.board[mv.to.r][mv.to.c]) return null;       // 駒のあるマスへは打てない
    ns.hands[color][type]-=1;
    if(ns.hands[color][type]<=0) delete ns.hands[color][type];
    ns.board[mv.to.r][mv.to.c]={type, promoted:false, color};
  } else {
    const p=ns.board[mv.from.r][mv.from.c];
    if(!p || p.color!==ns.turn) return null;          // 手番の駒以外は動かせない
    const cap=ns.board[mv.to.r][mv.to.c];
    if(cap){
      if(cap.color===p.color) return null;            // 自分の駒は取れない
      if(cap.type==="K") return null;                 // 玉を取る手は存在しない（直前が反則）
      ns.hands[p.color][cap.type]=(ns.hands[p.color][cap.type]||0)+1;
    }
    ns.board[mv.from.r][mv.from.c]=null;
    ns.board[mv.to.r][mv.to.c]={type:p.type, promoted:p.promoted||!!mv.promote, color:p.color};
  }
  ns.lastMove={to:{r:mv.to.r,c:mv.to.c}};
  ns.turn=opp(ns.turn);
  return ns;
}

// --- 成りの判定 ---
function inPromoZone(color,r){ return color==="sente" ? r<=2 : r>=6; }
function canPromote(p,fr,tr){
  if(!PROMOTABLE[p.type] || p.promoted) return false;
  return inPromoZone(p.color,fr) || inPromoZone(p.color,tr);
}
function mustPromote(p,tr){
  if(p.promoted) return false;
  if(p.type==="P" || p.type==="L"){ return p.color==="sente" ? tr===0 : tr===8; }
  if(p.type==="N"){ return p.color==="sente" ? tr<=1 : tr>=7; }
  return false;
}

// --- 合法手（王手放置・自殺手を除外。ピンも自動で正しくなる） ---
function legalMoveTargets(st,r,c){
  const p=st.board[r][c];
  if(!p || p.color!==st.turn) return [];
  const me=st.turn;
  return pseudoMoveTargets(st,r,c).filter(t=>{
    const ns=applyMove(st,{from:{r,c},to:{r:t.r,c:t.c},promote:false});
    return ns && !inCheck(ns,me); // 動かした後に自玉が取られる手は不可
  });
}
function legalDropTargets(st,type){
  const me=st.turn;
  return pseudoDropTargets(st,type).filter(t=>{
    const ns=applyMove(st,{drop:type,to:{r:t.r,c:t.c}});
    if(!ns || inCheck(ns,me)) return false;           // 王手放置の解消にならない打ちは不可
    if(type==="P" && inCheck(ns,ns.turn) && isMate(ns)) return false; // 打ち歩詰め
    return true;
  });
}
// 詰み判定用：合法手が1つでもあるか（打ち歩詰めの再帰チェックはしない＝無限再帰防止・判定結果に影響なし）
function hasAnyLegalMove(st){
  for(let r=0;r<9;r++)for(let c=0;c<9;c++){
    const p=st.board[r][c];
    if(!p || p.color!==st.turn) continue;
    if(legalMoveTargets(st,r,c).length) return true;
  }
  const me=st.turn;
  for(const type of Object.keys(st.hands[me]||{})){
    if(!st.hands[me][type]) continue;
    for(const t of pseudoDropTargets(st,type)){
      const ns=applyMove(st,{drop:type,to:{r:t.r,c:t.c}});
      if(ns && !inCheck(ns,me)) return true;
    }
  }
  return false;
}
function isMate(st){ return inCheck(st,st.turn) && !hasAnyLegalMove(st); }

// すべての合法手（成り/不成りを別の手として数える）
function allLegalMoves(st){
  const res=[];
  for(let r=0;r<9;r++)for(let c=0;c<9;c++){
    const p=st.board[r][c];
    if(!p || p.color!==st.turn) continue;
    for(const t of legalMoveTargets(st,r,c)){
      const must=mustPromote(p,t.r), can=canPromote(p,r,t.r);
      if(!must) res.push({from:{r,c},to:{r:t.r,c:t.c},promote:false});
      if(must || can) res.push({from:{r,c},to:{r:t.r,c:t.c},promote:true});
    }
  }
  for(const type of Object.keys(st.hands[st.turn]||{})){
    if(!st.hands[st.turn][type]) continue;
    for(const t of legalDropTargets(st,type)) res.push({drop:type,to:{r:t.r,c:t.c}});
  }
  return res;
}

// --- USI形式（7g7f / P*5e）との変換 ---
function rcToUsi(r,c){ return (9-c)+String.fromCharCode(97+r); }
function sqToRC(file,rankCh){ return { r:rankCh.charCodeAt(0)-97, c:9-file }; }
function moveToUsi(mv){
  if(mv.drop) return mv.drop+"*"+rcToUsi(mv.to.r,mv.to.c);
  return rcToUsi(mv.from.r,mv.from.c)+rcToUsi(mv.to.r,mv.to.c)+(mv.promote?"+":"");
}
function usiToMove(st,u){
  if(!u || u.length<4) return null;
  if(u[1]==="*"){
    const type=u[0].toUpperCase();
    if(!KANJI[type] || type==="K") return null;
    const file=parseInt(u[2],10);
    if(!(file>=1 && file<=9)) return null;
    const to=sqToRC(file,u[3]);
    if(!inBoard(to.r,to.c)) return null;
    return {drop:type,to};
  }
  const ff=parseInt(u[0],10), tf=parseInt(u[2],10);
  if(!(ff>=1&&ff<=9) || !(tf>=1&&tf<=9)) return null;
  const from=sqToRC(ff,u[1]), to=sqToRC(tf,u[3]);
  if(!inBoard(from.r,from.c) || !inBoard(to.r,to.c)) return null;
  const promote=u.length>=5 && u[4]==="+";
  const p=st.board[from.r][from.c];
  if(!p) return null;
  if(!promote && mustPromote(p,to.r)) return null;        // 行き所のない駒になる手は不正
  if(promote && !canPromote(p,from.r,to.r)) return null;  // 成れない位置からの成りは不正
  return {from,to,promote};
}
function applyUsi(st,u){
  const mv=usiToMove(st,u);
  if(!mv) return null;
  return applyMove(st,mv);
}
// 完全な合法チェックつきの適用（棋譜読み込みの検証用）
function applyUsiStrict(st,u){
  const mv=usiToMove(st,u);
  if(!mv) return null;
  if(mv.drop){
    if(!legalDropTargets(st,mv.drop).some(t=>t.r===mv.to.r&&t.c===mv.to.c)) return null;
  }else{
    if(!legalMoveTargets(st,mv.from.r,mv.from.c).some(t=>t.r===mv.to.r&&t.c===mv.to.c)) return null;
  }
  return applyMove(st,mv);
}

// --- SFEN（局面の文字表記）の読み書き ---
function parseSfen(sfen){
  if(typeof sfen!=="string") return null;
  const f=sfen.trim().split(/\s+/);
  if(f.length<2) return null;
  const rows=f[0].split("/");
  if(rows.length!==9) return null;
  const board=Array.from({length:9},()=>Array(9).fill(null));
  for(let r=0;r<9;r++){
    let c=0, promoted=false;
    for(const ch of rows[r]){
      if(ch==="+"){ promoted=true; continue; }
      if(ch>="1" && ch<="9"){ c+=parseInt(ch,10); promoted=false; continue; }
      if(c>8) return null;
      const up=ch.toUpperCase();
      if("PLNSGBRK".indexOf(up)<0) return null;
      if(promoted && !PROMOTABLE[up]) return null;  // 金・玉は成れない
      board[r][c]={type:up, promoted, color: ch===up?"sente":"gote"};
      promoted=false; c++;
    }
    if(c!==9) return null;
  }
  const turn = f[1]==="w" ? "gote" : (f[1]==="b" ? "sente" : null);
  if(!turn) return null;
  const hands=emptyHands();
  const hp=f[2]||"-";
  if(hp!=="-"){
    let num="";
    for(const ch of hp){
      if(ch>="0" && ch<="9"){ num+=ch; continue; }
      const up=ch.toUpperCase();
      if("PLNSGBR".indexOf(up)<0) return null;
      const color = ch===up?"sente":"gote";
      const n=num?parseInt(num,10):1; num="";
      hands[color][up]=(hands[color][up]||0)+n;
    }
  }
  return {board, hands, turn, lastMove:null};
}
function toSfen(st){
  let rows=[];
  for(let r=0;r<9;r++){
    let s="", empty=0;
    for(let c=0;c<9;c++){
      const p=st.board[r][c];
      if(!p){ empty++; continue; }
      if(empty){ s+=empty; empty=0; }
      let ch=p.type;
      ch = p.color==="sente" ? ch.toUpperCase() : ch.toLowerCase();
      if(p.promoted) ch="+"+ch;
      s+=ch;
    }
    if(empty) s+=empty;
    rows.push(s);
  }
  const turn = st.turn==="sente" ? "b" : "w";
  let hand="";
  for(const col of ["sente","gote"]){
    for(const t of HAND_ORDER){
      const n=st.hands[col][t];
      if(n){ if(n>1) hand+=n; hand += col==="sente"?t.toUpperCase():t.toLowerCase(); }
    }
  }
  if(!hand) hand="-";
  return `${rows.join("/")} ${turn} ${hand} 1`;
}

// --- KIF / CSA 棋譜の読み込み ---
const ZEN_DIGIT="０１２３４５６７８９";
const KAN_DIGIT="〇一二三四五六七八九";
const PIECE_FROM_NAME={
  "歩":["P",false],"香":["L",false],"桂":["N",false],"銀":["S",false],"金":["G",false],
  "角":["B",false],"飛":["R",false],"玉":["K",false],"王":["K",false],
  "と":["P",true],"成香":["L",true],"杏":["L",true],"成桂":["N",true],"圭":["N",true],
  "成銀":["S",true],"全":["S",true],"馬":["B",true],"龍":["R",true],"竜":["R",true]
};
function zenToNum(ch){
  let i=ZEN_DIGIT.indexOf(ch); if(i>=0) return i;
  i="0123456789".indexOf(ch); if(i>=0) return i;
  return -1;
}
function kanToNum(ch){ return KAN_DIGIT.indexOf(ch); }

function parseKif(text){
  let st=parseSfen(HIRATE_SFEN);
  const moves=[];
  const notes={};   // 手数→コメント（KIFの「*」行。0=開始局面につくコメント）
  const END=/(投了|中断|持将棋|千日手|詰み|切れ負け|反則|入玉|不戦|封じ手)/;
  for(const raw of String(text).split(/\r?\n/)){
    const line=raw.replace(/　/g," ").trim();
    if(!line || line.startsWith("#")) continue;
    if(line.startsWith("*")){   // コメント行＝直前の手（まだ無ければ開始局面）につける
      const t=line.replace(/^\*\s?/,"");
      const k=moves.length;
      notes[k]=(notes[k]?notes[k]+"\n":"")+t;
      continue;
    }
    const m=line.match(/^(\d+)[\s.]+(.+)$/);
    if(!m) continue;                       // 見出しなどは飛ばす
    let body=m[2].trim().replace(/^[▲△☗☖]/,"");
    if(END.test(body)) break;
    body=body.replace(/\(\s*\d+:\d+[^)]*\)\s*$/,"").trim();   // 消費時間を除去
    let from=null;
    const fm=body.match(/\((\d)(\d)\)\s*$/);                   // 移動元 (77)
    if(fm){ from={file:parseInt(fm[1],10), rank:parseInt(fm[2],10)}; body=body.slice(0,fm.index).trim(); }
    let toFile, toRank, rest;
    if(body.startsWith("同")){
      if(!st.lastMove) return {error:`${m[1]}手目の「同」の前の手が分かりません`};
      toFile=9-st.lastMove.to.c; toRank=st.lastMove.to.r+1;
      rest=body.slice(1).trim();
    } else {
      const f=zenToNum(body[0]), k=kanToNum(body[1]);
      if(f<1 || k<1) return {error:`${m[1]}手目「${body}」のマス目を読めません`};
      toFile=f; toRank=k; rest=body.slice(2).trim();
    }
    let drop=false, promote=false;
    if(rest.endsWith("打")){ drop=true; rest=rest.slice(0,-1).trim(); }
    if(rest.endsWith("不成")){ rest=rest.slice(0,-2).trim(); }
    else if(rest.endsWith("成") && !PIECE_FROM_NAME[rest]){ promote=true; rest=rest.slice(0,-1).trim(); }
    const pn=PIECE_FROM_NAME[rest];
    if(!pn) return {error:`${m[1]}手目の駒「${rest}」が分かりません`};
    const toSq=String(toFile)+String.fromCharCode(96+toRank);
    const usi = (drop || !from)
      ? pn[0]+"*"+toSq
      : String(from.file)+String.fromCharCode(96+from.rank)+toSq+(promote?"+":"");
    const ns=applyUsiStrict(st,usi);
    if(!ns) return {error:`${m[1]}手目「${m[2].trim()}」が反則または読み取れない手です`};
    st=ns; moves.push(usi);
  }
  if(!moves.length) return {error:"指し手が見つかりませんでした（KIF形式の番号つきの行が必要です）"};
  return {initialSfen:HIRATE_SFEN, moves, notes};
}

function parseCsa(text){
  const CSA_PIECE={FU:["P",false],KY:["L",false],KE:["N",false],GI:["S",false],KI:["G",false],
    KA:["B",false],HI:["R",false],OU:["K",false],TO:["P",true],NY:["L",true],NK:["N",true],
    NG:["S",true],UM:["B",true],RY:["R",true]};
  let st=parseSfen(HIRATE_SFEN);
  const moves=[];
  for(const raw of String(text).split(/[\r\n,]+/)){
    const line=raw.trim();
    if(/^P[1-9]/.test(line) || /^P[+-]/.test(line)){
      return {error:"初期局面つきのCSA棋譜にはまだ対応していません（平手の棋譜は読めます）"};
    }
    const m=line.match(/^([+-])(\d\d)(\d\d)([A-Z]{2})$/);
    if(!m) continue;
    const code=CSA_PIECE[m[4]];
    if(!code) return {error:`CSAの駒記号「${m[4]}」が分かりません`};
    const tf=parseInt(m[3][0],10), tr=parseInt(m[3][1],10);
    if(!(tf>=1&&tf<=9) || !(tr>=1&&tr<=9)) return {error:`${moves.length+1}手目（CSA）のマス目が不正です`};
    const toSq=String(tf)+String.fromCharCode(96+tr);
    let usi;
    if(m[2]==="00"){
      usi=code[0]+"*"+toSq;
    } else {
      const ff=parseInt(m[2][0],10), fr=parseInt(m[2][1],10);
      if(!(ff>=1&&ff<=9) || !(fr>=1&&fr<=9)) return {error:`${moves.length+1}手目（CSA）のマス目が不正です`};
      const fromRC=sqToRC(ff,String.fromCharCode(96+fr));
      const p=st.board[fromRC.r][fromRC.c];
      if(!p) return {error:`${moves.length+1}手目（CSA）の移動元に駒がありません`};
      const promote=code[1] && !p.promoted;
      usi=String(ff)+String.fromCharCode(96+fr)+toSq+(promote?"+":"");
    }
    const ns=applyUsiStrict(st,usi);
    if(!ns) return {error:`${moves.length+1}手目（CSA）が反則または読み取れない手です`};
    st=ns; moves.push(usi);
  }
  if(!moves.length) return {error:"指し手が見つかりませんでした"};
  return {initialSfen:HIRATE_SFEN, moves};
}

// 形式を自動判別して読み込む（SFEN / KIF / CSA）
function parseRecord(text){
  const t=String(text||"").trim();
  if(!t) return {error:"中身が空です"};
  const firstTok=t.split(/\s+/)[0];
  if(firstTok.indexOf("/")>=0 && firstTok.split("/").length===9){
    const st=parseSfen(t);
    if(!st) return {error:"局面（SFEN）を読めませんでした"};
    return {initialSfen:toSfen(st), moves:[]};
  }
  if(/^[+-]\d{4}[A-Z]{2}$/m.test(t) || /^V2/.test(t) || /^N[+-]/m.test(t)){
    return parseCsa(t);
  }
  if(/^\s*\d+[\s.]+/m.test(t)){
    return parseKif(t);
  }
  if(/^[▲△☗☖]/m.test(t)){
    return {error:"KI2形式（移動元の数字がない棋譜）にはまだ対応していません。KIF形式で書き出してください"};
  }
  return {error:"形式が分かりませんでした（KIF・CSA・SFENに対応しています）"};
}

// --- KIF 棋譜の書き出し ---
function pieceKifName(p){
  if(p.type==="K") return "玉";
  return p.promoted ? KIF_PROMO[p.type] : KANJI[p.type];
}
function buildKif(initialSfen, moves, title, notes){
  const init=initialSfen||HIRATE_SFEN;
  let st=parseSfen(init);
  if(!st) return null;
  const nts=notes||{};
  const pushNote=(out,k)=>{ if(nts[k]){ for(const l of String(nts[k]).split(/\r?\n/)) out.push("*"+l); } };
  const out=[];
  if(title) out.push("# "+title);
  const hirate = init.split(/\s+/).slice(0,3).join(" ")===HIRATE_SFEN.split(/\s+/).slice(0,3).join(" ");
  if(hirate){ out.push("手合割：平手"); }
  else { out.push("手合割：その他（初期局面SFEN："+init+"）"); }
  out.push("手数----指手---------消費時間--");
  pushNote(out,0);   // 開始局面のメモ
  let prevTo=null, n=1;
  for(const u of moves||[]){
    const mv=usiToMove(st,u);
    if(!mv) break;
    const toF=9-mv.to.c, toR=mv.to.r+1;
    const same = prevTo && prevTo.r===mv.to.r && prevTo.c===mv.to.c;
    const sq = same ? "同　" : ZEN_DIGIT[toF]+KAN_DIGIT[toR];
    let txt;
    if(mv.drop){
      txt=sq+KANJI[mv.drop]+"打";
    } else {
      const p=st.board[mv.from.r][mv.from.c];
      if(!p) break;
      txt=sq+pieceKifName(p)+(mv.promote?"成":"")+"("+(9-mv.from.c)+(mv.from.r+1)+")";
    }
    out.push(String(n).padStart(4," ")+" "+txt);
    pushNote(out,n);   // この手につけたメモ（感想）
    const ns=applyMove(st,mv);
    if(!ns) break;
    prevTo={r:mv.to.r,c:mv.to.c}; st=ns; n++;
  }
  return out.join("\n")+"\n";
}

const ShogiCore={
  VERSION:"1.0.0",
  HIRATE_SFEN, KANJI, KIF_PROMO, HAND_ORDER, PROMOTABLE,
  opp, inBoard, cloneState, initialBoard, emptyHands, initialState,
  pieceMoves, pseudoMoveTargets, pseudoDropTargets,
  findKing, squareAttackedBy, inCheck,
  applyMove, inPromoZone, canPromote, mustPromote,
  legalMoveTargets, legalDropTargets, hasAnyLegalMove, isMate, allLegalMoves,
  rcToUsi, sqToRC, moveToUsi, usiToMove, applyUsi, applyUsiStrict,
  parseSfen, toSfen,
  parseKif, parseCsa, parseRecord, buildKif
};
if(typeof module!=="undefined" && module.exports) module.exports=ShogiCore;
if(typeof globalThis!=="undefined") globalThis.ShogiCore=ShogiCore;

})();
