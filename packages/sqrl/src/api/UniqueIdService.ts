import { Context } from "./ctx";
import { UniqueId } from "./UniqueId";

export interface UniqueIdService {
  create(ctx: Context): Promise<UniqueId>;
  fetch(ctx: Context, type: string, value: string): Promise<UniqueId>;
}
