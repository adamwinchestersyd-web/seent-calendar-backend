import { makeLinkBuilder } from "../../domain/linkBuilder";

// TODO: load from env in production
export const links = makeLinkBuilder({ orgId: "640578001", env: "au" });
