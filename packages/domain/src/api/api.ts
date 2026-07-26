import { HttpApi } from "effect/unstable/httpapi";

import * as StoresContract from "./stores-contract.js";
import * as SystemContract from "./system-contract.js";

export class Api extends HttpApi.make("Api")
  .add(SystemContract.Group)
  .add(StoresContract.Group) {}
