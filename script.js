// Size the corner art so the top sword's tip ends at the left edge of the word "Welcome!".
// It always measures "Welcome!" (not the page's own title), so the art is the same size on every page.
// (the sword tip sits 445px across the 461px-wide image).
function sizeCorners() {
  var main = document.querySelector('main');
  var h1 = document.querySelector('main h1');
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
  var gap = 16;
  var w = Math.max(100, (left - gap) * 461 / 445);
  document.documentElement.style.setProperty('--corner-w', w + 'px');
}
sizeCorners();
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
window.addEventListener('resize', sizeCorners);
window.addEventListener('load', sizeCorners);
