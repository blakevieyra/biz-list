import { redirect } from "next/navigation";

/** Work groups were merged into Collaborations (proposals, contracts, B2B sales). */
export default function GroupsPage() {
  redirect("/partnerships");
}
