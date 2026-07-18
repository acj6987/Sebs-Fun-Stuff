'use strict';
/* =========================================================================
 * ai.js — CPU opponent brain.
 * The CPU's skill lives in three places, exactly like a human's:
 *   1. which combo it brings (parts.js CPU_BLADERS)
 *   2. how well it launches (power sampling per difficulty)
 *   3. when it fires its special move
 * ========================================================================= */

const AI = (() => {

  class Controller {
    constructor(diff) {
      this.diff = diff;                 // 'easy' | 'normal' | 'hard'
      this.thinkT = 0;
      this.reactDelay = { easy: 1.4, normal: 0.7, hard: 0.25 }[diff];
      this.wantSpecial = false;
    }

    /** Launch meter result for this difficulty. */
    launchPower() {
      switch (this.diff) {
        case 'easy':   return 0.50 + Math.random() * 0.25;
        case 'normal': return 0.68 + Math.random() * 0.24;
        default:       return 0.86 + Math.random() * 0.14;
      }
    }

    /** Delay (s) before the CPU locks its launch meter. */
    launchDelay() { return 0.7 + Math.random() * 1.2; }

    /**
     * Called every frame during battle. Returns true when the CPU wants to
     * fire its special this frame.
     */
    update(dt, self, opp) {
      if (self.dead || opp.dead || self.spGauge < 100) { this.wantSpecial = false; this.thinkT = 0; return false; }

      let want = false;
      const dist = Math.hypot(opp.x - self.x, opp.y - self.y);

      switch (self.stats.type) {
        case 'attack':
        case 'balance':
          // dash when the opponent is exposed mid-bowl and we're not already dashing
          want = self.dashT <= 0 && self.state !== 'rail' &&
                 dist > 110 && Math.hypot(opp.x, opp.y) < Physics.WALL_R * 0.75;
          if (this.diff === 'easy') want = want && Math.random() < 0.4;
          break;
        case 'defense':
          // brace when a fast opponent is incoming
          {
            const dx = self.x - opp.x, dy = self.y - opp.y;
            const closing = (opp.vx * dx + opp.vy * dy) / Math.max(1, dist);
            const threat = opp.dashT > 0 || opp.state === 'rail' || (closing > 220 && dist < 260);
            want = this.diff === 'easy' ? self.spGauge >= 100 && Math.random() < 0.01 : threat;
          }
          break;
        case 'stamina':
          // top up spin once it starts flagging
          want = self.spinFrac < (this.diff === 'hard' ? 0.45 : 0.6);
          break;
      }

      // humanized reaction time: must want it continuously for reactDelay
      if (want) {
        this.thinkT += dt;
        if (this.thinkT >= this.reactDelay) { this.thinkT = 0; return true; }
      } else {
        this.thinkT = 0;
      }
      return false;
    }
  }

  return { Controller };
})();
