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
  { className: "behavior-hop", duration: 700 },
  { className: "behavior-look-left", duration: 1000 },
  { className: "behavior-look-right", duration: 1000 },
  { className: "behavior-wiggle", duration: 1100 },
  { className: "behavior-stretch", duration: 900 }
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
  const selected = pool[Math.floor(Math.random() * pool.length)];
  lastBehaviorClass = selected.className;
  return selected;
}

function scheduleRandomBehavior() {
  if (currentState !== "IDLE") return;

  const delayMs = 2200 + Math.floor(Math.random() * 3000);
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
