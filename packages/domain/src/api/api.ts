import { HttpApi } from "effect/unstable/httpapi";

import * as AccountAvatarContract from "./account-avatar-contract.js";
import * as AdminAdminsContract from "./admin-admins-contract.js";
import * as AdminSessionContract from "./admin-session-contract.js";
import * as AdminStoresContract from "./admin-stores-contract.js";
import * as StoresContract from "./stores-contract.js";
import * as SystemContract from "./system-contract.js";

export class Api extends HttpApi.make("Api")
  .add(SystemContract.Group)
  .add(StoresContract.Group)
  .add(AdminStoresContract.Group)
  .add(AdminSessionContract.Group)
  .add(AdminAdminsContract.Group)
  .add(AccountAvatarContract.Group) {}
