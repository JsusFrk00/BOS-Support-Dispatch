const API_SECRET = "dispatch2026";
const EDITOR_PIN = "2012";

const DEFAULT_PAPER = {
  name: "BOS Support Dispatch",
  tagline: "Announcements, updates & release notes for the BOS support team",
  edition: "Vol. 1, No. 1",
  editorNote: "",
  images: [
    { id: "img1", src: null, caption: "Photo caption here" },
    { id: "img2", src: null, caption: "Photo caption here" }
  ],
  stories: [
    { id: 1, column: "top", headline: "Welcome to the BOS Support Dispatch", byline: "The Editor", body: "Your go-to source for team announcements, release notes, and support updates. Check back each day for the latest from the BOS support team — everything you need to know, all in one place." },
    { id: 2, column: "left", headline: "How to Use the BSD", byline: "Staff Reporter", body: "The editor updates this paper with announcements, release notes, and anything else the team needs to know. Check it daily to stay current. Use the Editor Mode button to make updates if you have the PIN." },
    { id: 3, column: "right", headline: "Release Notes", byline: "Features Desk", body: "This column is a great place for release notes and version updates. Keep your team informed about what changed, what's new, and what to watch out for." }
  ]
};

let paper = null, draft = null, editMode = false, showPin = false;

function formatDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function fileDate() {
  var now = new Date();
  return now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
}

async function loadPaper() {
  try {
    var res = await fetch("/api/newspaper");
    var data = await res.json();
    paper = data || JSON.parse(JSON.stringify(DEFAULT_PAPER));
  } catch(e) {
    paper = JSON.parse(JSON.stringify(DEFAULT_PAPER));
  }
  if (!paper.images) paper.images = JSON.parse(JSON.stringify(DEFAULT_PAPER.images));
  if (paper.editorNote === undefined) paper.editorNote = "";
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
    editMode = false;
    draft = null;
    showMsg("Edition saved! \u2713");
    render();
  } catch(e) {
    showMsg("Save failed. Try again.");
    if (btn) btn.textContent = "Save Edition";
  }
}

function archiveEdition() {
  var d = paper;
  var top = d.stories.find(function(s) { return s.column === "top"; });
  var left = d.stories.find(function(s) { return s.column === "left"; });
  var right = d.stories.find(function(s) { return s.column === "right"; });

  var styles = "* { box-sizing: border-box; margin: 0; padding: 0; }\n"
    + "body { background: #f5f0e8; min-height: 100vh; padding: 0 0 60px; font-family: 'Libre Baskerville', serif; }\n"
    + ".paper { max-width: 900px; margin: 0 auto; padding: 0 16px; }\n"
    + ".masthead { text-align: center; border-bottom: 4px double #222; padding-bottom: 10px; margin-top: 24px; }\n"
    + ".masthead h1 { font-family: 'UnifrakturMaguntia', cursive; font-size: clamp(2.5rem,8vw,4.5rem); letter-spacing: 0.02em; color: #111; line-height: 1.1; }\n"
    + ".masthead-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding: 4px 0; border-top: 1px solid #888; border-bottom: 1px solid #888; font-size: 0.7rem; color: #444; letter-spacing: 0.05em; }\n"
    + ".top-story { padding: 18px 0 14px; border-bottom: 2px solid #555; }\n"
    + ".top-story-head { text-align: center; margin-bottom: 12px; }\n"
    + ".top-story-head h2 { font-family: 'Playfair Display', serif; font-size: clamp(1.6rem,4vw,2.4rem); font-weight: 900; color: #111; line-height: 1.2; }\n"
    + ".divider-line { width: 60px; height: 2px; background: #555; margin: 10px auto 4px; }\n"
    + ".byline { font-size: 0.72rem; color: #666; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 4px; }\n"
    + ".body-text { font-size: 1rem; line-height: 1.75; color: #222; column-count: 2; column-gap: 28px; column-rule: 1px solid #bbb; margin-top: 12px; }\n"
    + ".drop-cap p::first-letter { float: left; font-family: 'Playfair Display', serif; font-size: 3.8em; line-height: 0.8; padding-right: 6px; padding-top: 4px; font-weight: 900; color: #111; }\n"
    + ".two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-top: 16px; }\n"
    + ".col { padding: 0 20px 20px; }\n"
    + ".col:last-child { border-left: 1px solid #999; }\n"
    + ".col h3 { font-family: 'Playfair Display', serif; font-size: 1.25rem; font-weight: 700; margin-bottom: 4px; line-height: 1.3; color: #111; }\n"
    + ".col-divider { width: 100%; height: 1px; background: #bbb; margin: 8px 0 10px; }\n"
    + ".col p { font-size: 0.88rem; line-height: 1.7; color: #333; }\n"
    + ".editor-note { border-top: 2px solid #555; border-bottom: 2px solid #555; margin-top: 20px; padding: 16px 0; display: flex; gap: 24px; align-items: flex-start; }\n"
    + ".editor-note-label { font-family: 'Playfair Display', serif; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #555; white-space: nowrap; padding-top: 2px; }\n"
    + ".editor-note-text { font-size: 0.88rem; line-height: 1.7; color: #333; font-style: italic; }\n"
    + ".footer { border-top: 3px double #555; margin-top: 20px; padding-top: 8px; display: flex; justify-content: space-between; font-size: 0.65rem; color: #888; letter-spacing: 0.06em; }\n"
    + ".archive-banner { background: #1a1a1a; color: #f5f0e8; text-align: center; padding: 6px; font-family: 'Libre Baskerville', serif; font-size: 0.7rem; letter-spacing: 0.1em; }\n";

  var html = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n"
    + "<meta charset=\"UTF-8\" />\n"
    + "<title>The Tyler Paper \u2014 " + formatDate() + "</title>\n"
    + "<link href=\"https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap\" rel=\"stylesheet\"/>\n"
    + "<style>\n" + styles + "</style>\n</head>\n<body>\n"
    + "<div class=\"archive-banner\">The Tyler Paper \u2014 Archived Edition \u2014 " + formatDate() + "</div>\n"
    + "<div class=\"paper\">\n"
    + "<div class=\"masthead\"><h1>" + esc(d.name) + "</h1>"
    + "<div class=\"masthead-bar\"><span>" + esc(d.edition) + "</span>"
    + "<span style=\"font-style:italic\">" + esc(d.tagline) + "</span>"
    + "<span>Est. " + new Date().getFullYear() + "</span></div></div>\n";

  if (top) {
    html += "<div class=\"top-story\"><div class=\"top-story-head\">"
      + "<h2>" + esc(top.headline) + "</h2>"
      + "<div class=\"divider-line\"></div>"
      + "<div class=\"byline\">By " + esc(top.byline) + "</div>"
      + "</div><div class=\"body-text drop-cap\"><p>" + escNl(top.body) + "</p></div></div>\n";
  }

  html += "<div class=\"two-col\">";
  [left, right].forEach(function(story) {
    if (!story) { html += "<div class=\"col\"></div>"; return; }
    html += "<div class=\"col\"><h3>" + esc(story.headline) + "</h3>"
      + "<div class=\"byline\" style=\"margin-bottom:2px\">By " + esc(story.byline) + "</div>"
      + "<div class=\"col-divider\"></div>"
      + "<p>" + escNl(story.body) + "</p></div>";
  });
  html += "</div>\n";

  if (d.editorNote) {
    html += "<div class=\"editor-note\">"
      + "<span class=\"editor-note-label\">From the Editor</span>"
      + "<span class=\"editor-note-text\">" + escNl(d.editorNote) + "</span>"
      + "</div>\n";
  }

  html += "<div class=\"footer\"><span>" + esc(d.name) + " \u00B7 " + formatDate() + "</span>"
    + "<span>For internal use only</span></div>\n"
    + "</div>\n</body>\n</html>";

  var blob = new Blob([html], { type: "text/html" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "BOS-Support-Dispatch-" + fileDate() + ".html";
  a.click();
  URL.revokeObjectURL(a.href);
}

function showMsg(msg) {
  var el = document.getElementById("save-msg");
  if (el) {
    el.textContent = msg;
    setTimeout(function() { var e = document.getElementById("save-msg"); if (e) e.textContent = ""; }, 3000);
  }
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

function updateDraft(key, value) { if (draft) draft[key] = value; }
function updateStory(id, field, value) { if (!draft) return; var s = draft.stories.find(function(s) { return s.id === id; }); if (s) s[field] = value; }
function updateImage(id, field, value) { if (!draft) return; var img = draft.images.find(function(i) { return i.id === id; }); if (img) img[field] = value; }

function handleImageUpload(id, input) {
  var file = input.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) { updateImage(id, "src", e.target.result); render(); };
  reader.readAsDataURL(file);
}

function removeImage(id) { updateImage(id, "src", null); render(); }

function esc(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Like esc but preserves line breaks as <br> tags for display
function escNl(s) {
  return esc(s).replace(/\n/g, "<br>");
}

function renderPhoto(img) {
  var caption = '<input class="edit-field" type="text" value="' + esc(img.caption) + '" oninput="updateImage(\'' + img.id + '\', \'caption\', this.value)" style="margin-top:4px;font-style:italic;font-size:0.72rem;" />';
  if (editMode) {
    if (img.src) {
      return '<div class="photo-wrap"><img src="' + img.src + '" style="width:100%;max-height:220px;object-fit:cover;border:1px solid #ccc;" />'
        + '<button class="remove-photo" onclick="removeImage(\'' + img.id + '\')">&#x2715;</button></div>' + caption;
    }
    return '<label class="photo-upload-zone"><input type="file" accept="image/*" style="display:none" onchange="handleImageUpload(\'' + img.id + '\', this)" />'
      + '<span class="icon">&#128247;</span><span class="photo-upload-label">Click to upload photo</span></label>' + caption;
  }
  if (!img.src) return "";
  return '<img src="' + img.src + '" alt="' + esc(img.caption) + '" style="width:100%;max-height:220px;object-fit:cover;display:block;border:1px solid #ccc;" />'
    + (img.caption ? '<p class="photo-caption">' + esc(img.caption) + "</p>" : "");
}

function render() {
  var d = editMode ? draft : paper;
  var top = d.stories.find(function(s) { return s.column === "top"; });
  var left = d.stories.find(function(s) { return s.column === "left"; });
  var right = d.stories.find(function(s) { return s.column === "right"; });
  var hasPhotos = d.images.some(function(i) { return i.src; });
  var showStrip = editMode || hasPhotos;

  var html = '<div class="toolbar"><span>\u2600 ' + formatDate() + '</span><div class="toolbar-btns">'
    + '<span id="save-msg" class="save-msg"></span>'
    + (editMode
      ? '<button class="archive-btn" onclick="archiveEdition()">\u2193 Archive Edition</button>'
        + '<button id="save-btn" class="save-btn" onclick="savePaper()">Save Edition</button>'
        + '<button class="edit-btn" onclick="exitEdit()">Cancel</button>'
      : '<button class="edit-btn" onclick="enterEdit()">Editor Mode</button>')
    + '</div></div>';

  if (showPin) {
    html += '<div class="modal-overlay"><div class="modal">'
      + '<h3>Editor Access</h3><p>Enter your editor PIN to continue</p>'
      + '<input id="pin-input" class="pin-input" type="password" placeholder="PIN" onkeydown="if(event.key===\'Enter\')checkPin()" />'
      + '<div id="pin-error" class="pin-error">Incorrect PIN. Try again.</div>'
      + '<button class="save-btn" style="width:100%" onclick="checkPin()">Unlock Editor</button>'
      + '<p class="modal-hint">Contact your editor for the PIN</p>'
      + '<button class="cancel-link" onclick="exitEdit()">Cancel</button>'
      + '</div></div>';
  }

  html += '<div class="paper"><div class="masthead">';
  if (editMode) {
    html += '<input class="edit-field" type="text" value="' + esc(d.name) + '" oninput="updateDraft(\'name\', this.value)" style="font-family:UnifrakturMaguntia,cursive;font-size:clamp(2.5rem,8vw,4.5rem);text-align:center;letter-spacing:0.02em;color:#111;" />';
  } else {
    html += '<h1>' + esc(d.name) + '</h1>';
  }
  html += '<div class="masthead-bar">';
  if (editMode) {
    html += '<input class="edit-field" type="text" value="' + esc(d.edition) + '" oninput="updateDraft(\'edition\', this.value)" style="width:160px;font-size:0.7rem;" />';
    html += '<input class="edit-field" type="text" value="' + esc(d.tagline) + '" oninput="updateDraft(\'tagline\', this.value)" style="flex:1;margin:0 12px;font-size:0.7rem;font-style:italic;text-align:center;" />';
  } else {
    html += '<span>' + esc(d.edition) + '</span>';
    html += '<span style="font-style:italic">' + esc(d.tagline) + '</span>';
  }
  html += '<span>Est. ' + new Date().getFullYear() + '</span></div></div>';

  if (top) {
    html += '<div class="top-story"><div class="top-story-head">';
    if (editMode) {
      html += '<input class="edit-field" type="text" value="' + esc(top.headline) + '" oninput="updateStory(' + top.id + ', \'headline\', this.value)" style="font-family:\'Playfair Display\',serif;font-size:clamp(1.6rem,4vw,2.4rem);font-weight:900;text-align:center;color:#111;" />';
    } else {
      html += '<h2>' + esc(top.headline) + '</h2>';
    }
    html += '<div class="divider-line"></div><div class="byline">By ';
    if (editMode) {
      html += '<input class="edit-field" type="text" value="' + esc(top.byline) + '" oninput="updateStory(' + top.id + ', \'byline\', this.value)" style="font-size:0.72rem;display:inline-block;width:auto;min-width:120px;" />';
    } else {
      html += esc(top.byline);
    }
    html += '</div></div>';
    if (editMode) {
      html += '<textarea class="edit-field" oninput="updateStory(' + top.id + ', \'body\', this.value)" rows="4">' + esc(top.body) + '</textarea>';
    } else {
      html += '<div class="body-text drop-cap"><p>' + escNl(top.body) + '</p></div>';
    }
    html += '</div>';
  }

  if (showStrip) {
    html += '<div class="photo-strip">';
    d.images.forEach(function(img) { html += '<div class="photo-item">' + renderPhoto(img) + '</div>'; });
    html += '</div>';
  }

  html += '<div class="two-col">';
  [left, right].forEach(function(story) {
    if (!story) { html += '<div class="col"></div>'; return; }
    html += '<div class="col">';
    if (editMode) {
      html += '<input class="edit-field" type="text" value="' + esc(story.headline) + '" oninput="updateStory(' + story.id + ', \'headline\', this.value)" style="font-family:\'Playfair Display\',serif;font-size:1.25rem;font-weight:700;color:#111;" />';
    } else {
      html += '<h3>' + esc(story.headline) + '</h3>';
    }
    html += '<div class="byline" style="margin-bottom:2px">By ';
    if (editMode) {
      html += '<input class="edit-field" type="text" value="' + esc(story.byline) + '" oninput="updateStory(' + story.id + ', \'byline\', this.value)" style="font-size:0.68rem;display:inline-block;width:auto;min-width:100px;" />';
    } else {
      html += esc(story.byline);
    }
    html += '</div><div class="col-divider"></div>';
    if (editMode) {
      html += '<textarea class="edit-field" oninput="updateStory(' + story.id + ', \'body\', this.value)" rows="5">' + esc(story.body) + '</textarea>';
    } else {
      html += '<p>' + escNl(story.body) + '</p>';
    }
    html += '</div>';
  });
  html += '</div>';

  var note = d.editorNote || "";
  if (editMode || note) {
    html += '<div class="editor-note"><span class="editor-note-label">From the Editor</span>';
    if (editMode) {
      html += '<textarea class="edit-field" style="font-style:italic;" oninput="updateDraft(\'editorNote\', this.value)" rows="3" placeholder="Write a note to your team...">' + esc(note) + '</textarea>';
    } else {
      html += '<span class="editor-note-text">' + escNl(note) + '</span>';
    }
    html += '</div>';
  }

  html += '<div class="footer"><span>' + esc(d.name) + ' \u00B7 ' + formatDate() + '</span><span>For internal use only</span></div></div>';
  document.getElementById("app").innerHTML = html;
}

loadPaper();
