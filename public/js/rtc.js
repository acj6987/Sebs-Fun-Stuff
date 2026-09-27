/**
 * Group calls, mesh style: every person opens a direct connection to every
 * other person on the call. That is plenty for a handful of friends and needs
 * no media server.
 *
 * Negotiation follows the "perfect negotiation" pattern, and the peer with the
 * larger id is the polite one, so two people dialling at once never deadlock.
 */
export class CallManager {
  constructor({ send, iceServers, onChange, onToast }) {
    this.send = send;
    this.iceServers = iceServers;
    this.onChange = onChange || (() => {});
    this.onToast = onToast || (() => {});

    this.myId = null;
    this.inCall = false;
    this.localStream = null;
    this.micOn = true;
    this.camOn = false;
    /** @type {Map<string, {pc: RTCPeerConnection, videoSender: RTCRtpSender, stream: MediaStream, polite: boolean, makingOffer: boolean, ignoreOffer: boolean}>} */
    this.peers = new Map();
    this.speaking = new Set();
    this._levelTimer = null;
    this._analysers = new Map();
  }

  setMyId(id) {
    this.myId = id;
  }

  /* ---------------- local media ---------------- */

  async ensureLocalStream() {
    if (this.localStream) return this.localStream;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    });
    this.localStream = stream;
    this.watchLevels(this.myId, stream);
    return stream;
  }

  async join() {
    await this.ensureLocalStream();
    this.inCall = true;
    this.micOn = true;
    this.setMicEnabled(true);
    this.send({ t: 'call-join' });
    this.reportMedia();
    this.onChange();
  }

  leave() {
    this.inCall = false;
    for (const id of [...this.peers.keys()]) this.removePeer(id);
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) track.stop();
      this.localStream = null;
    }
    this.camOn = false;
    this.micOn = true;
    this.speaking.clear();
    this._analysers.clear();
    if (this._levelTimer) {
      clearInterval(this._levelTimer);
      this._levelTimer = null;
    }
    this.send({ t: 'call-leave' });
    this.onChange();
  }

  setMicEnabled(on) {
    this.micOn = on;
    for (const track of this.localStream ? this.localStream.getAudioTracks() : []) {
      track.enabled = on;
    }
    this.reportMedia();
    this.onChange();
  }

  async setCamEnabled(on) {
    if (!this.inCall) return;
    if (on) {
      try {
        const cam = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });
        const track = cam.getVideoTracks()[0];
        if (!track) return;
        // Dropping the camera should never kill the call, so keep audio separate.
        const previous = this.localStream.getVideoTracks()[0];
        if (previous) {
          this.localStream.removeTrack(previous);
          previous.stop();
        }
        this.localStream.addTrack(track);
        track.addEventListener('ended', () => this.setCamEnabled(false));
        this.camOn = true;
      } catch (err) {
        this.onToast(cameraError(err));
        this.camOn = false;
      }
    } else {
      for (const track of this.localStream ? this.localStream.getVideoTracks() : []) {
        this.localStream.removeTrack(track);
        track.stop();
      }
      this.camOn = false;
    }

    const videoTrack = this.localStream ? this.localStream.getVideoTracks()[0] || null : null;
    for (const peer of this.peers.values()) {
      try {
        await peer.videoSender.replaceTrack(videoTrack);
      } catch (err) {
        console.warn('could not swap the camera track', err);
      }
    }
    this.reportMedia();
    this.onChange();
  }

  reportMedia() {
    this.send({ t: 'media', mic: this.micOn, cam: this.camOn });
  }

  /* ---------------- peers ---------------- */

  /** Called for people already on the call when we arrive (we dial them). */
  dial(ids) {
    for (const id of ids) this.getPeer(id, { dial: true });
  }

  getPeer(id, { dial = false } = {}) {
    if (this.peers.has(id)) return this.peers.get(id);
    if (!this.localStream) return null;

    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const peer = {
      pc,
      stream: new MediaStream(),
      polite: String(this.myId) < String(id),
      makingOffer: false,
      ignoreOffer: false,
      videoSender: null,
    };
    this.peers.set(id, peer);

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) pc.addTrack(audioTrack, this.localStream);
    // A permanent video slot means turning the camera on/off is just a track
    // swap — no renegotiation, no flicker.
    const videoTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' });
    peer.videoSender = videoTransceiver.sender;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) peer.videoSender.replaceTrack(videoTrack).catch(() => {});

    pc.addEventListener('negotiationneeded', async () => {
      try {
        peer.makingOffer = true;
        await pc.setLocalDescription();
        this.send({ t: 'signal', to: id, data: { description: pc.localDescription } });
      } catch (err) {
        console.warn('offer failed', err);
      } finally {
        peer.makingOffer = false;
      }
    });

    pc.addEventListener('icecandidate', ({ candidate }) => {
      if (candidate) this.send({ t: 'signal', to: id, data: { candidate } });
    });

    pc.addEventListener('track', ({ track }) => {
      peer.stream.addTrack(track);
      if (track.kind === 'audio') this.watchLevels(id, peer.stream);
      track.addEventListener('ended', () => {
        try {
          peer.stream.removeTrack(track);
        } catch {
          /* already gone */
        }
        this.onChange();
      });
      this.onChange();
    });

    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'failed') {
        try {
          pc.restartIce();
        } catch {
          /* older browsers: nothing else to try */
        }
      }
      this.onChange();
    });

    if (dial) {
      // Adding tracks above already fires negotiationneeded, which sends the offer.
    }
    this.onChange();
    return peer;
  }

  async handleSignal(from, data) {
    if (!this.inCall) return;
    const peer = this.getPeer(from);
    if (!peer) return;
    const { pc } = peer;

    try {
      if (data.description) {
        const offerCollision =
          data.description.type === 'offer' && (peer.makingOffer || pc.signalingState !== 'stable');
        peer.ignoreOffer = !peer.polite && offerCollision;
        if (peer.ignoreOffer) return;

        await pc.setRemoteDescription(data.description);
        if (data.description.type === 'offer') {
          await pc.setLocalDescription();
          this.send({ t: 'signal', to: from, data: { description: pc.localDescription } });
        }
      } else if (data.candidate) {
        try {
          await pc.addIceCandidate(data.candidate);
        } catch (err) {
          if (!peer.ignoreOffer) throw err;
        }
      }
    } catch (err) {
      console.warn('signalling hiccup', err);
    }
  }

  removePeer(id) {
    const peer = this.peers.get(id);
    if (!peer) return;
    try {
      peer.pc.close();
    } catch {
      /* already closed */
    }
    this.peers.delete(id);
    this._analysers.delete(id);
    this.speaking.delete(id);
    this.onChange();
  }

  /* ---------------- who is talking ---------------- */

  watchLevels(id, stream) {
    if (!id || this._analysers.has(id)) return;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this._audio = this._audio || new Ctor();
      const source = this._audio.createMediaStreamSource(stream);
      const analyser = this._audio.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      this._analysers.set(id, { analyser, data: new Uint8Array(analyser.fftSize) });
      if (!this._levelTimer) {
        this._levelTimer = setInterval(() => this.sampleLevels(), 220);
      }
    } catch (err) {
      console.debug('speaking detection unavailable', err);
    }
  }

  sampleLevels() {
    let changed = false;
    for (const [id, { analyser, data }] of this._analysers) {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const loud = Math.sqrt(sum / data.length) > 0.045;
      const muted = id === this.myId && !this.micOn;
      const isSpeaking = loud && !muted;
      if (isSpeaking !== this.speaking.has(id)) {
        if (isSpeaking) this.speaking.add(id);
        else this.speaking.delete(id);
        changed = true;
      }
    }
    if (changed) this.onChange();
  }
}

function cameraError(err) {
  if (err && err.name === 'NotAllowedError') return 'Camera blocked — allow it in your browser to show video.';
  if (err && err.name === 'NotFoundError') return "Couldn't find a camera on this device.";
  return 'Camera unavailable right now.';
}

export function micError(err) {
  if (err && err.name === 'NotAllowedError') {
    return 'Microphone blocked. Allow it in your browser, then hit Join the call again.';
  }
  if (err && err.name === 'NotFoundError') return "No microphone found, so the call can't start.";
  return "Couldn't start the call on this device.";
}
