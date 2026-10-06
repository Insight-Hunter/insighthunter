// Stub for the planned Daily.co (or equivalent) video provider
// (docs/insight-pbx-master-prompt.md §4.9). TODO(video): not implemented.
// Video is explicitly out of scope until a vendor is selected and the
// feature-flag/entitlement boundary is designed — do not wire this into any
// route until that design work happens.
import type { CreateRoomParams, VideoProvider, VideoRoom } from "../interfaces/VideoProvider.js";

export class DailyVideoProvider implements VideoProvider {
  constructor(private readonly apiKey: string) {}

  async createRoom(_params: CreateRoomParams): Promise<VideoRoom> {
    throw new Error(
      "not_implemented: DailyVideoProvider is a planning stub (see docs/insight-pbx-master-prompt.md §4.9)",
    );
  }
}
