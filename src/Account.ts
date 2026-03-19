import type { Session } from "@altmanager/lib";
import { Player } from "@altmanager/lib";
import { OfflineAccount } from "./OfflineAccount.ts";

export class Account extends OfflineAccount {
  public readonly player: Player;

  public constructor(
    uuid: string,
    username: string,
    skinUrl: string,
    refreshToken: string,
    session: Session,
    lastServer: string | null,
  ) {
    super(uuid, username, skinUrl, refreshToken, lastServer);
    this.player = new Player(session);
  }

  public async connect(address: string): Promise<void> {
    try {
      await this.player.connect(address);
      this._lastServer = address;
    } catch (e) {
      console.error(e);
    }
  }

  public async disconnect(): Promise<void> {
    await this.player.disconnect();
    this._lastServer = null;
  }

  public override toJSON(): Record<string, unknown> {
    const data = super.toJSON();

    data.status = this.player.status;

    return data;
  }
}
