const root = document.getElementById("pet");
const stateLabel = document.getElementById("state-label");
const petAvatar = document.getElementById("pet-avatar");

const labels = {
  IDLE: "Idle",
  WORKING: "Working",
  DONE: "Done"
};

const classes = {
  IDLE: "state-idle",
  WORKING: "state-working",
  DONE: "state-done"
};

const behaviors = [
  { className: "behavior-hop", duration: 700, weight: 3 },
  { className: "behavior-look-left", duration: 1000, weight: 1 },
  { className: "behavior-look-right", duration: 1000, weight: 1 },
  { className: "behavior-wiggle", duration: 1100, weight: 3 },
  { className: "behavior-stretch", duration: 950, weight: 2 },
  { className: "behavior-squish", duration: 900, weight: 2 },
  { className: "behavior-float", duration: 1200, weight: 2 }
];

let currentState = "IDLE";
let behaviorTimer = null;
let clearBehaviorTimer = null;
let lastBehaviorClass = "";

function stopBehaviorLoop() {
  if (behaviorTimer) {
    clearTimeout(behaviorTimer);
    behaviorTimer = null;
  }
  if (clearBehaviorTimer) {
    clearTimeout(clearBehaviorTimer);
    clearBehaviorTimer = null;
  }
  petAvatar.className = "pet-avatar behavior-none";
}

function pickBehavior() {
  const pool = behaviors.filter((entry) => entry.className !== lastBehaviorClass);
  const weightedPool = pool.flatMap((entry) => Array(entry.weight || 1).fill(entry));
  const selected = weightedPool[Math.floor(Math.random() * weightedPool.length)];
  lastBehaviorClass = selected.className;
  return selected;
}

function scheduleRandomBehavior() {
  if (currentState !== "IDLE") return;

  const delayMs = 1600 + Math.floor(Math.random() * 2400);
  behaviorTimer = setTimeout(() => {
    if (currentState !== "IDLE") return;
    const selected = pickBehavior();
    petAvatar.className = `pet-avatar ${selected.className}`;
    clearBehaviorTimer = setTimeout(() => {
      petAvatar.className = "pet-avatar behavior-none";
      scheduleRandomBehavior();
    }, selected.duration);
  }, delayMs);
}

function applyState(state) {
  currentState = state;
  root.classList.remove("state-idle", "state-working", "state-done");
  root.classList.add(classes[state] || classes.IDLE);
  stateLabel.textContent = labels[state] || labels.IDLE;

  if (currentState === "IDLE") {
    stopBehaviorLoop();
    scheduleRandomBehavior();
  } else {
    stopBehaviorLoop();
  }
}

window.pet?.onStateChange(({ state }) => {
  applyState(state);
});

applyState("IDLE");
