import { redirect } from "next/navigation";

// Le site n'a plus de comptes publics : l'ancienne page de connexion mène à l'administration.
export default function ConnectionPage() {
  redirect("/admin");
}
