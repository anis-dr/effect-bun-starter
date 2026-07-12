import { HttpApi } from "effect/unstable/httpapi";

import * as StoresContract from "./stores-contract.js";
import * as SystemContract from "./system-contract.js";

export class DomainApi extends HttpApi.make("DomainApi")
  .add(SystemContract.Group)
  .add(StoresContract.Group) {}
