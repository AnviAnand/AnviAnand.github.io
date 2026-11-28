// Corner art layout.
// 1. Base size: the top art ends at the left edge of the word "Welcome!" (measured the same way on every page,
//    so the art is the same size everywhere). The sword-tip image's tip sits 445px across a 461px-wide image.
// 2. Then check the real artwork pixels against every line of text: shrink the top art if it would touch the
//    title block, push the page content down if it would touch the sections below, and add space at the
//    bottom so the bottom art never touches the last paragraphs.
var GAP = 14;      // minimum clear space (px) between the art and any text
var MASK_W = 160;  // resolution of the alpha mask used for hit-testing
var masks = {};

function getMask(img) {
  var src = img.currentSrc || img.src;
  if (masks[src]) return masks[src];
  var w = MASK_W, h = Math.round(MASK_W * img.naturalHeight / img.naturalWidth);
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  var ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  var a = new Uint8Array(w * h).fill(1); // fallback (e.g. opened from a file): treat the whole box as art
  try {
    var d = ctx.getImageData(0, 0, w, h).data;
    for (var i = 0; i < w * h; i++) a[i] = d[i * 4 + 3] > 25 ? 1 : 0;
  } catch (e) {}
  return (masks[src] = { w: w, h: h, a: a });
}

// Does the art (its visible pixels) come within GAP of this rectangle?
function touches(img, flipped, r) {
  var m = getMask(img), rc = img.getBoundingClientRect(), s = rc.width / m.w;
  var l = r.left - GAP, t = r.top - GAP, rr = r.right + GAP, b = r.bottom + GAP;
  var x0, x1, y0, y1;
  if (flipped) { x0 = (rc.right - rr) / s; x1 = (rc.right - l) / s; y0 = (rc.bottom - b) / s; y1 = (rc.bottom - t) / s; }
  else { x0 = (l - rc.left) / s; x1 = (rr - rc.left) / s; y0 = (t - rc.top) / s; y1 = (b - rc.top) / s; }
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(m.w - 1, Math.ceil(x1)); y1 = Math.min(m.h - 1, Math.ceil(y1));
  for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) if (m.a[y * m.w + x]) return true;
  return false;
}

// Rectangles of every line of text (and the cover picture) inside a container
function textRects(root) {
  var out = [], tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
  while ((n = tw.nextNode())) {
    if (!n.textContent.trim()) continue;
    var rg = document.createRange();
    rg.selectNodeContents(n);
    var list = rg.getClientRects();
    for (var i = 0; i < list.length; i++) if (list[i].width > 0) out.push(list[i]);
  }
  root.querySelectorAll('img.cover').forEach(function (c) { out.push(c.getBoundingClientRect()); });
  return out;
}

function anyTouch(img, flipped, rects) {
  for (var i = 0; i < rects.length; i++) if (touches(img, flipped, rects[i])) return true;
  return false;
}

function layoutCorners() {
  var main = document.querySelector('main');
  var tl = document.querySelector('.corner.tl'), br = document.querySelector('.corner.br');
  var root = document.documentElement;
  if (!main) return;

  // Reset anything added by an earlier pass
  var firstAbout = document.querySelector('.about');
  if (firstAbout) firstAbout.style.marginTop = '';
  document.body.style.paddingBottom = '';

  // 1. Base size from the word "Welcome!"
  var h1 = main.querySelector('h1');
  var tmp = null;
  if (!h1) { tmp = h1 = document.createElement('h1'); main.appendChild(tmp); } // page with no title text
  var probe = document.createElement('span');
  probe.textContent = 'Welcome!';
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:' + getComputedStyle(h1).font;
  document.body.appendChild(probe);
  var wordWidth = probe.getBoundingClientRect().width;
  document.body.removeChild(probe);
  if (tmp) main.removeChild(tmp);
  var mr = main.getBoundingClientRect();
  var left = mr.left + mr.width / 2 - wordWidth / 2 + window.scrollX;
  var w = Math.max(100, (left - 16) * 461 / 445);
  root.style.setProperty('--corner-w', w + 'px');

  if (!tl || !br || !tl.complete || !tl.naturalWidth) return;

  // 2. Shrink the top art until it clears the title block
  var heroRects = textRects(main);
  var tries = 0;
  while (anyTouch(tl, false, heroRects) && w > 40 && tries++ < 80) {
    w *= 0.97;
    root.style.setProperty('--corner-w', w + 'px');
  }

  // 3. Push the sections below down until the top art clears them
  if (firstAbout) {
    var push = 0;
    tries = 0;
    while (anyTouch(tl, false, collect('.about')) && tries++ < 120) {
      push += 8;
      firstAbout.style.marginTop = push + 'px';
    }
  }

  // 4. Add room at the bottom until the bottom art clears all text
  var padB = 0;
  tries = 0;
  while (anyTouch(br, true, collect('main, .about')) && tries++ < 150) {
    padB += 8;
    document.body.style.paddingBottom = padB + 'px';
  }
}

function collect(sel) {
  var out = [];
  document.querySelectorAll(sel).forEach(function (s) { out = out.concat(textRects(s)); });
  return out;
}

function whenReady() {
  var imgs = document.querySelectorAll('.corner'), pending = 0;
  imgs.forEach(function (im) {
    if (!im.complete) { pending++; im.addEventListener('load', function () { if (!--pending) layoutCorners(); }); }
  });
  if (!pending) layoutCorners();
}
whenReady();

// Tap/click support for the My Writing dropdown (hover also works on desktop)
var dd = document.querySelector('.dropdown');
var btn = dd.querySelector('.drop-btn');
btn.addEventListener('click', function () {
  var open = dd.classList.toggle('open');
  btn.setAttribute('aria-expanded', open);
});
document.addEventListener('click', function (e) {
  if (!dd.contains(e.target)) { dd.classList.remove('open'); btn.setAttribute('aria-expanded', false); }
});
window.addEventListener('resize', layoutCorners);
window.addEventListener('load', layoutCorners);
