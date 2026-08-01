const { EventEmitter } = require("node:events");

const PetState = Object.freeze({
  IDLE: "IDLE",
  WORKING: "WORKING",
  DONE: "DONE"
});

class PetStateMachine extends EventEmitter {
  constructor({ doneDurationMs = 3000 } = {}) {
    super();
    this.state = PetState.IDLE;
    this.doneDurationMs = doneDurationMs;
    this.doneTimer = null;
  }

  setState(nextState, reason = "") {
    if (!Object.values(PetState).includes(nextState)) {
      return;
    }
    if (this.state === nextState) {
      return;
    }
    this.state = nextState;
    this.emit("state-change", { state: this.state, reason, at: Date.now() });

    if (this.doneTimer) {
      clearTimeout(this.doneTimer);
      this.doneTimer = null;
    }

    if (nextState === PetState.DONE) {
      this.doneTimer = setTimeout(() => {
        this.setState(PetState.IDLE, "done-timeout");
      }, this.doneDurationMs);
    }
  }
}

module.exports = {
  PetState,
  PetStateMachine
};
