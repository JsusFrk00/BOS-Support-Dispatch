const API_SECRET = "dispatch2026";
const EDITOR_PIN = "2012";
const PAGE_NAMES = ["Front Page", "The Lighter Side", "Games"];

const DEFAULT_PAPER = {
  name: "BOS Support Dispatch",
  tagline: "Announcements, updates & release notes for the BOS support team",
  edition: "Vol. 1, No. 1",
  editorNote: "",
  images: [{ id: "img1", src: null, caption: "" }, { id: "img2", src: null, caption: "" }],
  stories: [
    { id: 1, column: "top", headline: "Welcome to the BOS Support Dispatch", byline: "The Editor", body: "Your go-to source for team announcements, release notes, and support updates. Check back each day for the latest — everything you need to know, all in one place." },
    { id: 2, column: "left", headline: "Announcements", byline: "Staff Reporter", body: "Use this column for important team announcements, policy updates, and anything the whole team needs to know." },
    { id: 3, column: "right", headline: "Release Notes", byline: "Features Desk", body: "Use this column for release notes, version updates, and changes to watch out for." }
  ],
  lighterStories: [
    { id: 4, column: "top", headline: "This Week in the Office", byline: "The Lighter Side", body: "Share a fun story or lighthearted news from around the office. Keep it positive!" },
    { id: 5, column: "left", headline: "Overheard in the Office", byline: "Anonymous", body: "The funniest, strangest, or most quotable things your coworkers have said this week." },
    { id: 6, column: "right", headline: "Fun Fact of the Day", byline: "Did You Know?", body: "Share an interesting or amusing fact to brighten the day and spark some conversation." }
  ],
  games: {
    wordle: { word: "CODES", hint: "What developers write" },
    trivia: {
      question: "What does BSD stand for in BOS Support Dispatch?",
      options: ["BOS Support Dispatch", "Business Strategy Department", "Basic System Diagnostics", "Bureau of Support Development"],
      answer: 0
    },
    crossword: {
      grid: "##L####A##CATCH##C####H##",
      acrossClues: { "2": "To seize or grab" },
      downClues: { "1": "A door fastening device" }
    }
  }
};

let paper = null, draft = null, editMode = false, showPin = false, currentPage = 0;
let wordleState = { guesses: [], current: "", over: false, won: false };
let triviaState = { answered: false, selected: null };
let cwState = { userGrid: {}, selected: null, direction: "across", checked: {} };
let cwKeyHandler = null;

function formatDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function fileDate() {
  var n = new Date();
  return n.getFullYear() + "-" + String(n.getMonth()+1).padStart(2,"0") + "-" + String(n.getDate()).padStart(2,"0");
}
function esc(s) { return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function escNl(s) { return esc(s).replace(/\n/g,"<br>"); }

async function loadPaper() {
  try {
    var res = await fetch("/api/newspaper");
    var data = await res.json();
    paper = data || JSON.parse(JSON.stringify(DEFAULT_PAPER));
  } catch(e) { paper = JSON.parse(JSON.stringify(DEFAULT_PAPER)); }
  if (!paper.images) paper.images = JSON.parse(JSON.stringify(DEFAULT_PAPER.images));
  if (paper.editorNote === undefined) paper.editorNote = "";
  if (!paper.lighterStories) paper.lighterStories = JSON.parse(JSON.stringify(DEFAULT_PAPER.lighterStories));
  if (!paper.games) paper.games = JSON.parse(JSON.stringify(DEFAULT_PAPER.games));
  if (!paper.games.crossword) paper.games.crossword = JSON.parse(JSON.stringify(DEFAULT_PAPER.games.crossword));
  if (!paper.games.crossword.acrossClues) paper.games.crossword.acrossClues = {};
  if (!paper.games.crossword.downClues) paper.games.crossword.downClues = {};
  if (!paper.games.trivia.options) paper.games.trivia.options = ["","","",""];
  render();
}

async function savePaper() {
  var btn = document.getElementById("save-btn");
  if (btn) btn.textContent = "Saving...";
  try {
    var res = await fetch("/api/newspaper", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-secret": API_SECRET },
      body: JSON.stringify(draft)
    });
    if (!res.ok) throw new Error("Server error");
    paper = JSON.parse(JSON.stringify(draft));
    editMode = false; draft = null;
    wordleState = { guesses: [], current: "", over: false, won: false };
    triviaState = { answered: false, selected: null };
    cwState = { userGrid: {}, selected: null, direction: "across", checked: {} };
    showMsg("Edition saved! \u2713");
    render();
  } catch(e) {
    showMsg("Save failed. Try again.");
    if (btn) btn.textContent = "Save Edition";
  }
}

function showMsg(msg) {
  var el = document.getElementById("save-msg");
  if (el) { el.textContent = msg; setTimeout(function() { var e = document.getElementById("save-msg"); if(e) e.textContent = ""; }, 3000); }
}

function enterEdit() { showPin = true; render(); }
function exitEdit() { editMode = false; showPin = false; draft = null; render(); }

function checkPin() {
  var val = document.getElementById("pin-input").value;
  if (val === EDITOR_PIN) {
    showPin = false; editMode = true;
    draft = JSON.parse(JSON.stringify(paper));
    render();
  } else {
    document.getElementById("pin-error").style.display = "block";
    document.getElementById("pin-input").value = "";
  }
}

function goToPage(n) {
  if (n < 0 || n >= PAGE_NAMES.length) return;
  currentPage = n;
  if (n !== 2 && cwKeyHandler) { document.removeEventListener("keydown", cwKeyHandler); cwKeyHandler = null; cwState.selected = null; }
  render();
}

function updateDraft(key, value) { if (draft) draft[key] = value; }

function updateStory(id, field, value) {
  if (!draft) return;
  var s = draft.stories.find(function(x){return x.id===id;});
  if (!s) s = draft.lighterStories.find(function(x){return x.id===id;});
  if (s) s[field] = value;
}

function updateImage(id, field, value) {
  if (!draft) return;
  var img = draft.images.find(function(i){return i.id===id;});
  if (img) img[field] = value;
}

function updateGameField(game, field, value) { if (draft) draft.games[game][field] = value; }
function updateTriviaOption(idx, value) { if (draft) draft.games.trivia.options[idx] = value; }
function updateTriviaAnswer(idx) { if (draft) draft.games.trivia.answer = parseInt(idx); }

function updateCrosswordClue(dir, num, value) {
  if (!draft) return;
  if (dir === "across") draft.games.crossword.acrossClues[String(num)] = value;
  else draft.games.crossword.downClues[String(num)] = value;
}

function updateCrosswordCell(cellIndex, value) {
  if (!draft) return;
  var g = (draft.games.crossword.grid||"#########################").padEnd(25,"#").split("");
  var ch = (value === "" || value === "#") ? "#" : value.toUpperCase()[0];
  if (!/[A-Z#]/.test(ch)) return;
  g[cellIndex] = ch;
  draft.games.crossword.grid = g.join("");
  render();
}

function handleImageUpload(id, input) {
  var file = input.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) { updateImage(id, "src", e.target.result); render(); };
  reader.readAsDataURL(file);
}
function removeImage(id) { updateImage(id, "src", null); render(); }

// ===== CROSSWORD =====
function parseCrossword(gridStr) {
  var size = 5;
  var g = ((gridStr||"")).padEnd(25,"#");
  var cells = [];
  for (var i = 0; i < 25; i++) cells[i] = g[i] === "#" ? null : g[i].toUpperCase();
  function isBlack(r,c) { return r<0||r>=size||c<0||c>=size||cells[r*size+c]===null; }
  var numbers={}, acrossWords=[], downWords=[], num=1;
  for (var r=0;r<size;r++) {
    for (var c=0;c<size;c++) {
      if (isBlack(r,c)) continue;
      var sa=isBlack(r,c-1)&&!isBlack(r,c+1);
      var sd=isBlack(r-1,c)&&!isBlack(r+1,c);
      if (sa||sd) {
        numbers[r*size+c]=num;
        if (sa){var la=0,ca=c;while(!isBlack(r,ca)){la++;ca++;}acrossWords.push({number:num,row:r,col:c,length:la});}
        if (sd){var ld=0,rd=r;while(!isBlack(rd,c)){ld++;rd++;}downWords.push({number:num,row:r,col:c,length:ld});}
        num++;
      }
    }
  }
  return {cells:cells,numbers:numbers,acrossWords:acrossWords,downWords:downWords};
}

function getWordCells(word, dir) {
  var c=[];
  for(var i=0;i<word.length;i++) c.push(dir==="across"?word.row*5+word.col+i:(word.row+i)*5+word.col);
  return c;
}

function getWordContaining(parsed, cellIndex, dir) {
  var words=dir==="across"?parsed.acrossWords:parsed.downWords;
  for(var i=0;i<words.length;i++) if(getWordCells(words[i],dir).indexOf(cellIndex)!==-1) return words[i];
  return null;
}

function getHighlightedCells(parsed, sel, dir) {
  if (sel===null) return [];
  var word=getWordContaining(parsed,sel,dir);
  return word?getWordCells(word,dir):[sel];
}

function selectCrosswordCell(cellIndex) {
  var d=paper;
  var parsed=parseCrossword(d.games.crossword.grid);
  if (parsed.cells[cellIndex]===null) return;
  if (cwState.selected===cellIndex) {
    var other=cwState.direction==="across"?"down":"across";
    if (getWordContaining(parsed,cellIndex,other)) cwState.direction=other;
  } else {
    cwState.selected=cellIndex;
    if (!getWordContaining(parsed,cellIndex,cwState.direction)) cwState.direction=cwState.direction==="across"?"down":"across";
  }
  if (cwKeyHandler) document.removeEventListener("keydown",cwKeyHandler);
  cwKeyHandler=function(e){cwHandleKey(e);};
  document.addEventListener("keydown",cwKeyHandler);
  render();
}

function cwHandleKey(e) {
  if (cwState.selected===null) return;
  var parsed=parseCrossword(paper.games.crossword.grid);
  if (e.key==="Backspace") {
    e.preventDefault();
    if (cwState.userGrid[cwState.selected]) { cwState.userGrid[cwState.selected]=""; }
    else { var hi=getHighlightedCells(parsed,cwState.selected,cwState.direction); var idx=hi.indexOf(cwState.selected); if(idx>0) cwState.selected=hi[idx-1]; }
    cwState.checked={};render();
  } else if (/^[a-zA-Z]$/.test(e.key)) {
    e.preventDefault();
    cwState.userGrid[cwState.selected]=e.key.toUpperCase();
    cwState.checked={};
    var hi2=getHighlightedCells(parsed,cwState.selected,cwState.direction);
    var idx2=hi2.indexOf(cwState.selected);
    if(idx2<hi2.length-1) cwState.selected=hi2[idx2+1];
    render();
  }
}

function checkCrossword() {
  var parsed=parseCrossword(paper.games.crossword.grid);
  var result={};
  for(var i=0;i<25;i++){
    if(parsed.cells[i]===null) continue;
    var u=cwState.userGrid[i]||"";
    result[i]=u===parsed.cells[i]?"correct":(u?"wrong":"empty");
  }
  cwState.checked=result;render();
}

function clearCrossword() {
  cwState={userGrid:{},selected:null,direction:"across",checked:{}};
  if(cwKeyHandler){document.removeEventListener("keydown",cwKeyHandler);cwKeyHandler=null;}
  render();
}

// ===== WORDLE =====
function wordleKey(letter) {
  if(wordleState.over||wordleState.current.length>=5) return;
  wordleState.current+=letter;render();
}
function wordleBackspace() {
  if(wordleState.over||wordleState.current.length===0) return;
  wordleState.current=wordleState.current.slice(0,-1);render();
}
function wordleSubmit() {
  if(wordleState.over||wordleState.current.length!==5) return;
  var word=(paper.games.wordle.word||"CODES").toUpperCase();
  wordleState.guesses.push(wordleState.current);
  if(wordleState.current===word){wordleState.won=true;wordleState.over=true;}
  else if(wordleState.guesses.length>=6) wordleState.over=true;
  wordleState.current="";render();
}
function getWordleResult(word,guess) {
  var res=["absent","absent","absent","absent","absent"];
  var wa=word.split(""),ga=guess.split("");
  for(var i=0;i<5;i++){if(ga[i]===wa[i]){res[i]="correct";wa[i]=null;ga[i]=null;}}
  for(var j=0;j<5;j++){if(!ga[j])continue;var wi=wa.indexOf(ga[j]);if(wi!==-1){res[j]="present";wa[wi]=null;}}
  return res;
}
function getWordleKeyStates(word,guesses) {
  var states={};
  guesses.forEach(function(guess){
    var res=getWordleResult(word,guess);
    for(var i=0;i<5;i++){var l=guess[i];if(res[i]==="correct")states[l]="correct";else if(res[i]==="present"&&states[l]!=="correct")states[l]="present";else if(!states[l])states[l]="absent";}
  });
  return states;
}

// ===== TRIVIA =====
function selectTrivia(index) {
  if(triviaState.answered) return;
  triviaState.selected=index;triviaState.answered=true;render();
}

// ===== ARCHIVE =====
function archiveEdition() {
  var d=paper;
  var top=d.stories.find(function(s){return s.column==="top";});
  var left=d.stories.find(function(s){return s.column==="left";});
  var right=d.stories.find(function(s){return s.column==="right";});
  var ltop=d.lighterStories.find(function(s){return s.column==="top";});
  var lleft=d.lighterStories.find(function(s){return s.column==="left";});
  var lright=d.lighterStories.find(function(s){return s.column==="right";});

  function sb(s) {
    if(!s) return "<div class=\"col\"></div>";
    return "<div class=\"col\"><h3>"+esc(s.headline)+"</h3><div class=\"byline\" style=\"margin-bottom:2px\">By "+esc(s.byline)+"</div><div style=\"height:1px;background:#bbb;margin:8px 0 10px;\"></div><p>"+escNl(s.body)+"</p></div>";
  }

  var styles="*{box-sizing:border-box;margin:0;padding:0;}body{background:#f5f0e8;font-family:'Libre Baskerville',serif;padding-bottom:40px;}.paper{max-width:900px;margin:0 auto;padding:0 16px;}.banner{background:#1a1a1a;color:#f5f0e8;text-align:center;padding:6px;font-size:0.7rem;letter-spacing:0.1em;}.masthead{text-align:center;border-bottom:4px double #222;padding-bottom:10px;margin-top:24px;}.masthead h1{font-family:'UnifrakturMaguntia',cursive;font-size:clamp(2.5rem,8vw,4.5rem);color:#111;line-height:1.1;}.masthead-bar{display:flex;justify-content:space-between;margin-top:6px;padding:4px 0;border-top:1px solid #888;border-bottom:1px solid #888;font-size:0.7rem;color:#444;}.top-story{padding:18px 0 14px;border-bottom:2px solid #555;}.top-story-head{text-align:center;margin-bottom:12px;}.top-story-head h2{font-family:'Playfair Display',serif;font-size:clamp(1.6rem,4vw,2.4rem);font-weight:900;color:#111;line-height:1.2;}.divider-line{width:60px;height:2px;background:#555;margin:10px auto 4px;}.byline{font-size:0.72rem;color:#666;text-transform:uppercase;letter-spacing:0.12em;margin-top:4px;}.body-text{font-size:1rem;line-height:1.75;color:#222;column-count:2;column-gap:28px;column-rule:1px solid #bbb;margin-top:12px;}.drop-cap p::first-letter{float:left;font-family:'Playfair Display',serif;font-size:3.8em;line-height:0.8;padding-right:6px;padding-top:4px;font-weight:900;color:#111;}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-top:16px;}.col{padding:0 20px 20px;}.col:last-child{border-left:1px solid #999;}.col h3{font-family:'Playfair Display',serif;font-size:1.25rem;font-weight:700;margin-bottom:4px;color:#111;}.col p{font-size:0.88rem;line-height:1.7;color:#333;}.editor-note{border-top:2px solid #555;border-bottom:2px solid #555;margin-top:20px;padding:16px 0;display:flex;gap:24px;}.editor-note-label{font-family:'Playfair Display',serif;font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#555;white-space:nowrap;}.editor-note-text{font-size:0.88rem;line-height:1.7;color:#333;font-style:italic;}.section-break{border-top:4px double #222;margin-top:40px;padding-top:16px;text-align:center;font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:#555;letter-spacing:0.15em;margin-bottom:16px;}.footer{border-top:3px double #555;margin-top:20px;padding-top:8px;display:flex;justify-content:space-between;font-size:0.65rem;color:#888;}";

  var html="<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\"/>\n<title>BOS Support Dispatch \u2014 "+formatDate()+"</title>\n<link href=\"https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap\" rel=\"stylesheet\"/>\n<style>"+styles+"</style>\n</head>\n<body>\n"
    +"<div class=\"banner\">BOS Support Dispatch \u2014 Archived Edition \u2014 "+formatDate()+"</div>\n"
    +"<div class=\"paper\">\n"
    +"<div class=\"masthead\"><h1>"+esc(d.name)+"</h1><div class=\"masthead-bar\"><span>"+esc(d.edition)+"</span><span style=\"font-style:italic\">"+esc(d.tagline)+"</span><span>Est. "+new Date().getFullYear()+"</span></div></div>\n";

  if(top){html+="<div class=\"top-story\"><div class=\"top-story-head\"><h2>"+esc(top.headline)+"</h2><div class=\"divider-line\"></div><div class=\"byline\">By "+esc(top.byline)+"</div></div><div class=\"body-text drop-cap\"><p>"+escNl(top.body)+"</p></div></div>\n";}
  html+="<div class=\"two-col\">"+sb(left)+sb(right)+"</div>\n";
  if(d.editorNote){html+="<div class=\"editor-note\"><span class=\"editor-note-label\">From the Editor</span><span class=\"editor-note-text\">"+escNl(d.editorNote)+"</span></div>\n";}
  html+="<div class=\"section-break\">\u2042 The Lighter Side \u2042</div>\n";
  if(ltop){html+="<div class=\"top-story\"><div class=\"top-story-head\"><h2>"+esc(ltop.headline)+"</h2><div class=\"divider-line\"></div><div class=\"byline\">By "+esc(ltop.byline)+"</div></div><div class=\"body-text drop-cap\"><p>"+escNl(ltop.body)+"</p></div></div>\n";}
  html+="<div class=\"two-col\">"+sb(lleft)+sb(lright)+"</div>\n";
  html+="<div class=\"footer\"><span>"+esc(d.name)+" \u00B7 "+formatDate()+"</span><span>For internal use only</span></div>\n</div>\n</body>\n</html>";

  var blob=new Blob([html],{type:"text/html"});
  var a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="BOS-Support-Dispatch-"+fileDate()+".html";
  a.click();URL.revokeObjectURL(a.href);
}

// ===== PHOTO =====
function renderPhoto(img) {
  var caption='<input class="edit-field" type="text" value="'+esc(img.caption)+'" oninput="updateImage(\''+img.id+'\', \'caption\', this.value)" style="margin-top:4px;font-style:italic;font-size:0.72rem;" />';
  if(editMode){
    if(img.src){return '<div class="photo-wrap"><img src="'+img.src+'" style="width:100%;max-height:220px;object-fit:cover;border:1px solid #ccc;" /><button class="remove-photo" onclick="removeImage(\''+img.id+'\')">&#x2715;</button></div>'+caption;}
    return '<label class="photo-upload-zone"><input type="file" accept="image/*" style="display:none" onchange="handleImageUpload(\''+img.id+'\', this)" /><span class="icon">&#128247;</span><span class="photo-upload-label">Click to upload photo</span></label>'+caption;
  }
  if(!img.src) return "";
  return '<img src="'+img.src+'" alt="'+esc(img.caption)+'" style="width:100%;max-height:220px;object-fit:cover;display:block;border:1px solid #ccc;" />'+(img.caption?'<p class="photo-caption">'+esc(img.caption)+"</p>":'');
}

// ===== RENDER =====
function render() {
  var d=editMode?draft:paper;
  var html=renderToolbar()+renderPin()+renderNav();
  if(!showPin){
    if(currentPage===0) html+=renderFrontPage(d);
    else if(currentPage===1) html+=renderLighterSide(d);
    else html+=renderGames(d);
  }
  document.getElementById("app").innerHTML=html;
}

function renderToolbar() {
  return '<div class="toolbar"><span>\u2600 '+formatDate()+'</span><div class="toolbar-btns">'
    +'<span id="save-msg" class="save-msg"></span>'
    +(editMode
      ?'<button class="archive-btn" onclick="archiveEdition()">\u2193 Archive</button>'
        +'<button id="save-btn" class="save-btn" onclick="savePaper()">Save Edition</button>'
        +'<button class="edit-btn" onclick="exitEdit()">Cancel</button>'
      :'<button class="edit-btn" onclick="enterEdit()">Editor Mode</button>')
    +'</div></div>';
}

function renderPin() {
  if(!showPin) return "";
  return '<div class="modal-overlay"><div class="modal"><h3>Editor Access</h3><p>Enter your editor PIN to continue</p>'
    +'<input id="pin-input" class="pin-input" type="password" placeholder="PIN" onkeydown="if(event.key===\'Enter\')checkPin()" />'
    +'<div id="pin-error" class="pin-error">Incorrect PIN. Try again.</div>'
    +'<button class="save-btn" style="width:100%" onclick="checkPin()">Unlock Editor</button>'
    +'<p class="modal-hint">Contact your editor for the PIN</p>'
    +'<button class="cancel-link" onclick="exitEdit()">Cancel</button></div></div>';
}

function renderNav() {
  var html='<div class="page-nav">'
    +'<button class="nav-arrow" onclick="goToPage('+(currentPage-1)+')" '+(currentPage===0?'disabled':'')+'>\u25c4</button>'
    +'<span class="page-names">';
  PAGE_NAMES.forEach(function(name,i){
    html+='<span class="page-name '+(i===currentPage?'active':'')+'" onclick="goToPage('+i+')">'+(i===currentPage?'<strong>':'')+name+(i===currentPage?'</strong>':'')+'</span>';
    if(i<PAGE_NAMES.length-1) html+='<span class="page-sep"> | </span>';
  });
  html+='</span><button class="nav-arrow" onclick="goToPage('+(currentPage+1)+')" '+(currentPage===PAGE_NAMES.length-1?'disabled':'')+'>\u25ba</button></div>';
  return html;
}

function renderMasthead(d, subtitle) {
  var html='<div class="masthead">';
  if(editMode&&currentPage===0){
    html+='<input class="edit-field" type="text" value="'+esc(d.name)+'" oninput="updateDraft(\'name\', this.value)" style="font-family:UnifrakturMaguntia,cursive;font-size:clamp(2.5rem,8vw,4.5rem);text-align:center;letter-spacing:0.02em;color:#111;" />';
  } else {
    html+='<h1>'+esc(d.name)+'</h1>';
  }
  html+='<div class="masthead-bar">';
  if(editMode&&currentPage===0){
    html+='<input class="edit-field" type="text" value="'+esc(d.edition)+'" oninput="updateDraft(\'edition\', this.value)" style="width:160px;font-size:0.7rem;" />';
    html+='<input class="edit-field" type="text" value="'+esc(d.tagline)+'" oninput="updateDraft(\'tagline\', this.value)" style="flex:1;margin:0 12px;font-size:0.7rem;font-style:italic;text-align:center;" />';
  } else {
    html+='<span>'+esc(d.edition)+'</span>';
    html+='<span style="font-style:italic;font-family:\'Playfair Display\',serif;font-weight:700;color:#555;">'+(subtitle||esc(d.tagline))+'</span>';
  }
  html+='<span>Est. '+new Date().getFullYear()+'</span></div></div>';
  return html;
}

function renderStorySection(stories, showPhotos, d) {
  var top=stories.find(function(s){return s.column==="top";});
  var left=stories.find(function(s){return s.column==="left";});
  var right=stories.find(function(s){return s.column==="right";});
  var html="";

  if(top){
    html+='<div class="top-story"><div class="top-story-head">';
    if(editMode){html+='<input class="edit-field" type="text" value="'+esc(top.headline)+'" oninput="updateStory('+top.id+', \'headline\', this.value)" style="font-family:\'Playfair Display\',serif;font-size:clamp(1.6rem,4vw,2.4rem);font-weight:900;text-align:center;color:#111;" />';}
    else{html+='<h2>'+esc(top.headline)+'</h2>';}
    html+='<div class="divider-line"></div><div class="byline">By ';
    if(editMode){html+='<input class="edit-field" type="text" value="'+esc(top.byline)+'" oninput="updateStory('+top.id+', \'byline\', this.value)" style="font-size:0.72rem;display:inline-block;width:auto;min-width:120px;" />';}
    else{html+=esc(top.byline);}
    html+='</div></div>';
    if(editMode){html+='<textarea class="edit-field" oninput="updateStory('+top.id+', \'body\', this.value)" rows="4">'+esc(top.body)+'</textarea>';}
    else{html+='<div class="body-text drop-cap"><p>'+escNl(top.body)+'</p></div>';}
    html+='</div>';
  }

  if(showPhotos&&d){
    var hasPhotos=d.images.some(function(i){return i.src;});
    if(editMode||hasPhotos){
      html+='<div class="photo-strip">';
      d.images.forEach(function(img){html+='<div class="photo-item">'+renderPhoto(img)+'</div>';});
      html+='</div>';
    }
  }

  html+='<div class="two-col">';
  [left,right].forEach(function(story){
    if(!story){html+='<div class="col"></div>';return;}
    html+='<div class="col">';
    if(editMode){html+='<input class="edit-field" type="text" value="'+esc(story.headline)+'" oninput="updateStory('+story.id+', \'headline\', this.value)" style="font-family:\'Playfair Display\',serif;font-size:1.25rem;font-weight:700;color:#111;" />';}
    else{html+='<h3>'+esc(story.headline)+'</h3>';}
    html+='<div class="byline" style="margin-bottom:2px">By ';
    if(editMode){html+='<input class="edit-field" type="text" value="'+esc(story.byline)+'" oninput="updateStory('+story.id+', \'byline\', this.value)" style="font-size:0.68rem;display:inline-block;width:auto;min-width:100px;" />';}
    else{html+=esc(story.byline);}
    html+='</div><div class="col-divider"></div>';
    if(editMode){html+='<textarea class="edit-field" oninput="updateStory('+story.id+', \'body\', this.value)" rows="5">'+esc(story.body)+'</textarea>';}
    else{html+='<p>'+escNl(story.body)+'</p>';}
    html+='</div>';
  });
  html+='</div>';
  return html;
}

function renderFrontPage(d) {
  var html='<div class="paper">'+renderMasthead(d,null)+renderStorySection(d.stories,true,d);
  var note=d.editorNote||"";
  if(editMode||note){
    html+='<div class="editor-note"><span class="editor-note-label">From the Editor</span>';
    if(editMode){html+='<textarea class="edit-field" style="font-style:italic;" oninput="updateDraft(\'editorNote\', this.value)" rows="3" placeholder="Write a note to your team...">'+esc(note)+'</textarea>';}
    else{html+='<span class="editor-note-text">'+escNl(note)+'</span>';}
    html+='</div>';
  }
  html+='<div class="footer"><span>'+esc(d.name)+' \u00B7 '+formatDate()+'</span><span>Front Page</span></div></div>';
  return html;
}

function renderLighterSide(d) {
  var html='<div class="paper">'+renderMasthead(d,'\u2042 The Lighter Side \u2042')+renderStorySection(d.lighterStories,false,null);
  html+='<div class="footer"><span>'+esc(d.name)+' \u00B7 '+formatDate()+'</span><span>The Lighter Side</span></div></div>';
  return html;
}

function renderGames(d) {
  var html='<div class="paper">'+renderMasthead(d,'\u265f Games & Puzzles');
  html+=editMode?renderGamesEditor(d):renderGamesPlayer(d);
  html+='<div class="footer"><span>'+esc(d.name)+' \u00B7 '+formatDate()+'</span><span>Games & Puzzles</span></div></div>';
  return html;
}

function renderGamesEditor(d) {
  var g=d.games;
  var html='<div class="games-editor">';

  // Wordle
  html+='<div class="game-section"><h3 class="game-title">\uD83D\uDD24 Wordle</h3>'
    +'<div class="game-editor-row"><label>Today\'s 5-letter word:</label>'
    +'<input class="edit-field" type="text" maxlength="5" value="'+esc(g.wordle.word)+'" oninput="updateGameField(\'wordle\',\'word\',this.value.toUpperCase())" style="text-transform:uppercase;width:100px;letter-spacing:0.2em;" /></div>'
    +'<div class="game-editor-row"><label>Hint (optional):</label>'
    +'<input class="edit-field" type="text" value="'+esc(g.wordle.hint)+'" oninput="updateGameField(\'wordle\',\'hint\',this.value)" /></div></div>';

  // Trivia
  html+='<div class="game-section"><h3 class="game-title">\u2753 Trivia</h3>'
    +'<div class="game-editor-row"><label>Question:</label>'
    +'<textarea class="edit-field" rows="2" oninput="updateGameField(\'trivia\',\'question\',this.value)">'+esc(g.trivia.question)+'</textarea></div>';
  for(var i=0;i<4;i++){
    html+='<div class="game-editor-row trivia-opt-row">'
      +'<input type="radio" name="trivia-answer" value="'+i+'" '+(g.trivia.answer===i?'checked':'')
      +' onchange="updateTriviaAnswer('+i+')" title="Mark as correct answer" />'
      +'<input class="edit-field" type="text" value="'+esc((g.trivia.options||[])[i]||'')+'" oninput="updateTriviaOption('+i+',this.value)" placeholder="Option '+(i+1)+'" style="flex:1;margin-left:8px;" /></div>';
  }
  html+='<p class="game-hint-text">Select the radio button next to the correct answer.</p></div>';

  // Crossword
  var parsed=parseCrossword(g.crossword.grid||"#########################");
  html+='<div class="game-section"><h3 class="game-title">\uD83D\uDDD6 Mini Crossword (5\u00d75)</h3>'
    +'<p class="game-hint-text">Type a letter in each cell, or # for a black square. Numbers are auto-generated.</p>'
    +'<div class="cw-editor-grid">';
  for(var ci=0;ci<25;ci++){
    var cellVal=parsed.cells[ci];
    var num=parsed.numbers[ci];
    var isBlk=cellVal===null;
    html+='<div class="cw-editor-cell'+(isBlk?' cw-black':'')+'">';
    if(num) html+='<span class="cw-cell-num">'+num+'</span>';
    html+='<input type="text" maxlength="2" value="'+(isBlk?'#':(cellVal||''))+'"'
      +' oninput="updateCrosswordCell('+ci+',this.value)"'
      +' style="width:100%;height:100%;text-align:center;background:transparent;border:none;font-family:\'Playfair Display\',serif;font-weight:700;font-size:0.9rem;text-transform:uppercase;color:'+(isBlk?'#aaa':'#111')+';" /></div>';
  }
  html+='</div>';

  if(parsed.acrossWords.length>0){
    html+='<div class="cw-clues-editor"><strong>Across Clues:</strong>';
    parsed.acrossWords.forEach(function(w){
      html+='<div class="game-editor-row"><label>'+w.number+'-Across ('+w.length+' letters):</label>'
        +'<input class="edit-field" type="text" value="'+esc((g.crossword.acrossClues||{})[String(w.number)]||'')+'"'
        +' oninput="updateCrosswordClue(\'across\','+w.number+',this.value)" /></div>';
    });
    html+='</div>';
  }
  if(parsed.downWords.length>0){
    html+='<div class="cw-clues-editor"><strong>Down Clues:</strong>';
    parsed.downWords.forEach(function(w){
      html+='<div class="game-editor-row"><label>'+w.number+'-Down ('+w.length+' letters):</label>'
        +'<input class="edit-field" type="text" value="'+esc((g.crossword.downClues||{})[String(w.number)]||'')+'"'
        +' oninput="updateCrosswordClue(\'down\','+w.number+',this.value)" /></div>';
    });
    html+='</div>';
  }
  html+='</div></div>';
  return html;
}

function renderGamesPlayer(d) {
  var g=d.games;
  var word=(g.wordle.word||"CODES").toUpperCase();
  var html='<div class="games-player"><div class="games-top-row">';

  // Wordle
  html+='<div class="game-card">';
  html+='<h3 class="game-title">\uD83D\uDD24 Wordle</h3>';
  if(g.wordle.hint) html+='<p class="game-hint-text">\uD83D\uDCA1 '+esc(g.wordle.hint)+'</p>';
  html+='<div class="wordle-board">';
  for(var row=0;row<6;row++){
    html+='<div class="wordle-row">';
    var guess=wordleState.guesses[row];
    var isCur=row===wordleState.guesses.length&&!wordleState.over;
    for(var col=0;col<5;col++){
      var letter="",cls="wordle-cell";
      if(guess){letter=guess[col];var res=getWordleResult(word,guess);cls+=" wordle-"+res[col];}
      else if(isCur){letter=wordleState.current[col]||"";cls+=" wordle-current";}
      else{cls+=" wordle-empty";}
      html+='<div class="'+cls+'">'+letter+'</div>';
    }
    html+='</div>';
  }
  html+='</div>';
  if(wordleState.over){
    if(wordleState.won) html+='<p class="wordle-msg wordle-win">\uD83C\uDF89 Got it in '+wordleState.guesses.length+'!</p>';
    else html+='<p class="wordle-msg wordle-lose">The word was <strong>'+word+'</strong></p>';
  }
  var kStates=getWordleKeyStates(word,wordleState.guesses);
  var kRows=[["Q","W","E","R","T","Y","U","I","O","P"],["A","S","D","F","G","H","J","K","L"],["ENT","Z","X","C","V","B","N","M","\u232b"]];
  html+='<div class="wordle-keyboard">';
  kRows.forEach(function(kr){
    html+='<div class="wordle-key-row">';
    kr.forEach(function(key){
      var ks=kStates[key]||"";
      var isSpecial=key==="ENT"||key==="\u232b";
      var oc=isSpecial?(key==="ENT"?"wordleSubmit()":"wordleBackspace()"):"wordleKey('"+key+"')";
      html+='<button class="wordle-key'+(isSpecial?' wordle-wide':'')+(ks?' wk-'+ks:'')+'" onclick="'+oc+'">'+key+'</button>';
    });
    html+='</div>';
  });
  html+='</div></div>';

  // Trivia
  var t=g.trivia;
  html+='<div class="game-card"><h3 class="game-title">\u2753 Trivia</h3>'
    +'<p class="trivia-question">'+esc(t.question)+'</p>'
    +'<div class="trivia-options">';
  for(var ti=0;ti<(t.options||[]).length;ti++){
    if(!t.options[ti]) continue;
    var tcls="trivia-option";
    if(triviaState.answered){if(ti===t.answer)tcls+=" trivia-correct";else if(ti===triviaState.selected)tcls+=" trivia-wrong";}
    html+='<button class="'+tcls+'" onclick="selectTrivia('+ti+')">'+esc(t.options[ti])+'</button>';
  }
  html+='</div>';
  if(triviaState.answered){
    if(triviaState.selected===t.answer) html+='<p class="trivia-result trivia-win">\u2713 Correct!</p>';
    else html+='<p class="trivia-result trivia-lose">Answer: <strong>'+esc((t.options||[])[t.answer]||"")+'</strong></p>';
  }
  html+='</div></div>';

  // Crossword (full width)
  var parsed=parseCrossword(g.crossword.grid);
  var highlighted=getHighlightedCells(parsed,cwState.selected,cwState.direction);
  html+='<div class="game-card game-card-cw"><h3 class="game-title">\uD83D\uDDD6 Mini Crossword</h3>';
  html+='<div class="cw-game">';

  html+='<div class="cw-grid">';
  for(var ci2=0;ci2<25;ci2++){
    var cell2=parsed.cells[ci2];
    if(cell2===null){html+='<div class="cw-cell cw-black"></div>';continue;}
    var num2=parsed.numbers[ci2];
    var ul=cwState.userGrid[ci2]||"";
    var ck=cwState.checked[ci2]||"";
    var isSel=cwState.selected===ci2;
    var isHi=highlighted.indexOf(ci2)!==-1;
    var cc="cw-cell";
    if(isSel)cc+=" cw-selected";else if(isHi)cc+=" cw-highlighted";
    if(ck==="correct")cc+=" cw-correct";else if(ck==="wrong")cc+=" cw-wrong";
    html+='<div class="'+cc+'" onclick="selectCrosswordCell('+ci2+')">';
    if(num2) html+='<span class="cw-cell-num">'+num2+'</span>';
    html+='<span class="cw-letter">'+ul+'</span></div>';
  }
  html+='</div>';

  html+='<div class="cw-controls"><button class="cw-btn" onclick="checkCrossword()">Check</button><button class="cw-btn" onclick="clearCrossword()">Clear</button></div>';

  var ac=g.crossword.acrossClues||{};
  var dc=g.crossword.downClues||{};
  html+='<div class="cw-clues">';
  if(parsed.acrossWords.length>0){
    html+='<div class="cw-clue-col"><p class="cw-dir-label">Across</p>';
    parsed.acrossWords.forEach(function(w){
      var clue=ac[String(w.number)]||"...";
      var isAct=cwState.direction==="across"&&highlighted.length>0&&getWordCells(w,"across").indexOf(cwState.selected)!==-1;
      html+='<div class="cw-clue'+(isAct?' cw-clue-active':'')+'">'+w.number+'. '+esc(clue)+'</div>';
    });
    html+='</div>';
  }
  if(parsed.downWords.length>0){
    html+='<div class="cw-clue-col"><p class="cw-dir-label">Down</p>';
    parsed.downWords.forEach(function(w){
      var clue=dc[String(w.number)]||"...";
      var isAct=cwState.direction==="down"&&highlighted.length>0&&getWordCells(w,"down").indexOf(cwState.selected)!==-1;
      html+='<div class="cw-clue'+(isAct?' cw-clue-active':'')+'">'+w.number+'. '+esc(clue)+'</div>';
    });
    html+='</div>';
  }
  html+='</div></div></div></div>';
  return html;
}

loadPaper();
