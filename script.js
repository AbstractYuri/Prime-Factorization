// ---------- Prime & Factor Helpers ----------
function isPrime(n) {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0) return false;
  const L = Math.floor(Math.sqrt(n));
  for (let i = 3; i <= L; i += 2) if (n % i === 0) return false;
  return true;
}

function smallestDivisor(n) {
  if (n % 2 === 0) return 2;
  const L = Math.floor(Math.sqrt(n));
  for (let i = 3; i <= L; i += 2) if (n % i === 0) return i;
  return n;
}

// Long division steps (correct)
function getDivisionSteps(n) {
  const out = [];
  let x = n;
  while (x > 1) {
    const d = smallestDivisor(x);
    const q = x / d;
    out.push({ divisor: d, dividend: x, quotient: q });
    x = q;
  }
  return out;
}

// ---------- BUILD BALANCED FACTOR TREE (FIXED!) ----------
function buildTree(n) {
  if (n === 1) return { value: 1, leaf: true };
  const d = smallestDivisor(n);

  if (d === n) return { value: n, leaf: true, prime: true };

  // FIX: build balanced tree using prime factor multiset
  const primes = [];
  let x = n;
  while (x > 1) {
    let s = smallestDivisor(x);
    primes.push(s);
    x /= s;
  }

  // build balanced binary tree from list of primes
  function buildBalanced(list) {
    if (list.length === 1) return { value: list[0], leaf: true };

    // multiply halves
    const mid = Math.floor(list.length / 2);
    const Lval = list.slice(0, mid).reduce((a,b)=>a*b,1);
    const Rval = list.slice(mid).reduce((a,b)=>a*b,1);

    return {
      value: Lval * Rval,
      left: buildBalanced(list.slice(0, mid)),
      right: buildBalanced(list.slice(mid)),
      leaf: false
    };
  }

  return buildBalanced(primes);
}

// Extract leaf primes
function getPrimeListFromTree(tree) {
  const out = [];
  (function trav(t){
    if (!t) return;
    if (t.leaf) out.push(t.value);
    else { trav(t.left); trav(t.right); }
  })(tree);
  return out;
}

// Full divisor generation
function getAllDivisorsFromPrimes(primes) {
  const counts = {};
  primes.forEach(p => counts[p] = (counts[p] || 0) + 1);
  const arr = Object.entries(counts).map(([p,e]) => ({p:Number(p),e}));
  const out = [];
  function gen(i,acc){
    if (i===arr.length){ out.push(acc); return; }
    const {p,e} = arr[i];
    let x=1;
    for (let k=0;k<=e;k++){
      gen(i+1, acc*x);
      x*=p;
    }
  }
  gen(0,1);
  return out.sort((a,b)=>a-b);
}

// ---------- UI ----------
const STEP_DELAY = 300;

const input = document.getElementById("num");
const runBtn = document.getElementById("run");
const longStepsEl = document.getElementById("longSteps");
const finalFactorsEl = document.getElementById("finalFactors");
const animateToggle = document.getElementById("animateToggle");
const showDivisors = document.getElementById("showDivisors");
const treeSvg = document.getElementById("treeSvg");
const messageEl = document.getElementById("message");
const generateExampleBtn = document.getElementById("generateExampleBtn");

runBtn.onclick = () => {
  const raw = input.value.trim();
  messageEl.textContent = "";
  longStepsEl.innerHTML = "";
  finalFactorsEl.innerHTML = "";
  clearSvg();

  const n = Number(raw);
  if (!raw || !Number.isInteger(n) || n < 2) {
    messageEl.textContent = "Please enter an integer greater than or equal to 2.";
    return;
  }

  if (n > 10_000_000_000) { // Safety check for very large numbers
    messageEl.textContent = "This number is too large to process quickly. Please enter a smaller number.";
    return;
  }

  if (isPrime(n)) {
    finalFactorsEl.innerHTML = "Prime Number";
    return;
  }

  const steps = getDivisionSteps(n);
  const tree = buildTree(n);
  const primes = getPrimeListFromTree(tree);

  renderLongSteps(steps);
  renderTree(tree);

  finalFactorsEl.innerHTML = `<strong>Prime factors:</strong> ${primes.join(" × ")}`;

  if (showDivisors.checked) {
    const d = getAllDivisorsFromPrimes(primes);
    finalFactorsEl.innerHTML += `<br><strong>All divisors:</strong> ${d.join(", ")}`;
  }
};

const exampleNumbers = [
  33957,
  120,
  720,
  1764,
  999,
  12345,
  8192,
  59049,
];

generateExampleBtn.onclick = () => {
  input.value = exampleNumbers[Math.floor(Math.random() * exampleNumbers.length)];
  runBtn.click();
};

// ---------- LONG DIVISION ----------
function renderLongSteps(steps) {
  longStepsEl.innerHTML = "";
  const anim = animateToggle.checked;

  steps.forEach((s, i) => {
    const el = document.createElement("div");
    el.className = "step";
    el.innerHTML = `
      <div class="divisor">${s.divisor}</div>
      <div>
        <div><span class="quot">${s.dividend}</span></div>
        <div class="rest">→ quotient = <strong>${s.quotient}</strong></div>
      </div>
    `;
    longStepsEl.appendChild(el);

    if (!anim) { el.classList.add("show"); return; }

    setTimeout(()=> el.classList.add("show"), i * STEP_DELAY);
  });
}

// ---------- SVG TREE (FIXED CENTERED LAYOUT) ----------
function clearSvg(){
  while(treeSvg.firstChild) treeSvg.removeChild(treeSvg.firstChild);
}

function measureTree(n){
  if (!n) return {w:0,h:0};
  if (n.leaf) {
    n.w = 1;
    n.h = 1;
    return n;
  }
  const L = measureTree(n.left);
  const R = measureTree(n.right);
  n.w = L.w + R.w;
  n.h = 1 + Math.max(L.h, R.h);
  return n;
}

function assignPos(n, x0, w){
  n.x = x0 + w/2;
  if (n.leaf) return;
  const Lw = n.left.w;
  const Rw = n.right.w;
  assignPos(n.left, x0, Lw);
  assignPos(n.right, x0 + Lw, Rw);
}

function renderTree(root){
  measureTree(root);
  assignPos(root, 0, root.w);

  const PX = 50;
  const PY = 60;

  function renderNode(n, depth, idx){
    const cx = n.x * PX;
    const cy = depth * PY;

    if (!n.leaf){
      drawLine(cx, cy, n.left.x * PX, (depth+1)*PY);
      drawLine(cx, cy, n.right.x * PX, (depth+1)*PY);
    }
    drawNode(n, cx, cy, idx);
    if (!n.leaf){
      renderNode(n.left, depth+1, idx+1);
      renderNode(n.right, depth+1, idx+2);
    }
  }

  renderNode(root,0,0);
  treeSvg.setAttribute("viewBox", `0 0 ${root.w * PX} ${root.h * PY}`);
}

function drawLine(x1,y1,x2,y2){
  const L=document.createElementNS("http://www.w3.org/2000/svg","line");
  L.setAttribute("x1",x1);
  L.setAttribute("y1",y1+18);
  L.setAttribute("x2",x2);
  L.setAttribute("y2",y2-18);
  L.setAttribute("stroke","#7dd3fc");
  L.setAttribute("stroke-width","1.4");
  treeSvg.appendChild(L);
}

function drawNode(n,cx,cy,idx){
  const g=document.createElementNS("http://www.w3.org/2000/svg","g");
  g.setAttribute("transform",`translate(${cx},${cy})`);
  g.style.opacity=0;

  const r=18;
  const c=document.createElementNS("http://www.w3.org/2000/svg","circle");
  c.setAttribute("r",r);
  c.setAttribute("fill", n.leaf ? "#10b981" : "#3b82f6");
  g.appendChild(c);

  const t=document.createElementNS("http://www.w3.org/2000/svg","text");
  t.textContent=n.value;
  t.setAttribute("y",5);
  t.setAttribute("text-anchor","middle");
  t.setAttribute("fill","#e6f7f6");
  t.setAttribute("font-size","13");
  g.appendChild(t);

  treeSvg.appendChild(g);

  if (!animateToggle.checked){ g.style.opacity=1; return; }

  setTimeout(()=>{
    g.style.transition="0.35s";
    g.style.opacity=1;
  }, idx*STEP_DELAY);
}
