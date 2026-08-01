const root = document.getElementById("pet");
const stateLabel = document.getElementById("state-label");

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

function applyState(state) {
  root.classList.remove("state-idle", "state-working", "state-done");
  root.classList.add(classes[state] || classes.IDLE);
  stateLabel.textContent = labels[state] || labels.IDLE;
}

window.pet?.onStateChange(({ state }) => {
  applyState(state);
});
