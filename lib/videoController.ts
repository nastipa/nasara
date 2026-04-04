class VideoController {
  private players: Record<string, () => void> = {};
  private muteFns: Record<string, () => void> = {};

  // ✅ NOW accepts 3 arguments
  register(
    id: string,
    stopFn: () => void,
    muteFn: () => void
  ) {
    this.players[id] = stopFn;
    this.muteFns[id] = muteFn;
  }

  unregister(id: string) {
    delete this.players[id];
    delete this.muteFns[id];
  }

  setActive(activeId: string) {
    Object.keys(this.players).forEach((id) => {
      if (id !== activeId) {
        this.players[id]?.(); // stop video
        this.muteFns[id]?.(); // 🔥 mute audio
      }
    });
  }

  stopAll() {
    Object.values(this.players).forEach(fn => fn());
    Object.values(this.muteFns).forEach(fn => fn());
  }

  mute(id: string) {
    this.muteFns[id]?.();
  }
}

export const videoController = new VideoController();