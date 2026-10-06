// Provider-neutral video contract (docs/insight-pbx-master-prompt.md §4.9).
// TODO(video): this module is a planning stub. Video is explicitly deferred
// — "do not make video a hard dependency for core voice/SMS launch" — and no
// routes, services, or entitlement wiring exist yet. Implement once a video
// vendor (e.g. Daily) is selected and a feature flag/entitlement boundary is
// designed; see providers/daily/DailyVideoProvider.ts for the planned
// implementation target.

export interface CreateRoomParams {
  orgId: string;
  displayName?: string;
}

export interface VideoRoom {
  providerRoomId: string;
  joinUrl: string;
}

export interface VideoProvider {
  createRoom(params: CreateRoomParams): Promise<VideoRoom>;
}
