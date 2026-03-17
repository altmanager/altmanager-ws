import type { Session } from "@altmanager/lib";
import { Player } from "@altmanager/lib";
import { OfflineAccount } from "./OfflineAccount.ts";

export class Account extends OfflineAccount {
  public readonly player: Player;

  public constructor(
    uuid: string,
    username: string,
    skinUrl: string,
    cacheId: string,
    session: Session,
  ) {
    super(uuid, username, skinUrl, cacheId);
    this.player = new Player(session);
  }
}
