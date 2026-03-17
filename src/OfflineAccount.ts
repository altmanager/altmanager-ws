export class OfflineAccount {
  public readonly uuid: string;
  public readonly username: string;
  public readonly skinUrl: string;
  public readonly cacheId: string;

  public constructor(
    uuid: string,
    username: string,
    skinUrl: string,
    cacheId: string,
  ) {
    this.uuid = uuid;
    this.username = username;
    this.skinUrl = skinUrl;
    this.cacheId = cacheId;
  }
}
