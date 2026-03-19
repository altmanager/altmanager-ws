import { PlayerStatus } from "@altmanager/lib";

export class OfflineAccount {
  public readonly uuid: string;
  public readonly username: string;
  public readonly skinUrl: string;
  public readonly refreshToken: string;
  protected _lastServer: string | null;

  public constructor(
    uuid: string,
    username: string,
    skinUrl: string,
    refreshToken: string,
    lastServer: string | null,
  ) {
    this.uuid = uuid;
    this.username = username;
    this.skinUrl = skinUrl;
    this.refreshToken = refreshToken;
    this._lastServer = lastServer;
  }

  public get lastServer(): string | null {
    return this._lastServer;
  }

  public toJSON(): Record<string, unknown> {
    return {
      uuid: this.uuid,
      username: this.username,
      skinUrl: this.skinUrl,
      status: PlayerStatus.DISCONNECTED,
      lastServer: this.lastServer,
    };
  }
}
