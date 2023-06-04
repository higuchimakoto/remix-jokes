import type { ActionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { logout } from "~/utils/session.server";

export const action = ({ request }: ActionArgs) => logout(request);

export const loader = async () => redirect("/login");
